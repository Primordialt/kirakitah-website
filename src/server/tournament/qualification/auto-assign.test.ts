import { describe, expect, it } from "vitest";
import { buildAssignmentPlan } from "@/server/tournament/qualification/auto-assign-service";
import { roleHasPermission } from "@/server/admin/authorization/permissions";

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

describe("qualification auto-assign RBAC", () => {
  it("allows TOURNAMENT_ADMIN and SUPER_ADMIN to manage pods (auto assign)", () => {
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:pod_manage")).toBe(true);
    expect(roleHasPermission("SUPER_ADMIN", "tournament:pod_manage")).toBe(true);
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
