const PARTICIPANT_FORBIDDEN_KEYS = [
  "grossPoolKk",
  "grossPoolMilli",
  "platformRemainderKk",
  "platformRemainderMilli",
  "chargedEntries",
  "acceptedResponseCount",
  "minResponsesRequired",
  "minUniqueResponders",
  "currentPrizeKk",
  "prizeMilli",
  "settlementLedgerId",
  "settlementStatus",
  "disqualifyReason",
  "invalidReason",
  "playersPresent",
  "totalKkCollectedKk",
  "responsesRemaining",
  "uniqueParticipantCount",
  "roundValidity",
] as const;

export function projectParticipantArenaLive(input: {
  arena: {
    slug: string;
    name: string;
    kind: string;
    enabled: boolean;
    paused: boolean;
  };
  round: { number: number; state: string; secondsRemaining: number | null } | null;
  question: Record<string, string> | null;
  challenge: { text: string } | null;
  winnerAnnouncement: { username: string; prizeKk: string; streak: number } | null;
  lastRound:
    | { outcome: "winner"; username: string; prizeKk: string }
    | { outcome: "no_winner" }
    | { outcome: "ended" }
    | null;
}) {
  return {
    arena: {
      slug: input.arena.slug,
      name: input.arena.name,
      kind: input.arena.kind,
      enabled: input.arena.enabled,
      paused: input.arena.paused,
    },
    round: input.round
      ? {
          number: input.round.number,
          state: input.round.state,
          secondsRemaining: input.round.secondsRemaining,
        }
      : null,
    question: input.question,
    challenge: input.challenge,
    winnerAnnouncement: input.winnerAnnouncement,
    lastRound: input.lastRound,
  };
}

export function participantPayloadExposesEconomics(value: unknown): boolean {
  const serialized = JSON.stringify(value);
  return PARTICIPANT_FORBIDDEN_KEYS.some((key) => serialized.includes(`"${key}"`));
}

export function gateArenaEconomics<T extends Record<string, unknown>>(
  row: T,
  includeEconomics: boolean,
): T {
  if (includeEconomics) return row;
  if (!("economics" in row)) return row;
  const rest = { ...row };
  delete rest.economics;
  return rest;
}

/** Participant submissions cannot carry prize, pool, or entry-count fields. */
export function readArenaSubmission(body: {
  payload?: unknown;
  clientRequestId?: unknown;
  prizeMilli?: unknown;
  prizeKk?: unknown;
  poolMilli?: unknown;
  chargedEntries?: unknown;
  payoutMilli?: unknown;
}): { payload: string | null; clientRequestId?: string } {
  return {
    payload: typeof body.payload === "string" ? body.payload : null,
    clientRequestId: typeof body.clientRequestId === "string" ? body.clientRequestId : undefined,
  };
}
