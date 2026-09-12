import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAuthorizationError } from "@/server/admin/authorization/permissions";

vi.mock("@/server/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/server/tournament/competition/match-service", () => ({
  getMatchById: vi.fn(),
}));

vi.mock("@/server/tournament/scheduling/scheduling-service", () => ({
  detectPlayerScheduleConflict: vi.fn(async () => ({ conflict: false })),
}));

vi.mock("@/server/admin/audit/record", () => ({
  recordAdminAuditEvent: vi.fn(),
}));

import { getDb } from "@/server/db";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import { getMatchById } from "@/server/tournament/competition/match-service";
import { updateMatchBySuperAdmin } from "@/server/tournament/competition/match-edit-service";

const baseMatch = {
  id: "match-1",
  tournamentId: "event-kg926",
  phaseId: "phase-1",
  status: "scheduled",
  schedulingStatus: "unscheduled",
  scheduledAt: null,
  timezone: null,
  slotAType: "participant" as const,
  slotBType: "participant" as const,
  participantAId: "participant-a",
  participantBId: "participant-b",
  dependsOnMatchAId: null,
  dependsOnMatchBId: null,
};

describe("updateMatchBySuperAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-SUPER_ADMIN roles", async () => {
    await expect(
      updateMatchBySuperAdmin({
        matchId: "match-1",
        tournamentId: "event-kg926",
        actorId: "admin-1",
        actorRole: "TOURNAMENT_ADMIN",
        date: "2026-09-15",
        time: "18:00",
      }),
    ).rejects.toBeInstanceOf(AdminAuthorizationError);
  });

  it("rejects completed matches", async () => {
    vi.mocked(getMatchById).mockResolvedValue({
      ...baseMatch,
      status: "completed",
    } as never);

    await expect(
      updateMatchBySuperAdmin({
        matchId: "match-1",
        tournamentId: "event-kg926",
        actorId: "admin-1",
        actorRole: "SUPER_ADMIN",
        date: "2026-09-15",
        time: "18:00",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects same participant on both sides", async () => {
    vi.mocked(getMatchById).mockResolvedValue({
      ...baseMatch,
      participantAId: "participant-x",
      participantBId: "participant-y",
    } as never);

    const participantRow = {
      id: "participant-a",
      tournamentId: "event-kg926",
      status: "selected",
    };
    const membershipRow = { status: "active" };
    const limit = vi
      .fn()
      .mockResolvedValueOnce([participantRow])
      .mockResolvedValueOnce([membershipRow])
      .mockResolvedValueOnce([participantRow])
      .mockResolvedValueOnce([membershipRow]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    vi.mocked(getDb).mockReturnValue({
      select: vi.fn().mockReturnValue({ from }),
      update: vi.fn(),
    } as never);

    await expect(
      updateMatchBySuperAdmin({
        matchId: "match-1",
        tournamentId: "event-kg926",
        actorId: "admin-1",
        actorRole: "SUPER_ADMIN",
        slotA: { mode: "participant", participantId: "participant-a" },
        slotB: { mode: "participant", participantId: "participant-a" },
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: expect.stringContaining("distinct participants"),
    });
  });

  it("records audit metadata when schedule changes", async () => {
    vi.mocked(getMatchById).mockResolvedValue(baseMatch as never);

    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    vi.mocked(getDb).mockReturnValue({
      update: vi.fn().mockReturnValue({ set: updateSet }),
    } as never);

    const result = await updateMatchBySuperAdmin({
      matchId: "match-1",
      tournamentId: "event-kg926",
      actorId: "admin-1",
      actorRole: "SUPER_ADMIN",
      date: "2026-09-15",
      time: "18:00",
      timezone: "Africa/Lagos",
    });

    expect(result.changed).toBe(true);
    expect(recordAdminAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "MATCH_EDITED",
        metadata: expect.objectContaining({
          matchId: "match-1",
          scheduledAt_from: null,
          scheduledAt_to: "2026-09-15T17:00:00.000Z",
        }),
      }),
    );
  });
});
