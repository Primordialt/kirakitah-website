/** Pure helpers for participant fixture classification and presentation. */

export type FixtureSection = "upcoming" | "completed";

const COMPLETED_STATUSES = new Set([
  "completed",
  "forfeited",
  "cancelled",
  "disputed",
]);

export function classifyFixtureSection(matchStatus: string): FixtureSection {
  return COMPLETED_STATUSES.has(matchStatus) ? "completed" : "upcoming";
}

export function matchStatusLabel(status: string): string {
  switch (status) {
    case "live":
      return "Live";
    case "ready":
      return "Ready";
    case "scheduled":
      return "Scheduled";
    case "completed":
      return "Completed";
    case "forfeited":
      return "Forfeited";
    case "cancelled":
      return "Cancelled";
    case "disputed":
      return "Disputed";
    case "requires_resolution":
      return "Requires resolution";
    default:
      return status.replace(/_/g, " ");
  }
}

export function computeFixtureOutcome(input: {
  participantId: string;
  matchStatus: string;
  youAreParticipantA: boolean;
  winnerParticipantId: string | null;
  isDraw: boolean;
  yourScore: number | null;
  opponentScore: number | null;
}): { outcomeLabel: string | null; resultLabel: string } {
  if (input.matchStatus === "cancelled") {
    return { outcomeLabel: null, resultLabel: "Cancelled" };
  }

  if (input.matchStatus === "forfeited") {
    if (input.winnerParticipantId === input.participantId) {
      return { outcomeLabel: "Win", resultLabel: "Win by forfeit" };
    }
    if (input.winnerParticipantId) {
      return { outcomeLabel: "Loss", resultLabel: "Loss by forfeit" };
    }
    return { outcomeLabel: null, resultLabel: "Forfeited" };
  }

  if (
    input.yourScore != null &&
    input.opponentScore != null &&
    (input.matchStatus === "completed" ||
      input.matchStatus === "disputed" ||
      input.winnerParticipantId != null)
  ) {
    if (input.isDraw) {
      return {
        outcomeLabel: "Draw",
        resultLabel: `${input.yourScore} – ${input.opponentScore}`,
      };
    }
    const youWon = input.winnerParticipantId === input.participantId;
    return {
      outcomeLabel: youWon ? "Win" : "Loss",
      resultLabel: `${input.yourScore} – ${input.opponentScore}`,
    };
  }

  if (input.matchStatus === "disputed") {
    return { outcomeLabel: null, resultLabel: "Under review" };
  }

  return { outcomeLabel: null, resultLabel: "Result pending" };
}

export function computeTournamentFixtureResult(input: {
  matchStatus: string;
  scoreA: number | null;
  scoreB: number | null;
  isDraw: boolean;
  winnerParticipantId: string | null;
}): string {
  if (input.matchStatus === "cancelled") {
    return "Cancelled";
  }

  if (input.matchStatus === "forfeited") {
    return "Forfeited";
  }

  if (
    input.scoreA != null &&
    input.scoreB != null &&
    (input.matchStatus === "completed" ||
      input.matchStatus === "disputed" ||
      input.winnerParticipantId != null)
  ) {
    if (input.isDraw) {
      return `${input.scoreA} – ${input.scoreB} (Draw)`;
    }
    return `${input.scoreA} – ${input.scoreB}`;
  }

  if (input.matchStatus === "disputed") {
    return "Under review";
  }

  return "Result pending";
}

export function sortUpcomingFixtures<T extends { scheduledAt: string | null; matchStatus: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const liveBoost = (status: string) => (status === "live" ? 0 : 1);
    const liveDiff = liveBoost(a.matchStatus) - liveBoost(b.matchStatus);
    if (liveDiff !== 0) return liveDiff;

    const aTime = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.POSITIVE_INFINITY;
    if (aTime !== bTime) return aTime - bTime;
    return 0;
  });
}

export function sortCompletedFixtures<
  T extends { completedAt: string | null; scheduledAt: string | null },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.completedAt ?? a.scheduledAt ?? 0).getTime();
    const bTime = new Date(b.completedAt ?? b.scheduledAt ?? 0).getTime();
    return bTime - aTime;
  });
}

export function formatFixtureScheduleParts(
  iso: string | null | undefined,
  timezone: string,
): {
  date: string;
  time: string;
  full: string;
  pendingLabel: string | null;
} {
  if (!iso) {
    return {
      date: "—",
      time: "—",
      full: "Schedule pending",
      pendingLabel: "Schedule pending",
    };
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return {
      date: "—",
      time: "—",
      full: "Schedule pending",
      pendingLabel: "Schedule pending",
    };
  }

  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(date);
  const timeParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const get = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const weekday = get(dateParts, "weekday");
  const day = get(dateParts, "day");
  const month = get(dateParts, "month");
  const hour = get(timeParts, "hour");
  const minute = get(timeParts, "minute");
  const dayPeriod = get(timeParts, "dayPeriod").toUpperCase();
  const tzSuffix = timezone === "Africa/Lagos" ? "WAT" : timezone;

  const dateDisplay = `${weekday}, ${day} ${month}`;
  const timeDisplay = `${hour}:${minute} ${dayPeriod} ${tzSuffix}`;

  return {
    date: dateDisplay,
    time: timeDisplay,
    full: `${dateDisplay} · ${timeDisplay}`,
    pendingLabel: null,
  };
}
