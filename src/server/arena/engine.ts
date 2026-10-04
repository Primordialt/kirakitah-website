import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
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
import {
  creditArenaPrize,
  debitArenaEntry,
  getOrCreateWallet,
} from "@/server/wallet/service";
import { milliToKkDisplay } from "@/server/wallet/money";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";

const PRESENCE_TTL_MS = 45_000;
const COUNTDOWN_MS = 5_000;

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

async function createNextRound(arena: typeof arenas.$inferSelect) {
  const db = getDb();
  const [last] = await db
    .select({ roundNumber: arenaRounds.roundNumber })
    .from(arenaRounds)
    .where(eq(arenaRounds.arenaId, arena.id))
    .orderBy(desc(arenaRounds.roundNumber))
    .limit(1);
  const roundNumber = (last?.roundNumber ?? 0) + 1;

  let quickfireQuestionId: string | null = null;
  let typerushChallengeId: string | null = null;

  if (arena.kind === "quickfire") {
    const [q] = await db
      .select({ id: arenaQuickfireQuestions.id })
      .from(arenaQuickfireQuestions)
      .where(eq(arenaQuickfireQuestions.active, true))
      .orderBy(sql`random()`)
      .limit(1);
    if (!q) throw new ArenaError("No active Quickfire questions.", "CONFIGURATION_UNAVAILABLE", 503);
    quickfireQuestionId = q.id;
  } else {
    const [c] = await db
      .select({ id: arenaTyperushChallenges.id })
      .from(arenaTyperushChallenges)
      .where(eq(arenaTyperushChallenges.active, true))
      .orderBy(sql`random()`)
      .limit(1);
    if (!c) throw new ArenaError("No active TypeRush challenges.", "CONFIGURATION_UNAVAILABLE", 503);
    typerushChallengeId = c.id;
  }

  const [round] = await db
    .insert(arenaRounds)
    .values({
      arenaId: arena.id,
      roundNumber,
      state: "waiting_for_players",
      quickfireQuestionId,
      typerushChallengeId,
    })
    .returning();
  return round!;
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
    if (players >= arena.minUniqueResponders) {
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

async function resolveRound(arena: typeof arenas.$inferSelect, roundId: string) {
  const db = getDb();
  const nowIso = new Date().toISOString();

  const [round] = await db.select().from(arenaRounds).where(eq(arenaRounds.id, roundId)).limit(1);
  if (!round || round.state !== "resolving") return;

  const [uniqueRow] = await db
    .select({ value: sql<number>`count(distinct ${arenaResponses.participantAccountId})` })
    .from(arenaResponses)
    .where(eq(arenaResponses.roundId, roundId));
  const uniqueCount = Number(uniqueRow?.value ?? 0);

  if (uniqueCount < arena.minUniqueResponders) {
    await db
      .update(arenaRounds)
      .set({
        state: "disqualified",
        uniqueResponderCount: uniqueCount,
        disqualifyReason: "Fewer than 10 unique participants submitted responses.",
        resolvedAt: nowIso,
        updatedAt: nowIso,
      })
      .where(eq(arenaRounds.id, roundId));
    await logActivity({
      arenaId: arena.id,
      roundId,
      kind: "disqualified",
      message: `Round #${round.roundNumber} disqualified — only ${uniqueCount} unique responders.`,
    });
    await scheduleIntermission(roundId, nowIso);
    return;
  }

  const [winningResponse] = await db
    .select()
    .from(arenaResponses)
    .where(and(eq(arenaResponses.roundId, roundId), eq(arenaResponses.isCorrect, true)))
    .orderBy(arenaResponses.receivedAt, arenaResponses.sequence)
    .limit(1);

  if (!winningResponse) {
    await db
      .update(arenaRounds)
      .set({
        state: "no_winner",
        uniqueResponderCount: uniqueCount,
        resolvedAt: nowIso,
        updatedAt: nowIso,
      })
      .where(eq(arenaRounds.id, roundId));
    await logActivity({
      arenaId: arena.id,
      roundId,
      kind: "no_winner",
      message: `Round #${round.roundNumber} ended with no correct answer.`,
    });
    await scheduleIntermission(roundId, nowIso);
    return;
  }

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
        uniqueResponderCount: uniqueCount,
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
      minUniqueResponders: arena.minUniqueResponders,
    },
    playersPresent: players,
    round: round
      ? {
          id: round.id,
          number: round.roundNumber,
          state: round.state,
          secondsRemaining,
          disqualifyReason: round.disqualifyReason,
          uniqueResponderCount: round.uniqueResponderCount,
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
        minPlayers: arena.minUniqueResponders,
        playersPresent: players,
        roundState: round?.state ?? null,
        roundNumber: round?.roundNumber ?? null,
      };
    }),
  );
  return enriched;
}
