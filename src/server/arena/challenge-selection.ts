/** Prefer a fresh challenge. Reuse only after the rest of the pool has been used. */
export const ARENA_POOL_LOW_THRESHOLD = 8;

export type ChallengeUse = {
  challengeId: string;
  roundNumber: number;
};

export type ChallengeSelection = {
  challengeId: string;
  poolLow: boolean;
  repeatedImmediately: boolean;
};

function pickId(ids: string[], random: () => number): string {
  const index = Math.min(ids.length - 1, Math.floor(random() * ids.length));
  return ids[index]!;
}

export function selectArenaChallenge(input: {
  poolIds: string[];
  history: ChallengeUse[];
  random?: () => number;
}): ChallengeSelection {
  const poolIds = [...new Set(input.poolIds)];
  if (poolIds.length === 0) {
    throw new Error("Arena challenge pool is empty.");
  }

  const random = input.random ?? Math.random;
  const lastRoundById = new Map<string, number>();
  for (const row of input.history) {
    const previous = lastRoundById.get(row.challengeId);
    if (previous === undefined || row.roundNumber > previous) {
      lastRoundById.set(row.challengeId, row.roundNumber);
    }
  }

  const previousId =
    input.history.length === 0
      ? null
      : input.history.reduce((latest, row) =>
          row.roundNumber >= latest.roundNumber ? row : latest,
        ).challengeId;

  const withoutImmediateRepeat =
    poolIds.length > 1 && previousId
      ? poolIds.filter((id) => id !== previousId)
      : poolIds;
  const candidates = withoutImmediateRepeat.length > 0 ? withoutImmediateRepeat : poolIds;

  const unused = candidates.filter((id) => !lastRoundById.has(id));
  let challengeId: string;
  if (unused.length > 0) {
    challengeId = pickId(unused, random);
  } else {
    const oldestRound = Math.min(
      ...candidates.map((id) => lastRoundById.get(id) ?? Number.MAX_SAFE_INTEGER),
    );
    const oldest = candidates.filter((id) => (lastRoundById.get(id) ?? -1) === oldestRound);
    challengeId = pickId(oldest.length > 0 ? oldest : candidates, random);
  }

  return {
    challengeId,
    poolLow: poolIds.length < ARENA_POOL_LOW_THRESHOLD,
    repeatedImmediately: challengeId === previousId,
  };
}

export function summarizeChallengeUsage(input: {
  pool: Array<{ id: string; label: string; active: boolean }>;
  history: ChallengeUse[];
  kind: "quickfire" | "typerush";
}) {
  const usageCount = new Map<string, number>();
  const lastRound = new Map<string, number>();
  for (const row of input.history) {
    usageCount.set(row.challengeId, (usageCount.get(row.challengeId) ?? 0) + 1);
    const previous = lastRound.get(row.challengeId);
    if (previous === undefined || row.roundNumber > previous) {
      lastRound.set(row.challengeId, row.roundNumber);
    }
  }

  const active = input.pool.filter((item) => item.active);
  const recentlyUsed = [...input.pool]
    .filter((item) => lastRound.has(item.id))
    .sort((a, b) => (lastRound.get(b.id) ?? 0) - (lastRound.get(a.id) ?? 0))
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      label: item.label,
      lastRoundNumber: lastRound.get(item.id) ?? null,
      usageCount: usageCount.get(item.id) ?? 0,
    }));

  const poolLow = active.length < ARENA_POOL_LOW_THRESHOLD;
  const warning = poolLow
    ? input.kind === "quickfire"
      ? "Quickfire question pool is running low. Add more questions to maintain variety."
      : "TypeRush challenge pool is running low."
    : null;

  return {
    totalCount: input.pool.length,
    activeCount: active.length,
    recentlyUsed,
    poolLow,
    warning,
  };
}
