import { describe, expect, it } from "vitest";
import {
  determineRoundOutcome,
  formatDisqualifyMessage,
  selectFirstCorrectResponse,
} from "@/server/arena/round-resolution";
import { calculateArenaPrize, isArenaPrizePayable } from "@/server/wallet/money";

describe("Arena round response threshold", () => {
  const min = 10;

  it("disqualifies when fewer than 10 accepted responses", () => {
    for (const count of [0, 1, 9]) {
      const outcome = determineRoundOutcome({
        acceptedResponseCount: count,
        minResponsesRequired: min,
        hasCorrectResponse: count === 3,
      });
      expect(outcome.kind).toBe("disqualified");
    }
  });

  it("validates round with 10 responses from one user", () => {
    const outcome = determineRoundOutcome({
      acceptedResponseCount: 10,
      minResponsesRequired: min,
      hasCorrectResponse: true,
    });
    expect(outcome.kind).toBe("winner");
  });

  it("validates round with 20 responses", () => {
    const outcome = determineRoundOutcome({
      acceptedResponseCount: 20,
      minResponsesRequired: min,
      hasCorrectResponse: false,
    });
    expect(outcome.kind).toBe("no_winner");
  });

  it("validates two users with five responses each", () => {
    const outcome = determineRoundOutcome({
      acceptedResponseCount: 10,
      minResponsesRequired: min,
      hasCorrectResponse: true,
    });
    expect(outcome.kind).toBe("winner");
  });

  it("does not pay out when correct but only 3 responses at expiry", () => {
    const outcome = determineRoundOutcome({
      acceptedResponseCount: 3,
      minResponsesRequired: min,
      hasCorrectResponse: true,
    });
    expect(outcome.kind).toBe("disqualified");
  });

  it("allows winner when 3rd response correct and total reaches 10", () => {
    const outcome = determineRoundOutcome({
      acceptedResponseCount: 10,
      minResponsesRequired: min,
      hasCorrectResponse: true,
    });
    expect(outcome.kind).toBe("winner");
  });

  it("no winner when 10 responses but none correct", () => {
    const outcome = determineRoundOutcome({
      acceptedResponseCount: 10,
      minResponsesRequired: min,
      hasCorrectResponse: false,
    });
    expect(outcome.kind).toBe("no_winner");
  });

  it("formats disqualification copy", () => {
    expect(formatDisqualifyMessage(7, 10)).toContain("Only 7 responses");
    expect(formatDisqualifyMessage(7, 10)).toContain("10 responses are required");
  });

  it("pays nothing when 9 charged entries end the round", () => {
    const outcome = determineRoundOutcome({
      acceptedResponseCount: 9,
      minResponsesRequired: min,
      hasCorrectResponse: true,
    });
    expect(outcome.kind).toBe("disqualified");
    expect(isArenaPrizePayable({ chargedEntries: 9 })).toBe(false);
  });

  it("pays 6 KK for 20 charged entries and 30 KK for 100", () => {
    for (const row of [
      { entries: 20, prize: 6000 },
      { entries: 100, prize: 30000 },
    ]) {
      const outcome = determineRoundOutcome({
        acceptedResponseCount: row.entries,
        minResponsesRequired: min,
        hasCorrectResponse: true,
      });
      expect(outcome.kind).toBe("winner");
      expect(isArenaPrizePayable({ chargedEntries: row.entries })).toBe(true);
      expect(calculateArenaPrize({ chargedEntries: row.entries }).prizeMilli).toBe(row.prize);
    }
  });

  it("keeps a single winner when two correct responses arrive together", () => {
    const winner = selectFirstCorrectResponse([
      { id: "late", isCorrect: true, receivedAt: "2026-10-08T00:00:02.000Z", sequence: 1 },
      { id: "first", isCorrect: true, receivedAt: "2026-10-08T00:00:01.000Z", sequence: 4 },
      { id: "wrong", isCorrect: false, receivedAt: "2026-10-08T00:00:00.000Z", sequence: 1 },
    ]);
    expect(winner?.id).toBe("first");
    const tied = selectFirstCorrectResponse([
      { id: "b", isCorrect: true, receivedAt: "2026-10-08T00:00:01.000Z", sequence: 2 },
      { id: "a", isCorrect: true, receivedAt: "2026-10-08T00:00:01.000Z", sequence: 1 },
    ]);
    expect(tied?.id).toBe("a");
  });
});

describe("Quickfire client payload safety", () => {
  it("does not embed correct answer in option map shape", () => {
    const publicQuestion = {
      question: "Sample?",
      optionA: "One",
      optionB: "Two",
      optionC: "Three",
      optionD: "Four",
    };
    expect(Object.keys(publicQuestion)).not.toContain("correctOption");
    expect(Object.keys(publicQuestion)).not.toContain("correctAnswer");
  });
});
