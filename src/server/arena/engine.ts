import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  ne,
  sql,
} from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  arenaActivity,
  arenaPresence,
  arenaQuickfireQuestions,
  arenaResponses,
  arenaRounds,
  arenaTyperushChallenges,
  arenaWinners,
  arenas,
  participantAccounts,
} from "@/server/db/schema";
import { gradeQuickfire, gradeTyperush } from "@/server/arena/validation";
import { ArenaError } from "@/server/arena/errors";
import { assertArenaSubmissionRateLimit } from "@/server/arena/rate-limit";
import {
  determineRoundOutcome,
  formatDisqualifyMessage,
} from "@/server/arena/round-resolution";
import {
  selectArenaChallenge,
  summarizeChallengeUsage,
} from "@/server/arena/challenge-selection";
import {
  creditArenaPrize,
  debitArenaEntry,
  getOrCreateWallet,
} from "@/server/wallet/service";
import { milliToKkDisplay } from "@/server/wallet/money";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";

const PRESENCE_TTL_MS = 45_000;
const COUNTDOWN_MS = 5_000;

/** DB column `min_unique_responders` stores minimum accepted/charged responses per round. */
export function minResponsesRequired(arena: typeof arenas.$inferSelect): number {
  return arena.minUniqueResponders;
}

export async function getArenaBySlug(slug: string) {
  const db = getDb();
  const [row] = await db.select().from(arenas).where(eq(arenas.slug, slug)).limit(1);
  if (!row) throw new ArenaError("Arena not found.", "NOT_FOUND", 404);
  return row;
}

export async function countActivePresence(arenaId: string): Promise<number> {
  const db = getDb();
  const cutoff = new Date(Date.now() - PRESENCE_TTL_MS).toISOString();
  const [row] = await db
    .select({ value: count() })
    .from(arenaPresence)
    .where(and(eq(arenaPresence.arenaId, arenaId), gt(arenaPresence.lastSeenAt, cutoff)));
  return Number(row?.value ?? 0);
}

export async function touchPresence(arenaId: string, participantAccountId: string) {
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .insert(arenaPresence)
    .values({ arenaId, participantAccountId, lastSeenAt: now })
    .onConflictDoUpdate({
      target: [arenaPresence.arenaId, arenaPresence.participantAccountId],
      set: { lastSeenAt: now },
    });
}

async function getCurrentRound(arenaId: string) {
  const db = getDb();
  const [round] = await db
    .select()
    .from(arenaRounds)
    .where(
      and(
        eq(arenaRounds.arenaId, arenaId),
        inArray(arenaRounds.state, [
          "waiting_for_players",
          "countdown",
          "active",
          "resolving",
          "intermission",
        ]),
      ),
    )
    .orderBy(desc(arenaRounds.roundNumber))
    .limit(1);
  return round ?? null;
}

function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if ("code" in current && (current as { code?: string }).code === "23505") return true;
    current = "cause" in current ? (current as { cause?: unknown }).cause : undefined;
  }
  return false;
}

async function loadChallengePool(arena: typeof arenas.$inferSelect) {
  const db = getDb();
  if (arena.kind === "quickfire") {
    const [pool, history] = await Promise.all([
      db
        .select({ id: arenaQuickfireQuestions.id })
        .from(arenaQuickfireQuestions)
        .where(eq(arenaQuickfireQuestions.active, true)),
      db
        .select({
          challengeId: arenaRounds.quickfireQuestionId,
          roundNumber: arenaRounds.roundNumber,
        })
        .from(arenaRounds)
        .where(eq(arenaRounds.arenaId, arena.id))
        .orderBy(desc(arenaRounds.roundNumber))
        .limit(300),
    ]);
    return {
      poolIds: pool.map((row) => row.id),
      history: history.flatMap((row) =>
        row.challengeId ? [{ challengeId: row.challengeId, roundNumber: row.roundNumber }] : [],
      ),
    };
  }

  const [pool, history] = await Promise.all([
    db
      .select({ id: arenaTyperushChallenges.id })
      .from(arenaTyperushChallenges)
      .where(eq(arenaTyperushChallenges.active, true)),
    db
      .select({
        challengeId: arenaRounds.typerushChallengeId,
        roundNumber: arenaRounds.roundNumber,
      })
      .from(arenaRounds)
      .where(eq(arenaRounds.arenaId, arena.id))
      .orderBy(desc(arenaRounds.roundNumber))
      .limit(300),
  ]);
  return {
    poolIds: pool.map((row) => row.id),
    history: history.flatMap((row) =>
      row.challengeId ? [{ challengeId: row.challengeId, roundNumber: row.roundNumber }] : [],
    ),
  };
}

async function createNextRound(arena: typeof arenas.$inferSelect) {
  const db = getDb();
  const { poolIds, history } = await loadChallengePool(arena);
  if (poolIds.length === 0) {
    throw new ArenaError(
      arena.kind === "quickfire"
        ? "No active Quickfire questions."
        : "No active TypeRush challenges.",
      "CONFIGURATION_UNAVAILABLE",
      503,
    );
  }

  const selection = selectArenaChallenge({ poolIds, history });
  const [last] = await db
    .select({ roundNumber: arenaRounds.roundNumber })
    .from(arenaRounds)
    .where(eq(arenaRounds.arenaId, arena.id))
    .orderBy(desc(arenaRounds.roundNumber))
    .limit(1);
  const roundNumber = (last?.roundNumber ?? 0) + 1;

  try {
    const [round] = await db
      .insert(arenaRounds)
      .values({
        arenaId: arena.id,
        roundNumber,
        state: "waiting_for_players",
        quickfireQuestionId: arena.kind === "quickfire" ? selection.challengeId : null,
        typerushChallengeId: arena.kind === "typerush" ? selection.challengeId : null,
      })
      .returning();

    if (selection.poolLow || selection.repeatedImmediately) {
      console.warn(
        JSON.stringify({
          event: "arena_challenge_pool",
          arenaSlug: arena.slug,
          kind: arena.kind,
          activeCount: poolIds.length,
          poolLow: selection.poolLow,
          repeatedImmediately: selection.repeatedImmediately,
          roundNumber,
        }),
      );
    }

    return round!;
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const [existing] = await db
      .select()
      .from(arenaRounds)
      .where(and(eq(arenaRounds.arenaId, arena.id), eq(arenaRounds.roundNumber, roundNumber)))
      .limit(1);
    if (existing) return existing;
    throw error;
  }
}

async function logActivity(input: {
  arenaId: string;
  roundId?: string;
  kind: typeof arenaActivity.$inferInsert.kind;
  message: string;
  participantAccountId?: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getDb();
  await db.insert(arenaActivity).values({
    arenaId: input.arenaId,
    roundId: input.roundId ?? null,
    kind: input.kind,
    message: input.message,
    participantAccountId: input.participantAccountId ?? null,
    metadata: input.metadata ?? null,
  });
}

export async function tickArena(arenaSlug: string) {
  const arena = await getArenaBySlug(arenaSlug);
  if (!arena.enabled || arena.paused) return;

  const db = getDb();
  let round = await getCurrentRound(arena.id);
  if (!round) {
    round = await createNextRound(arena);
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const players = await countActivePresence(arena.id);

  if (round.state === "waiting_for_players") {
    if (players >= 1) {
      await db
        .update(arenaRounds)
        .set({ state: "countdown", startsAt: nowIso, updatedAt: nowIso })
        .where(eq(arenaRounds.id, round.id));
      await logActivity({
        arenaId: arena.id,
        roundId: round.id,
        kind: "round_started",
        message: `Round #${round.roundNumber} countdown started.`,
      });
    }
    return;
  }

  if (round.state === "countdown") {
    const startMs = round.startsAt ? Date.parse(round.startsAt) : now;
    if (now - startMs >= COUNTDOWN_MS) {
      const endsAt = new Date(now + arena.roundDurationSeconds * 1000).toISOString();
      await db
        .update(arenaRounds)
        .set({ state: "active", endsAt, updatedAt: nowIso })
        .where(eq(arenaRounds.id, round.id));
      await logActivity({
        arenaId: arena.id,
        roundId: round.id,
        kind: "round_started",
        message: `Round #${round.roundNumber} is live.`,
      });
    }
    return;
  }

  if (round.state === "active") {
    if (round.endsAt && Date.parse(round.endsAt) <= now) {
      await db
        .update(arenaRounds)
        .set({ state: "resolving", updatedAt: nowIso })
        .where(and(eq(arenaRounds.id, round.id), eq(arenaRounds.state, "active")));
      await resolveRound(arena, round.id);
    }
    return;
  }

  if (round.state === "intermission") {
    const resolvedAt = round.resolvedAt ? Date.parse(round.resolvedAt) : now;
    if (now - resolvedAt >= arena.intermissionSeconds * 1000) {
      await createNextRound(arena);
    }
  }
}

async function countRoundResponseStats(roundId: string) {
  const db = getDb();
  const [totalRow] = await db
    .select({ value: count() })
    .from(arenaResponses)
    .where(eq(arenaResponses.roundId, roundId));
  const [uniqueRow] = await db
    .select({ value: sql<number>`count(distinct ${arenaResponses.participantAccountId})` })
    .from(arenaResponses)
    .where(eq(arenaResponses.roundId, roundId));
  return {
    acceptedResponseCount: Number(totalRow?.value ?? 0),
    uniqueParticipantCount: Number(uniqueRow?.value ?? 0),
  };
}

async function resolveRound(arena: typeof arenas.$inferSelect, roundId: string) {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const minRequired = minResponsesRequired(arena);

  const [round] = await db.select().from(arenaRounds).where(eq(arenaRounds.id, roundId)).limit(1);
  if (!round || round.state !== "resolving") return;

  const { acceptedResponseCount, uniqueParticipantCount } =
    await countRoundResponseStats(roundId);

  const [winningResponse] = await db
    .select()
    .from(arenaResponses)
    .where(and(eq(arenaResponses.roundId, roundId), eq(arenaResponses.isCorrect, true)))
    .orderBy(arenaResponses.receivedAt, arenaResponses.sequence)
    .limit(1);

  const outcome = determineRoundOutcome({
    acceptedResponseCount,
    minResponsesRequired: minRequired,
    hasCorrectResponse: Boolean(winningResponse),
  });

  if (outcome.kind === "disqualified") {
    await db
      .update(arenaRounds)
      .set({
        state: "disqualified",
        uniqueResponderCount: uniqueParticipantCount,
        acceptedResponseCount,
        disqualifyReason: formatDisqualifyMessage(acceptedResponseCount, minRequired),
        resolvedAt: nowIso,
        updatedAt: nowIso,
      })
      .where(eq(arenaRounds.id, roundId));
    await logActivity({
      arenaId: arena.id,
      roundId,
      kind: "disqualified",
      message: `Round #${round.roundNumber} disqualified — only ${acceptedResponseCount} responses (need ${minRequired}).`,
      metadata: { acceptedResponseCount, uniqueParticipantCount },
    });
    await scheduleIntermission(roundId, nowIso);
    return;
  }

  if (outcome.kind === "no_winner") {
    await db
      .update(arenaRounds)
      .set({
        state: "no_winner",
        uniqueResponderCount: uniqueParticipantCount,
        acceptedResponseCount,
        resolvedAt: nowIso,
        updatedAt: nowIso,
      })
      .where(eq(arenaRounds.id, roundId));
    await logActivity({
      arenaId: arena.id,
      roundId,
      kind: "no_winner",
      message: `Round #${round.roundNumber} ended with no correct answer.`,
      metadata: { acceptedResponseCount, uniqueParticipantCount },
    });
    await scheduleIntermission(roundId, nowIso);
    return;
  }

  if (!winningResponse) return;

  await db.transaction(async (tx) => {
    const prizeLedgerId = await creditArenaPrize({
      tx: tx as unknown as ReturnType<typeof getDb>,
      participantAccountId: winningResponse.participantAccountId,
      amountMilli: arena.prizeMilli,
      idempotencyKey: `arena-prize:${roundId}`,
      roundId,
      description: `${arena.name} Round #${round.roundNumber} win`,
    });

    const streak = await computeWinStreak(
      tx as unknown as ReturnType<typeof getDb>,
      arena.id,
      winningResponse.participantAccountId,
    );

    const [claimed] = await tx
      .insert(arenaWinners)
      .values({
        roundId,
        participantAccountId: winningResponse.participantAccountId,
        responseId: winningResponse.id,
        prizeMilli: arena.prizeMilli,
        prizeLedgerEntryId: prizeLedgerId,
        winStreak: streak,
      })
      .onConflictDoNothing()
      .returning({ id: arenaWinners.id });

    if (!claimed) return;

    await tx
      .update(arenaRounds)
      .set({
        state: "completed",
        winnerAccountId: winningResponse.participantAccountId,
        winnerResponseId: winningResponse.id,
        uniqueResponderCount: uniqueParticipantCount,
        acceptedResponseCount,
        resolvedAt: nowIso,
        updatedAt: nowIso,
      })
      .where(and(eq(arenaRounds.id, roundId), eq(arenaRounds.state, "resolving")));

    const [account] = await tx
      .select({ username: participantAccounts.username })
      .from(participantAccounts)
      .where(eq(participantAccounts.id, winningResponse.participantAccountId))
      .limit(1);

    await tx.insert(arenaActivity).values({
      arenaId: arena.id,
      roundId,
      kind: "winner",
      message: `@${account?.username ?? "player"} won Round #${round.roundNumber} (+${milliToKkDisplay(arena.prizeMilli)} KK)`,
      participantAccountId: winningResponse.participantAccountId,
      metadata: { streak, prizeMilli: arena.prizeMilli },
    });
  });

  await db
    .update(arenaRounds)
    .set({ state: "intermission", resolvedAt: nowIso, updatedAt: nowIso })
    .where(eq(arenaRounds.id, roundId));

  await recordAdminAuditEvent({
    eventType: "ARENA_ROUND_RESOLVED",
    actorId: "system",
    actorRole: "SUPER_ADMIN",
    metadata: {
      arenaSlug: arena.slug,
      roundId,
      roundNumber: String(round.roundNumber),
    },
  });
}

async function scheduleIntermission(roundId: string, nowIso: string) {
  const db = getDb();
  await db
    .update(arenaRounds)
    .set({ state: "intermission", resolvedAt: nowIso, updatedAt: nowIso })
    .where(and(eq(arenaRounds.id, roundId), ne(arenaRounds.state, "completed")));
}

async function computeWinStreak(
  tx: ReturnType<typeof getDb>,
  arenaId: string,
  accountId: string,
): Promise<number> {
  const recent = await tx
    .select({ roundNumber: arenaRounds.roundNumber })
    .from(arenaWinners)
    .innerJoin(arenaRounds, eq(arenaWinners.roundId, arenaRounds.id))
    .where(
      and(eq(arenaRounds.arenaId, arenaId), eq(arenaWinners.participantAccountId, accountId)),
    )
    .orderBy(desc(arenaRounds.roundNumber))
    .limit(10);

  let streak = 1;
  for (let i = 1; i < recent.length; i += 1) {
    if (recent[i - 1]!.roundNumber - recent[i]!.roundNumber === 1) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

export async function submitArenaResponse(input: {
  arenaSlug: string;
  participantAccountId: string;
  payload: string;
  clientRequestId?: string;
}) {
  const arena = await getArenaBySlug(input.arenaSlug);
  if (!arena.enabled) throw new ArenaError("Arena is offline.", "ARENA_DISABLED", 503);
  if (arena.paused) throw new ArenaError("Arena is paused.", "ARENA_PAUSED", 503);

  assertArenaSubmissionRateLimit(input.participantAccountId);

  await tickArena(input.arenaSlug);

  const db = getDb();
  const round = await getCurrentRound(arena.id);
  if (!round || round.state !== "active") {
    throw new ArenaError("No active round accepting responses.", "ROUND_NOT_ACTIVE", 409);
  }

  const now = Date.now();
  if (round.endsAt && Date.parse(round.endsAt) <= now) {
    throw new ArenaError("Round has ended.", "ROUND_EXPIRED", 409);
  }

  const trimmed = input.payload.trim();
  if (!trimmed || trimmed.length > 2000) {
    throw new ArenaError("Invalid response.", "VALIDATION_ERROR", 400);
  }

  let isCorrect = false;
  if (arena.kind === "quickfire") {
    const [q] = await db
      .select()
      .from(arenaQuickfireQuestions)
      .where(eq(arenaQuickfireQuestions.id, round.quickfireQuestionId!))
      .limit(1);
    if (!q) throw new ArenaError("Question unavailable.", "CONFIGURATION_UNAVAILABLE", 503);
    isCorrect = gradeQuickfire(trimmed, q.correctOption);
  } else {
    const [c] = await db
      .select()
      .from(arenaTyperushChallenges)
      .where(eq(arenaTyperushChallenges.id, round.typerushChallengeId!))
      .limit(1);
    if (!c) throw new ArenaError("Challenge unavailable.", "CONFIGURATION_UNAVAILABLE", 503);
    isCorrect = gradeTyperush(trimmed, c.normalizedText);
  }

  const idempotencyKey =
    input.clientRequestId ??
    `${round.id}:${input.participantAccountId}:${Date.now()}:${Math.random()}`;

  await getOrCreateWallet(input.participantAccountId);

  const result = await db.transaction(async (tx) => {
    const [countRow] = await tx
      .select({ value: count() })
      .from(arenaResponses)
      .where(
        and(
          eq(arenaResponses.roundId, round.id),
          eq(arenaResponses.participantAccountId, input.participantAccountId),
        ),
      );
    const sequence = Number(countRow?.value ?? 0) + 1;

    const { ledgerId, balanceAfterMilli } = await debitArenaEntry({
      tx: tx as unknown as ReturnType<typeof getDb>,
      participantAccountId: input.participantAccountId,
      amountMilli: arena.entryFeeMilli,
      idempotencyKey: `arena-entry:${idempotencyKey}`,
      roundId: round.id,
      description: `${arena.name} entry (Round #${round.roundNumber})`,
    });

    const [response] = await tx
      .insert(arenaResponses)
      .values({
        roundId: round.id,
        participantAccountId: input.participantAccountId,
        sequence,
        payload: trimmed,
        isCorrect,
        ledgerEntryId: ledgerId,
      })
      .returning();

    await tx
      .update(arenaRounds)
      .set({
        acceptedResponseCount: sql`${arenaRounds.acceptedResponseCount} + 1`,
        totalKkCollectedMilli: sql`${arenaRounds.totalKkCollectedMilli} + ${arena.entryFeeMilli}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(arenaRounds.id, round.id));

    if (isCorrect) {
      await tx
        .update(arenaRounds)
        .set({ candidateWinnerResponseId: response!.id })
        .where(
          and(eq(arenaRounds.id, round.id), isNull(arenaRounds.candidateWinnerResponseId)),
        );
    }

    return { response: response!, balanceAfterMilli, isCorrect };
  });

  return {
    accepted: true,
    isCorrect: result.isCorrect,
    chargedMilli: arena.entryFeeMilli,
    balanceAfterKk: milliToKkDisplay(result.balanceAfterMilli),
    responseId: result.response.id,
  };
}

export async function getArenaLiveState(arenaSlug: string, participantAccountId?: string) {
  await tickArena(arenaSlug);
  const arena = await getArenaBySlug(arenaSlug);
  const db = getDb();
  const round = await getCurrentRound(arena.id);
  const players = await countActivePresence(arena.id);

  let question: Record<string, string> | null = null;
  let challenge: { text: string } | null = null;
  let winnerView: Record<string, string | number> | null = null;

  if (round?.state === "active" || round?.state === "countdown") {
    if (arena.kind === "quickfire" && round.quickfireQuestionId) {
      const [q] = await db
        .select({
          question: arenaQuickfireQuestions.question,
          optionA: arenaQuickfireQuestions.optionA,
          optionB: arenaQuickfireQuestions.optionB,
          optionC: arenaQuickfireQuestions.optionC,
          optionD: arenaQuickfireQuestions.optionD,
        })
        .from(arenaQuickfireQuestions)
        .where(eq(arenaQuickfireQuestions.id, round.quickfireQuestionId))
        .limit(1);
      if (q) question = q;
    }
    if (arena.kind === "typerush" && round.typerushChallengeId) {
      const [c] = await db
        .select({ text: arenaTyperushChallenges.challengeText })
        .from(arenaTyperushChallenges)
        .where(eq(arenaTyperushChallenges.id, round.typerushChallengeId))
        .limit(1);
      if (c) challenge = c;
    }
  }

  if (
    round &&
    (round.winnerAccountId ||
      ["disqualified", "no_winner", "intermission"].includes(round.state))
  ) {
    if (round.winnerAccountId) {
      const [account] = await db
        .select({ username: participantAccounts.username })
        .from(participantAccounts)
        .where(eq(participantAccounts.id, round.winnerAccountId))
        .limit(1);
      const [winner] = await db
        .select({ winStreak: arenaWinners.winStreak, prizeMilli: arenaWinners.prizeMilli })
        .from(arenaWinners)
        .where(eq(arenaWinners.roundId, round.id))
        .limit(1);
      winnerView = {
        username: account?.username ?? "player",
        prizeKk: milliToKkDisplay(winner?.prizeMilli ?? arena.prizeMilli),
        streak: winner?.winStreak ?? 1,
      };
    }
  }

  const activity = await db
    .select({
      message: arenaActivity.message,
      createdAt: arenaActivity.createdAt,
      kind: arenaActivity.kind,
    })
    .from(arenaActivity)
    .where(eq(arenaActivity.arenaId, arena.id))
    .orderBy(desc(arenaActivity.createdAt))
    .limit(20);

  if (participantAccountId) {
    await touchPresence(arena.id, participantAccountId);
  }

  const minRequired = minResponsesRequired(arena);
  let responseStats = { acceptedResponseCount: 0, uniqueParticipantCount: 0 };
  let candidateWinnerUsername: string | null = null;

  if (round) {
    responseStats = await countRoundResponseStats(round.id);
    if (round.candidateWinnerResponseId) {
      const [candidate] = await db
        .select({ username: participantAccounts.username })
        .from(arenaResponses)
        .innerJoin(
          participantAccounts,
          eq(arenaResponses.participantAccountId, participantAccounts.id),
        )
        .where(eq(arenaResponses.id, round.candidateWinnerResponseId))
        .limit(1);
      candidateWinnerUsername = candidate?.username ?? null;
    }
  }

  const secondsRemaining =
    round?.endsAt && round.state === "active"
      ? Math.max(0, Math.ceil((Date.parse(round.endsAt) - Date.now()) / 1000))
      : null;

  return {
    arena: {
      slug: arena.slug,
      name: arena.name,
      kind: arena.kind,
      description: arena.description,
      enabled: arena.enabled,
      paused: arena.paused,
      entryFeeKk: milliToKkDisplay(arena.entryFeeMilli),
      prizeKk: milliToKkDisplay(arena.prizeMilli),
      minResponsesRequired: minRequired,
    },
    playersPresent: players,
    round: round
      ? {
          id: round.id,
          number: round.roundNumber,
          state: round.state,
          secondsRemaining,
          disqualifyReason: round.disqualifyReason,
          acceptedResponseCount: responseStats.acceptedResponseCount,
          responsesRemaining: Math.max(0, minRequired - responseStats.acceptedResponseCount),
          uniqueParticipantCount: responseStats.uniqueParticipantCount,
          candidateWinnerUsername,
          totalKkCollectedKk: milliToKkDisplay(round.totalKkCollectedMilli ?? 0),
          roundValidity:
            responseStats.acceptedResponseCount >= minRequired
              ? "minimum_responses_met"
              : "waiting_for_minimum_responses",
        }
      : null,
    question,
    challenge,
    winnerAnnouncement: winnerView,
    activity: activity.reverse(),
  };
}

export async function listArenasDirectory() {
  const db = getDb();
  const rows = await db.select().from(arenas).orderBy(arenas.slug);
  const enriched = await Promise.all(
    rows.map(async (arena) => {
      const players = await countActivePresence(arena.id);
      const round = await getCurrentRound(arena.id);
      return {
        slug: arena.slug,
        name: arena.name,
        kind: arena.kind,
        description: arena.description,
        enabled: arena.enabled,
        paused: arena.paused,
        entryFeeKk: milliToKkDisplay(arena.entryFeeMilli),
        prizeKk: milliToKkDisplay(arena.prizeMilli),
        minResponsesRequired: minResponsesRequired(arena),
        playersPresent: players,
        roundState: round?.state ?? null,
        roundNumber: round?.roundNumber ?? null,
      };
    }),
  );
  return enriched;
}

async function loadAdminContentPool(arena: typeof arenas.$inferSelect) {
  const db = getDb();
  if (arena.kind === "quickfire") {
    const [pool, history] = await Promise.all([
      db
        .select({
          id: arenaQuickfireQuestions.id,
          label: arenaQuickfireQuestions.question,
          active: arenaQuickfireQuestions.active,
        })
        .from(arenaQuickfireQuestions),
      db
        .select({
          challengeId: arenaRounds.quickfireQuestionId,
          roundNumber: arenaRounds.roundNumber,
        })
        .from(arenaRounds)
        .where(eq(arenaRounds.arenaId, arena.id)),
    ]);
    return summarizeChallengeUsage({
      kind: "quickfire",
      pool,
      history: history.flatMap((row) =>
        row.challengeId ? [{ challengeId: row.challengeId, roundNumber: row.roundNumber }] : [],
      ),
    });
  }

  const [pool, history] = await Promise.all([
    db
      .select({
        id: arenaTyperushChallenges.id,
        label: arenaTyperushChallenges.challengeText,
        active: arenaTyperushChallenges.active,
      })
      .from(arenaTyperushChallenges),
    db
      .select({
        challengeId: arenaRounds.typerushChallengeId,
        roundNumber: arenaRounds.roundNumber,
      })
      .from(arenaRounds)
      .where(eq(arenaRounds.arenaId, arena.id)),
  ]);
  return summarizeChallengeUsage({
    kind: "typerush",
    pool,
    history: history.flatMap((row) =>
      row.challengeId ? [{ challengeId: row.challengeId, roundNumber: row.roundNumber }] : [],
    ),
  });
}

export async function getAdminArenaOperationalData(slug: string) {
  const arena = await getArenaBySlug(slug);
  const db = getDb();
  const round = await getCurrentRound(arena.id);
  const minRequired = minResponsesRequired(arena);
  const players = await countActivePresence(arena.id);

  let liveRound: Record<string, unknown> | null = null;
  if (round) {
    const stats = await countRoundResponseStats(round.id);
    let candidateWinnerUsername: string | null = null;
    if (round.candidateWinnerResponseId) {
      const [candidate] = await db
        .select({ username: participantAccounts.username })
        .from(arenaResponses)
        .innerJoin(
          participantAccounts,
          eq(arenaResponses.participantAccountId, participantAccounts.id),
        )
        .where(eq(arenaResponses.id, round.candidateWinnerResponseId))
        .limit(1);
      candidateWinnerUsername = candidate?.username ?? null;
    }
    const secondsRemaining =
      round.endsAt && round.state === "active"
        ? Math.max(0, Math.ceil((Date.parse(round.endsAt) - Date.now()) / 1000))
        : null;

    liveRound = {
      roundNumber: round.roundNumber,
      state: round.state,
      secondsRemaining,
      acceptedResponseCount: stats.acceptedResponseCount,
      responsesRemaining: Math.max(0, minRequired - stats.acceptedResponseCount),
      uniqueParticipantCount: stats.uniqueParticipantCount,
      candidateWinnerUsername,
      totalKkCollectedKk: milliToKkDisplay(round.totalKkCollectedMilli ?? 0),
      prizeAwardedKk:
        round.state === "completed" ? milliToKkDisplay(arena.prizeMilli) : "0",
      roundValidity:
        stats.acceptedResponseCount >= minRequired
          ? "minimum_responses_met"
          : "waiting_for_minimum_responses",
      disqualifyReason: round.disqualifyReason,
    };
  }

  const historyRows = await db
    .select({
      roundNumber: arenaRounds.roundNumber,
      state: arenaRounds.state,
      acceptedResponseCount: arenaRounds.acceptedResponseCount,
      uniqueResponderCount: arenaRounds.uniqueResponderCount,
      totalKkCollectedMilli: arenaRounds.totalKkCollectedMilli,
      winnerAccountId: arenaRounds.winnerAccountId,
      disqualifyReason: arenaRounds.disqualifyReason,
      startsAt: arenaRounds.startsAt,
      resolvedAt: arenaRounds.resolvedAt,
    })
    .from(arenaRounds)
    .where(eq(arenaRounds.arenaId, arena.id))
    .orderBy(desc(arenaRounds.roundNumber))
    .limit(25);

  const history = await Promise.all(
    historyRows.map(async (row) => {
      let winnerUsername: string | null = null;
      if (row.winnerAccountId) {
        const [account] = await db
          .select({ username: participantAccounts.username })
          .from(participantAccounts)
          .where(eq(participantAccounts.id, row.winnerAccountId))
          .limit(1);
        winnerUsername = account?.username ?? null;
      }
      return {
        ...row,
        totalKkCollectedKk: milliToKkDisplay(row.totalKkCollectedMilli ?? 0),
        kkAwardedKk: row.state === "completed" ? milliToKkDisplay(arena.prizeMilli) : "0",
        winnerUsername,
      };
    }),
  );

  return {
    slug: arena.slug,
    name: arena.name,
    enabled: arena.enabled,
    paused: arena.paused,
    entryFeeKk: milliToKkDisplay(arena.entryFeeMilli),
    prizeKk: milliToKkDisplay(arena.prizeMilli),
    minResponsesRequired: minRequired,
    playersPresent: players,
    liveRound,
    roundHistory: history,
    contentPool: await loadAdminContentPool(arena),
  };
}

export async function listAdminArenaDashboard() {
  const db = getDb();
  const rows = await db.select({ slug: arenas.slug }).from(arenas).orderBy(arenas.slug);
  return Promise.all(rows.map((row) => getAdminArenaOperationalData(row.slug)));
}
