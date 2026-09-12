import { describe, expect, it } from "vitest";
import {
  classifyFixtureSection,
  computeFixtureOutcome,
  formatFixtureScheduleParts,
  sortCompletedFixtures,
  sortUpcomingFixtures,
} from "@/server/participant/participant-fixture-utils";

describe("classifyFixtureSection", () => {
  it("treats active statuses as upcoming", () => {
    expect(classifyFixtureSection("scheduled")).toBe("upcoming");
    expect(classifyFixtureSection("ready")).toBe("upcoming");
    expect(classifyFixtureSection("live")).toBe("upcoming");
    expect(classifyFixtureSection("requires_resolution")).toBe("upcoming");
  });

  it("treats terminal statuses as completed", () => {
    expect(classifyFixtureSection("completed")).toBe("completed");
    expect(classifyFixtureSection("forfeited")).toBe("completed");
    expect(classifyFixtureSection("cancelled")).toBe("completed");
    expect(classifyFixtureSection("disputed")).toBe("completed");
  });
});

describe("sortUpcomingFixtures", () => {
  it("sorts by scheduled datetime ascending with live first", () => {
    const sorted = sortUpcomingFixtures([
      {
        matchStatus: "scheduled",
        scheduledAt: "2026-09-20T17:00:00.000Z",
      },
      {
        matchStatus: "live",
        scheduledAt: "2026-09-19T17:00:00.000Z",
      },
      {
        matchStatus: "ready",
        scheduledAt: null,
      },
    ]);

    expect(sorted[0]?.matchStatus).toBe("live");
    expect(sorted[1]?.scheduledAt).toBe("2026-09-20T17:00:00.000Z");
    expect(sorted[2]?.scheduledAt).toBeNull();
  });
});

describe("sortCompletedFixtures", () => {
  it("sorts most recently completed first", () => {
    const sorted = sortCompletedFixtures([
      { completedAt: "2026-09-10T12:00:00.000Z", scheduledAt: null },
      { completedAt: "2026-09-12T12:00:00.000Z", scheduledAt: null },
    ]);
    expect(sorted[0]?.completedAt).toBe("2026-09-12T12:00:00.000Z");
  });
});

describe("computeFixtureOutcome", () => {
  it("returns win/loss from scores", () => {
    const win = computeFixtureOutcome({
      participantId: "you",
      matchStatus: "completed",
      youAreParticipantA: true,
      winnerParticipantId: "you",
      isDraw: false,
      yourScore: 3,
      opponentScore: 1,
    });
    expect(win.outcomeLabel).toBe("Win");
    expect(win.resultLabel).toBe("3 – 1");
  });

  it("returns forfeit outcomes", () => {
    const loss = computeFixtureOutcome({
      participantId: "you",
      matchStatus: "forfeited",
      youAreParticipantA: true,
      winnerParticipantId: "opp",
      isDraw: false,
      yourScore: null,
      opponentScore: null,
    });
    expect(loss.outcomeLabel).toBe("Loss");
  });
});

describe("formatFixtureScheduleParts", () => {
  it("formats WAT schedule and pending state", () => {
    const formatted = formatFixtureScheduleParts(
      "2026-09-19T18:00:00.000Z",
      "Africa/Lagos",
    );
    expect(formatted.date).toContain("September");
    expect(formatted.time).toContain("WAT");
    expect(formatted.pendingLabel).toBeNull();

    const pending = formatFixtureScheduleParts(null, "Africa/Lagos");
    expect(pending.pendingLabel).toBe("Schedule pending");
  });
});
