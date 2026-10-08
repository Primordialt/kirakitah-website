import { describe, expect, it } from "vitest";
import {
  selectArenaChallenge,
  summarizeChallengeUsage,
} from "@/server/arena/challenge-selection";

const pool = ["A", "B", "C", "D", "E"];

describe("Quickfire and TypeRush challenge rotation", () => {
  it("gives round 1 a question and round 2 a different one", () => {
    const first = selectArenaChallenge({ poolIds: pool, history: [], random: () => 0 });
    const second = selectArenaChallenge({
      poolIds: pool,
      history: [{ challengeId: first.challengeId, roundNumber: 1 }],
      random: () => 0,
    });
    expect(first.challengeId).toBe("A");
    expect(second.challengeId).not.toBe(first.challengeId);
  });

  it("does not repeat a recently used question while unused ones remain", () => {
    const third = selectArenaChallenge({
      poolIds: pool,
      history: [
        { challengeId: "A", roundNumber: 1 },
        { challengeId: "B", roundNumber: 2 },
      ],
      random: () => 0,
    });
    expect(third.challengeId).not.toBe("A");
    expect(third.challengeId).not.toBe("B");
  });

  it("keeps an assigned challenge stable for the same round history", () => {
    const history = [{ challengeId: "C", roundNumber: 4 }];
    const again = selectArenaChallenge({ poolIds: pool, history, random: () => 0.2 });
    expect(history[0]?.challengeId).toBe("C");
    expect(again.challengeId).not.toBe("C");
  });

  it("returns older questions only after the pool has been used", () => {
    const history = pool.map((challengeId, index) => ({
      challengeId,
      roundNumber: index + 1,
    }));
    const next = selectArenaChallenge({ poolIds: pool, history, random: () => 0 });
    expect(next.challengeId).toBe("A");
    expect(next.repeatedImmediately).toBe(false);
  });

  it("randomizes among unused challenges", () => {
    const low = selectArenaChallenge({ poolIds: pool, history: [], random: () => 0 });
    const high = selectArenaChallenge({ poolIds: pool, history: [], random: () => 0.99 });
    expect(low.challengeId).not.toBe(high.challengeId);
  });

  it("selects one challenge and does not return the rest of the pool", () => {
    const selected = selectArenaChallenge({ poolIds: pool, history: [], random: () => 0.4 });
    expect(pool.filter((id) => id === selected.challengeId)).toHaveLength(1);
    expect(Object.keys(selected)).not.toContain("poolIds");
  });

  it("flags a one-item pool instead of pretending variety exists", () => {
    const selected = selectArenaChallenge({
      poolIds: ["ONLY"],
      history: [{ challengeId: "ONLY", roundNumber: 1 }],
      random: () => 0,
    });
    expect(selected.challengeId).toBe("ONLY");
    expect(selected.poolLow).toBe(true);
    expect(selected.repeatedImmediately).toBe(true);
  });

  it("two selectors with the same history avoid the previous challenge", () => {
    const history = [{ challengeId: "A", roundNumber: 1 }];
    const left = selectArenaChallenge({ poolIds: pool, history, random: () => 0 });
    const right = selectArenaChallenge({ poolIds: pool, history, random: () => 0.9 });
    expect(left.challengeId).not.toBe("A");
    expect(right.challengeId).not.toBe("A");
  });
});

describe("admin pool summary", () => {
  it("warns when the Quickfire pool is low", () => {
    const summary = summarizeChallengeUsage({
      kind: "quickfire",
      pool: [{ id: "A", label: "Question A", active: true }],
      history: [{ challengeId: "A", roundNumber: 3 }],
    });
    expect(summary.activeCount).toBe(1);
    expect(summary.recentlyUsed[0]?.usageCount).toBe(1);
    expect(summary.recentlyUsed[0]?.lastRoundNumber).toBe(3);
    expect(summary.warning).toContain("Quickfire question pool is running low");
  });

  it("warns when the TypeRush pool is low", () => {
    const summary = summarizeChallengeUsage({
      kind: "typerush",
      pool: [{ id: "A", label: "Line A", active: true }],
      history: [],
    });
    expect(summary.warning).toBe("TypeRush challenge pool is running low.");
  });
});
