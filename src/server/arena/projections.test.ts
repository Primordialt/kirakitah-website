import { describe, expect, it } from "vitest";
import {
  gateArenaEconomics,
  participantPayloadExposesEconomics,
  projectParticipantArenaLive,
  readArenaSubmission,
} from "@/server/arena/projections";
import { arenaPrizeIdempotencyKey } from "@/server/wallet/money";

describe("participant arena projection", () => {
  it("omits pool, threshold, and settlement fields", () => {
    const view = projectParticipantArenaLive({
      arena: {
        slug: "quickfire",
        name: "KIRAKITAH QUICKFIRE",
        kind: "quickfire",
        enabled: true,
        paused: false,
      },
      round: { number: 3, state: "active", secondsRemaining: 8 },
      question: null,
      challenge: null,
      winnerAnnouncement: null,
      lastRound: { outcome: "winner", username: "nova", prizeKk: "60" },
    });
    expect(view.lastRound).toEqual({ outcome: "winner", username: "nova", prizeKk: "60" });
    expect(participantPayloadExposesEconomics(view)).toBe(false);
    expect(participantPayloadExposesEconomics({ ...view, grossPoolKk: "50", chargedEntries: 100 })).toBe(
      true,
    );
  });
});

describe("admin arena economics gate", () => {
  it("strips economics unless the caller is allowed to see them", () => {
    const row = {
      roundNumber: 42,
      state: "completed",
      economics: {
        chargedEntries: 100,
        grossPoolKk: "50",
        finalPrizeKk: "30",
        platformRemainderKk: "20",
      },
    };
    expect(gateArenaEconomics(row, false)).toEqual({ roundNumber: 42, state: "completed" });
    expect(gateArenaEconomics(row, true).economics?.chargedEntries).toBe(100);
  });
});

describe("arena submission economics", () => {
  it("ignores client prize, pool, and entry count", () => {
    const submission = readArenaSubmission({
      payload: "B",
      clientRequestId: "req-1",
      prizeMilli: 999_000,
      prizeKk: "999",
      poolMilli: 500_000,
      chargedEntries: 1,
      payoutMilli: 3000,
    });
    expect(submission).toEqual({ payload: "B", clientRequestId: "req-1" });
    expect(submission).not.toHaveProperty("prizeMilli");
    expect(submission).not.toHaveProperty("chargedEntries");
  });

  it("reuses one settlement key per round", () => {
    expect(arenaPrizeIdempotencyKey("round-42")).toBe("arena-prize:round-42");
    expect(arenaPrizeIdempotencyKey("round-42")).toBe(arenaPrizeIdempotencyKey("round-42"));
  });
});
