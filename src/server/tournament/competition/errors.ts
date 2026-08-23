export class CompetitionOperationsError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = "CompetitionOperationsError";
    this.code = code;
    this.status = status;
  }
}

export const PHASE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["scheduled", "cancelled"],
  scheduled: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionPhaseStatus(
  from: string,
  to: string,
): boolean {
  return (PHASE_TRANSITIONS[from] ?? []).includes(to);
}
