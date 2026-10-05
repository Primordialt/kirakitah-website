import { describe, expect, it } from "vitest";
import {
  determineRoundOutcome,
  formatDisqualifyMessage,
} from "@/server/arena/round-resolution";

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
