export type RoundResolveInput = {
  acceptedResponseCount: number;
  minResponsesRequired: number;
  hasCorrectResponse: boolean;
};

export type RoundResolveOutcome =
  | { kind: "disqualified"; reason: string; acceptedResponseCount: number }
  | { kind: "no_winner"; acceptedResponseCount: number; uniqueParticipantCount: number }
  | { kind: "winner"; acceptedResponseCount: number; uniqueParticipantCount: number };

export function determineRoundOutcome(input: RoundResolveInput): RoundResolveOutcome {
  if (input.acceptedResponseCount < input.minResponsesRequired) {
    return {
      kind: "disqualified",
      acceptedResponseCount: input.acceptedResponseCount,
      reason: `Only ${input.acceptedResponseCount} responses were submitted. ${input.minResponsesRequired} responses are required to validate a round.`,
    };
  }
  if (!input.hasCorrectResponse) {
    return {
      kind: "no_winner",
      acceptedResponseCount: input.acceptedResponseCount,
      uniqueParticipantCount: 0,
    };
  }
  return {
    kind: "winner",
    acceptedResponseCount: input.acceptedResponseCount,
    uniqueParticipantCount: 0,
  };
}

export type RankedResponse = {
  isCorrect: boolean;
  receivedAt: string;
  sequence: number;
};

/** First correct response by arrival time, then sequence. One winner only. */
export function selectFirstCorrectResponse<T extends RankedResponse>(
  rows: readonly T[],
): T | null {
  const correct = rows.filter((row) => row.isCorrect);
  correct.sort((left, right) => {
    if (left.receivedAt < right.receivedAt) return -1;
    if (left.receivedAt > right.receivedAt) return 1;
    return left.sequence - right.sequence;
  });
  return correct[0] ?? null;
}

export function formatDisqualifyMessage(
  acceptedResponseCount: number,
  minResponsesRequired: number,
): string {
  return `At least ${minResponsesRequired} responses were required this round. Only ${acceptedResponseCount} responses were submitted. ${minResponsesRequired} responses are required to validate a round. No winner was awarded.`;
}
