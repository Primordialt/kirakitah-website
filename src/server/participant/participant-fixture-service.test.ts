import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAdminMatchSlot } from "@/server/tournament/competition/admin-match-slot";

vi.mock("@/server/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/server/participant/tournament-context", () => ({
  resolveParticipantTournamentContext: vi.fn(),
}));

import { getDb } from "@/server/db";
import { resolveParticipantTournamentContext } from "@/server/participant/tournament-context";
import {
  getParticipantFixtureByMatchId,
  listParticipantFixtures,
} from "@/server/participant/participant-fixture-service";
import { assertNoSensitivePublicFields } from "@/server/tournament/competition/public-projections";

describe("listParticipantFixtures security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty lists when account has no selected memberships", async () => {
    const innerJoin = vi.fn().mockReturnThis();
    const where = vi.fn().mockResolvedValue([]);
    const from = vi.fn().mockReturnValue({ innerJoin, where });
    vi.mocked(getDb).mockReturnValue({
      select: vi.fn().mockReturnValue({ from }),
    } as never);

    const result = await listParticipantFixtures("account-1");
    expect(result.upcoming).toEqual([]);
    expect(result.completed).toEqual([]);
  });
});

describe("getParticipantFixtureByMatchId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when participant has no access to match tournament", async () => {
    const selectLimit = vi
      .fn()
      .mockResolvedValueOnce([{ tournamentId: "event-kg926" }])
      .mockResolvedValueOnce([]);
    const selectWhere = vi.fn().mockReturnValue({ limit: selectLimit });
    const selectFrom = vi.fn().mockReturnValue({ where: selectWhere });
    vi.mocked(getDb).mockReturnValue({
      select: vi.fn().mockReturnValue({ from: selectFrom }),
    } as never);

    vi.mocked(resolveParticipantTournamentContext).mockResolvedValue({
      tournament: null,
      application: null,
      tournamentParticipant: null,
      participantId: null,
      publicCode: null,
    });

    const fixture = await getParticipantFixtureByMatchId(
      "account-1",
      "00000000-0000-4000-8000-000000000099",
    );
    expect(fixture).toBeNull();
  });
});

describe("participant fixture opponent resolution", () => {
  it("labels winner-of-match dependencies without admin internals", () => {
    const depId = "8386953f-0000-4000-8000-000000000001";
    const slot = resolveAdminMatchSlot({
      slotType: "match_winner",
      participantId: null,
      dependsOnMatchId: depId,
      participant: null,
      dependencyMatch: {
        id: depId,
        qualificationRound: "semifinal",
        semifinalIndex: 1,
        bracketSlotIndex: null,
      },
    });

    expect(slot.kind).toBe("match_winner");
    expect(slot.label).toContain("Winner of Match 8386953f");
    expect(slot.label).not.toContain("Participants not resolved");
  });

  it("labels HOST slots clearly", () => {
    const slot = resolveAdminMatchSlot({
      slotType: "host",
      participantId: null,
      dependsOnMatchId: null,
      participant: null,
      dependencyMatch: null,
    });

    expect(slot.kind).toBe("host");
    expect(slot.label).toBe("HOST");
  });
});

describe("participant fixture sensitive data guard", () => {
  it("rejects sensitive fields in fixture payloads", () => {
    expect(() =>
      assertNoSensitivePublicFields({
        matchId: "m1",
        yourGamerTag: "PlayerOne",
        opponentGamerTag: "PlayerTwo",
      }),
    ).not.toThrow();

    expect(() =>
      assertNoSensitivePublicFields({
        matchId: "m1",
        nin: "12345678901",
      }),
    ).toThrow(/sensitive field/i);
  });
});
