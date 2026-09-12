/** Pure slot-resolution helpers for admin match projections (unit-testable). */

export type CompetitorSlotType = "participant" | "host" | "match_winner";

export type AdminMatchSlotKind =
  | "participant"
  | "host"
  | "match_winner"
  | "awaiting";

export type AdminMatchSlotProjection = {
  kind: AdminMatchSlotKind;
  participantId: string | null;
  publicCode: string | null;
  gamerTag: string | null;
  username: string | null;
  verified: boolean;
  podNumber: number | null;
  positionNumber: number | null;
  label: string;
  dependencyMatchId: string | null;
  dependencyMatchShortId: string | null;
};

export type ParticipantDisplayInfo = {
  participantId: string;
  publicCode: string | null;
  gamerTag: string | null;
  username: string | null;
  verified: boolean;
  podNumber: number | null;
  positionNumber: number | null;
};

export type DependencyMatchInfo = {
  id: string;
  qualificationRound: string | null;
  semifinalIndex: number | null;
  bracketSlotIndex: number | null;
};

function shortMatchId(matchId: string): string {
  return matchId.slice(0, 8);
}

function dependencyLabel(dependency: DependencyMatchInfo | undefined): string {
  if (!dependency) {
    return "Awaiting opponent";
  }
  const parts: string[] = [];
  if (dependency.qualificationRound) {
    parts.push(dependency.qualificationRound);
    if (dependency.semifinalIndex) {
      parts.push(String(dependency.semifinalIndex));
    }
  } else if (dependency.bracketSlotIndex != null) {
    parts.push(`Match ${dependency.bracketSlotIndex}`);
  }
  const context = parts.length > 0 ? ` (${parts.join(" ")})` : "";
  return `Winner of Match ${shortMatchId(dependency.id)}${context}`;
}

export function resolveAdminMatchSlot(input: {
  slotType: CompetitorSlotType | null;
  participantId: string | null;
  dependsOnMatchId: string | null;
  participant?: ParticipantDisplayInfo | null;
  dependencyMatch?: DependencyMatchInfo | null;
}): AdminMatchSlotProjection {
  const base: AdminMatchSlotProjection = {
    kind: "awaiting",
    participantId: input.participantId,
    publicCode: input.participant?.publicCode ?? null,
    gamerTag: input.participant?.gamerTag ?? null,
    username: input.participant?.username ?? null,
    verified: input.participant?.verified ?? false,
    podNumber: input.participant?.podNumber ?? null,
    positionNumber: input.participant?.positionNumber ?? null,
    label: "Awaiting opponent",
    dependencyMatchId: input.dependsOnMatchId,
    dependencyMatchShortId: input.dependsOnMatchId
      ? shortMatchId(input.dependsOnMatchId)
      : null,
  };

  if (input.slotType === "host") {
    return {
      ...base,
      kind: "host",
      label: "HOST",
      participantId: null,
    };
  }

  if (input.participantId && input.participant) {
    const tag = input.participant.gamerTag ?? input.participant.publicCode ?? "Participant";
    return {
      ...base,
      kind: "participant",
      label: tag,
    };
  }

  if (input.participantId && !input.participant) {
    return {
      ...base,
      kind: "participant",
      label: `Participant ${shortMatchId(input.participantId)}`,
    };
  }

  if (input.slotType === "match_winner" || input.dependsOnMatchId) {
    return {
      ...base,
      kind: "match_winner",
      label: dependencyLabel(input.dependencyMatch ?? undefined),
    };
  }

  return base;
}

export function areBothMatchParticipantsReady(
  slotA: AdminMatchSlotProjection,
  slotB: AdminMatchSlotProjection,
): boolean {
  return (
    slotA.kind === "participant" &&
    slotB.kind === "participant" &&
    Boolean(slotA.participantId && slotB.participantId)
  );
}

const TERMINAL_MATCH_STATUSES = new Set([
  "completed",
  "forfeited",
  "cancelled",
]);

/** Whether SUPER_ADMIN may edit this match at all. */
export function canSuperAdminEditMatch(status: string): boolean {
  return !TERMINAL_MATCH_STATUSES.has(status);
}

/** Whether participant slots may be changed (not completed/forfeited/cancelled). */
export function canSuperAdminEditMatchParticipants(status: string): boolean {
  return status === "scheduled" || status === "ready" || status === "live";
}

/** Whether schedule fields may be changed. */
export function canSuperAdminEditMatchSchedule(status: string): boolean {
  return canSuperAdminEditMatch(status);
}
