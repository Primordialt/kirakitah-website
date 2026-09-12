import { describe, expect, it } from "vitest";
import {
  areBothMatchParticipantsReady,
  canSuperAdminEditMatch,
  canSuperAdminEditMatchParticipants,
  resolveAdminMatchSlot,
} from "@/server/tournament/competition/admin-match-slot";

describe("resolveAdminMatchSlot", () => {
  it("resolves direct participants with gamerTag", () => {
    const slot = resolveAdminMatchSlot({
      slotType: "participant",
      participantId: "aaa-bbb",
      dependsOnMatchId: null,
      participant: {
        participantId: "aaa-bbb",
        publicCode: "KG926-P0001",
        gamerTag: "PlayerOne",
        username: "playerone",
        verified: true,
        podNumber: 3,
        positionNumber: 1,
      },
    });
    expect(slot.kind).toBe("participant");
    expect(slot.label).toBe("PlayerOne");
    expect(slot.gamerTag).toBe("PlayerOne");
    expect(slot.podNumber).toBe(3);
  });

  it("shows HOST for host slots", () => {
    const slot = resolveAdminMatchSlot({
      slotType: "host",
      participantId: null,
      dependsOnMatchId: null,
    });
    expect(slot.kind).toBe("host");
    expect(slot.label).toBe("HOST");
  });

  it("shows winner dependency label instead of generic unresolved", () => {
    const slot = resolveAdminMatchSlot({
      slotType: "match_winner",
      participantId: null,
      dependsOnMatchId: "8386953f-0000-4000-8000-000000000001",
      dependencyMatch: {
        id: "8386953f-0000-4000-8000-000000000001",
        qualificationRound: "semifinal",
        semifinalIndex: 1,
        bracketSlotIndex: null,
      },
    });
    expect(slot.kind).toBe("match_winner");
    expect(slot.label).toContain("Winner of Match 8386953f");
    expect(slot.label).toContain("semifinal");
  });

  it("uses awaiting opponent only when genuinely unknown", () => {
    const slot = resolveAdminMatchSlot({
      slotType: "participant",
      participantId: null,
      dependsOnMatchId: null,
    });
    expect(slot.kind).toBe("awaiting");
    expect(slot.label).toBe("Awaiting opponent");
  });
});

describe("participants ready", () => {
  it("requires both resolved participant slots", () => {
    const a = resolveAdminMatchSlot({
      slotType: "participant",
      participantId: "a",
      dependsOnMatchId: null,
      participant: {
        participantId: "a",
        publicCode: "P1",
        gamerTag: "A",
        username: null,
        verified: false,
        podNumber: null,
        positionNumber: null,
      },
    });
    const b = resolveAdminMatchSlot({
      slotType: "match_winner",
      participantId: null,
      dependsOnMatchId: "dep",
      dependencyMatch: {
        id: "dep",
        qualificationRound: "semifinal",
        semifinalIndex: 2,
        bracketSlotIndex: null,
      },
    });
    expect(areBothMatchParticipantsReady(a, b)).toBe(false);
  });
});

describe("SUPER_ADMIN edit guards", () => {
  it("blocks terminal statuses", () => {
    expect(canSuperAdminEditMatch("completed")).toBe(false);
    expect(canSuperAdminEditMatch("forfeited")).toBe(false);
    expect(canSuperAdminEditMatch("cancelled")).toBe(false);
  });

  it("allows scheduled and ready participant edits", () => {
    expect(canSuperAdminEditMatchParticipants("scheduled")).toBe(true);
    expect(canSuperAdminEditMatchParticipants("ready")).toBe(true);
    expect(canSuperAdminEditMatchParticipants("completed")).toBe(false);
  });
});
