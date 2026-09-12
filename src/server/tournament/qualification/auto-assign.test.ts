import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  KG926_QUALIFICATION_ENTRANTS,
  KG926_QUALIFICATION_POD_COUNT,
  KG926_QUALIFICATION_POSITIONS_PER_POD,
} from "@/server/tournament/competition/competition-rules";
import { buildAssignmentPlan } from "@/server/tournament/qualification/auto-assign-service";
import { roleHasPermission } from "@/server/admin/authorization/permissions";

type OccupiedSlot = { podNumber: number; positionNumber: number };

/** Mirrors listAvailableSlots slot ordering in auto-assign-service.ts (read-only). */
function buildKg926AvailableSlots(options?: {
  occupied?: OccupiedSlot[];
  protectedPodNumbers?: number[];
  completedOrCancelledPods?: number[];
}) {
  const occupied = options?.occupied ?? [];
  const protectedPodNumbers = new Set(options?.protectedPodNumbers ?? []);
  const closedPods = new Set(options?.completedOrCancelledPods ?? []);
  const slots: Array<{ podId: string; podNumber: number; positionNumber: number }> =
    [];

  for (let podNumber = 1; podNumber <= KG926_QUALIFICATION_POD_COUNT; podNumber += 1) {
    if (protectedPodNumbers.has(podNumber) || closedPods.has(podNumber)) continue;

    const occupiedPositions = new Set(
      occupied
        .filter((slot) => slot.podNumber === podNumber)
        .map((slot) => slot.positionNumber),
    );

    for (
      let positionNumber = 1;
      positionNumber <= KG926_QUALIFICATION_POSITIONS_PER_POD;
      positionNumber += 1
    ) {
      if (!occupiedPositions.has(positionNumber)) {
        slots.push({
          podId: `pod-${podNumber}`,
          podNumber,
          positionNumber,
        });
      }
    }
  }

  return slots;
}

function participantIds(count: number, prefix = "p"): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}-${index + 1}`);
}

function planToLocations(
  plan: ReturnType<typeof buildAssignmentPlan>,
): Array<{ podNumber: number; positionNumber: number; participantId: string }> {
  return plan.map((row) => ({
    podNumber: row.podNumber,
    positionNumber: row.positionNumber,
    participantId: row.participantId,
  }));
}

describe("buildAssignmentPlan", () => {
  it("assigns participants to slots in deterministic order", () => {
    const participants = ["p-a", "p-b", "p-c"];
    const slots = [
      { podId: "pod-1", podNumber: 1, positionNumber: 1 },
      { podId: "pod-1", podNumber: 1, positionNumber: 2 },
      { podId: "pod-2", podNumber: 2, positionNumber: 1 },
    ];

    const plan = buildAssignmentPlan(participants, slots);
    expect(plan).toEqual([
      {
        podId: "pod-1",
        podNumber: 1,
        positionNumber: 1,
        participantId: "p-a",
      },
      {
        podId: "pod-1",
        podNumber: 1,
        positionNumber: 2,
        participantId: "p-b",
      },
      {
        podId: "pod-2",
        podNumber: 2,
        positionNumber: 1,
        participantId: "p-c",
      },
    ]);
  });

  it("never exceeds available slot capacity", () => {
    const participants = ["p-1", "p-2", "p-3", "p-4"];
    const slots = [
      { podId: "pod-1", podNumber: 1, positionNumber: 1 },
      { podId: "pod-1", podNumber: 1, positionNumber: 2 },
    ];
    expect(buildAssignmentPlan(participants, slots)).toHaveLength(2);
  });

  it("returns empty plan when no participants or slots", () => {
    expect(buildAssignmentPlan([], [{ podId: "p", podNumber: 1, positionNumber: 1 }])).toEqual(
      [],
    );
    expect(buildAssignmentPlan(["p-1"], [])).toEqual([]);
  });
});

describe("KG926 incremental auto-assign capacity", () => {
  const allSlots = buildKg926AvailableSlots();

  it("defines 128 maximum qualification positions", () => {
    expect(KG926_QUALIFICATION_POD_COUNT * KG926_QUALIFICATION_POSITIONS_PER_POD).toBe(128);
    expect(KG926_QUALIFICATION_ENTRANTS).toBe(128);
    expect(allSlots).toHaveLength(128);
  });

  it.each([
    [0, 0],
    [1, 1],
    [9, 9],
    [32, 32],
    [64, 64],
    [127, 127],
    [128, 128],
  ])("%i selected → %i assignments on empty pods", (selectedCount, expectedAssignments) => {
    const plan = buildAssignmentPlan(participantIds(selectedCount), allSlots);
    expect(plan).toHaveLength(expectedAssignments);
  });

  it("129 selected → 128 assignments maximum with 1 unresolved", () => {
    const plan = buildAssignmentPlan(participantIds(129), allSlots);
    expect(plan).toHaveLength(128);
    expect(129 - plan.length).toBe(1);
  });

  it("assigns 9 selected participants into pods 1–3 without requiring full roster", () => {
    const plan = planToLocations(buildAssignmentPlan(participantIds(9), allSlots));
    expect(plan).toEqual([
      { podNumber: 1, positionNumber: 1, participantId: "p-1" },
      { podNumber: 1, positionNumber: 2, participantId: "p-2" },
      { podNumber: 1, positionNumber: 3, participantId: "p-3" },
      { podNumber: 1, positionNumber: 4, participantId: "p-4" },
      { podNumber: 2, positionNumber: 1, participantId: "p-5" },
      { podNumber: 2, positionNumber: 2, participantId: "p-6" },
      { podNumber: 2, positionNumber: 3, participantId: "p-7" },
      { podNumber: 2, positionNumber: 4, participantId: "p-8" },
      { podNumber: 3, positionNumber: 1, participantId: "p-9" },
    ]);
  });

  it("incrementally assigns only new participants without reshuffling existing ones", () => {
    const initialOccupied: OccupiedSlot[] = [
      { podNumber: 1, positionNumber: 1 },
      { podNumber: 1, positionNumber: 2 },
      { podNumber: 1, positionNumber: 3 },
      { podNumber: 1, positionNumber: 4 },
      { podNumber: 2, positionNumber: 1 },
      { podNumber: 2, positionNumber: 2 },
    ];

    const firstRun = planToLocations(
      buildAssignmentPlan(participantIds(6, "initial"), buildKg926AvailableSlots()),
    );
    expect(firstRun.map((row) => row.participantId)).toEqual([
      "initial-1",
      "initial-2",
      "initial-3",
      "initial-4",
      "initial-5",
      "initial-6",
    ]);

    const secondRun = planToLocations(
      buildAssignmentPlan(
        participantIds(2, "new"),
        buildKg926AvailableSlots({ occupied: initialOccupied }),
      ),
    );

    expect(secondRun).toEqual([
      { podNumber: 2, positionNumber: 3, participantId: "new-1" },
      { podNumber: 2, positionNumber: 4, participantId: "new-2" },
    ]);
  });

  it("is idempotent when all selected participants are already assigned", () => {
    const occupied: OccupiedSlot[] = [];
    for (let podNumber = 1; podNumber <= 3; podNumber += 1) {
      for (let positionNumber = 1; positionNumber <= 4; positionNumber += 1) {
        if (podNumber === 3 && positionNumber > 1) break;
        occupied.push({ podNumber, positionNumber });
      }
    }

    const plan = buildAssignmentPlan([], buildKg926AvailableSlots({ occupied }));
    expect(plan).toEqual([]);
  });

  it("skips occupied and protected pod positions", () => {
    const occupied: OccupiedSlot[] = [{ podNumber: 1, positionNumber: 1 }];
    const slots = buildKg926AvailableSlots({
      occupied,
      protectedPodNumbers: [2],
    });

    const plan = planToLocations(buildAssignmentPlan(participantIds(3), slots));
    expect(plan).toEqual([
      { podNumber: 1, positionNumber: 2, participantId: "p-1" },
      { podNumber: 1, positionNumber: 3, participantId: "p-2" },
      { podNumber: 1, positionNumber: 4, participantId: "p-3" },
    ]);
    expect(plan.some((row) => row.podNumber === 2)).toBe(false);
  });

  it("never assigns the same participant twice in one plan", () => {
    const plan = buildAssignmentPlan(participantIds(64), allSlots);
    const uniqueParticipants = new Set(plan.map((row) => row.participantId));
    expect(uniqueParticipants.size).toBe(plan.length);
  });

  it("never assigns two participants to the same pod position", () => {
    const plan = buildAssignmentPlan(participantIds(128), allSlots);
    const uniquePositions = new Set(
      plan.map((row) => `${row.podNumber}:${row.positionNumber}`),
    );
    expect(uniquePositions.size).toBe(plan.length);
  });

  it("never assigns more than four participants to a pod", () => {
    const plan = buildAssignmentPlan(participantIds(128), allSlots);
    const perPod = new Map<number, number>();
    for (const row of plan) {
      perPod.set(row.podNumber, (perPod.get(row.podNumber) ?? 0) + 1);
    }
    for (const count of perPod.values()) {
      expect(count).toBeLessThanOrEqual(4);
    }
  });
});

describe("auto-assign concurrency protection", () => {
  it("uses pg_advisory_xact_lock within a transaction", () => {
    const source = readFileSync(
      join(process.cwd(), "src/server/tournament/qualification/auto-assign-service.ts"),
      "utf8",
    );
    expect(source).toContain("pg_advisory_xact_lock(hashtext($1))");
    expect(source).toContain("qual_auto_assign:${input.tournamentId}");
    expect(source).toContain('await client.query("BEGIN")');
    expect(source).toContain('await client.query("ROLLBACK")');
  });
});

describe("qualification auto-assign RBAC", () => {
  it("allows TOURNAMENT_ADMIN and SUPER_ADMIN to manage pods (auto assign)", () => {
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:pod_manage")).toBe(true);
    expect(roleHasPermission("SUPER_ADMIN", "tournament:pod_manage")).toBe(true);
  });

  it("denies REVIEWER and SUPPORT auto assign", () => {
    expect(roleHasPermission("REVIEWER", "tournament:pod_manage")).toBe(false);
    expect(roleHasPermission("SUPPORT", "tournament:pod_manage")).toBe(false);
  });

  it("allows only SUPER_ADMIN to reassign pod positions", () => {
    expect(roleHasPermission("SUPER_ADMIN", "qualification:reassign_position")).toBe(true);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "qualification:reassign_position")).toBe(
      false,
    );
    expect(roleHasPermission("REVIEWER", "qualification:reassign_position")).toBe(false);
    expect(roleHasPermission("SUPPORT", "qualification:reassign_position")).toBe(false);
  });
});
