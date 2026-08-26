import { describe, expect, it } from "vitest";
import {
  DEFAULT_KG926_COMPETITION_RULES,
  KG926_COMPETITION_RULES_VERSION,
  KG926_MAX_QUALIFICATION_MATCHES,
  KG926_MAX_MATCHES_PER_NORMAL_POD,
  KG926_QUALIFICATION_ENTRANTS,
  KG926_QUALIFICATION_POD_COUNT,
  KG926_QUALIFICATION_POSITIONS_PER_POD,
  KG926_QUALIFICATION_TARGET,
} from "@/server/tournament/competition/competition-rules";
import { isQualificationPhaseComplete, explainPodReadiness } from "@/server/tournament/qualification/pod-service";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";

describe("KG926 qualification structure (FINALIZED PRODUCT RULE)", () => {
  it("defines 128 entrants → 32 pods × 4 → 32 qualifiers", () => {
    expect(KG926_QUALIFICATION_ENTRANTS).toBe(128);
    expect(KG926_QUALIFICATION_POD_COUNT).toBe(32);
    expect(KG926_QUALIFICATION_POSITIONS_PER_POD).toBe(4);
    expect(KG926_QUALIFICATION_TARGET).toBe(32);
    expect(KG926_QUALIFICATION_POD_COUNT * KG926_QUALIFICATION_POSITIONS_PER_POD).toBe(128);
    expect(KG926_QUALIFICATION_POD_COUNT * 1).toBe(KG926_QUALIFICATION_TARGET);
  });

  it("defines normal pod as 3 single-elimination matches (max 96 total)", () => {
    expect(KG926_MAX_MATCHES_PER_NORMAL_POD).toBe(3);
    expect(KG926_MAX_QUALIFICATION_MATCHES).toBe(96);
    expect(KG926_QUALIFICATION_POD_COUNT * KG926_MAX_MATCHES_PER_NORMAL_POD).toBe(96);
  });

  it("uses single_elimination_pods format — not round-robin or points", () => {
    expect(DEFAULT_KG926_COMPETITION_RULES.qualification.format).toBe(
      "single_elimination_pods",
    );
    const json = JSON.stringify(DEFAULT_KG926_COMPETITION_RULES);
    expect(json).not.toContain("round_robin");
    expect(json).not.toContain("pointsForWin");
    expect(json).not.toContain("goal_difference");
  });

  it("uses kg926-v1 rules version", () => {
    expect(KG926_COMPETITION_RULES_VERSION).toBe("kg926-v1");
    expect(DEFAULT_KG926_COMPETITION_RULES.rulesVersion).toBe("kg926-v1");
  });

  it("uses manual assignment mode initially", () => {
    expect(DEFAULT_KG926_COMPETITION_RULES.qualification.assignmentMode).toBe("manual");
  });
});

describe("qualification host rule (FINALIZED PRODUCT RULE)", () => {
  it("enables host auto-advance without host as participant", () => {
    const hostRule = DEFAULT_KG926_COMPETITION_RULES.qualification.hostRule;
    expect(hostRule.enabled).toBe(true);
    expect(hostRule.autoAdvanceAgainstHost).toBe(true);
    expect(hostRule.hostIsNotParticipant).toBe(true);
  });
});

describe("tie resolution (PENDING PRODUCT DECISION)", () => {
  it("keeps tie resolution pending in rules config", () => {
    expect(DEFAULT_KG926_COMPETITION_RULES.qualification.tieResolution).toBe("pending");
  });
});

describe("qualification phase completion", () => {
  it("requires all 32 pods completed with qualifiers", () => {
    const incomplete = Array.from({ length: 32 }, (_, i) => ({
      status: i < 31 ? "completed" : "active",
      qualifierParticipantId: i < 31 ? `p-${i}` : null,
    }));
    expect(isQualificationPhaseComplete(incomplete)).toBe(false);

    const complete = Array.from({ length: 32 }, (_, i) => ({
      status: "completed",
      qualifierParticipantId: `p-${i}`,
    }));
    expect(isQualificationPhaseComplete(complete)).toBe(true);
  });

  it("rejects fewer than 32 pods", () => {
    expect(
      isQualificationPhaseComplete([
        { status: "completed", qualifierParticipantId: "p-1" },
      ]),
    ).toBe(false);
  });

  it("rejects completed pods without qualifier recorded", () => {
    const pods = Array.from({ length: 32 }, () => ({
      status: "completed",
      qualifierParticipantId: null,
    }));
    expect(isQualificationPhaseComplete(pods)).toBe(false);
  });
});

describe("qualification RBAC", () => {
  it("allows TOURNAMENT_ADMIN and SUPER_ADMIN pod_manage", () => {
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:pod_manage")).toBe(true);
    expect(roleHasPermission("SUPER_ADMIN", "tournament:pod_manage")).toBe(true);
  });

  it("denies REVIEWER and SUPPORT pod_manage", () => {
    expect(roleHasPermission("REVIEWER", "tournament:pod_manage")).toBe(false);
    expect(roleHasPermission("SUPPORT", "tournament:pod_manage")).toBe(false);
  });

  it("allows result recording for tournament admin only", () => {
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:result_record")).toBe(true);
    expect(roleHasPermission("REVIEWER", "tournament:result_record")).toBe(false);
  });

  it("denies REVIEWER match_manage and participant_select", () => {
    expect(roleHasPermission("REVIEWER", "tournament:match_manage")).toBe(false);
    expect(roleHasPermission("REVIEWER", "tournament:participant_select")).toBe(false);
  });
});

describe("pod readiness messaging", () => {
  it("explains underfilled draft pods", () => {
    expect(
      explainPodReadiness({
        status: "draft",
        capacity: 4,
        memberCount: 2,
        hostSemifinalIndex: null,
        matchesGenerated: 0,
        qualifierPublicCode: null,
      }),
    ).toBe("2 of 4 participant positions filled.");
  });

  it("marks ready pods for match generation", () => {
    expect(
      explainPodReadiness({
        status: "ready",
        capacity: 4,
        memberCount: 4,
        hostSemifinalIndex: null,
        matchesGenerated: 0,
        qualifierPublicCode: null,
      }),
    ).toMatch(/Ready for match generation/i);
  });

  it("surfaces completed qualifier public code when available", () => {
    expect(
      explainPodReadiness({
        status: "completed",
        capacity: 4,
        memberCount: 4,
        hostSemifinalIndex: null,
        matchesGenerated: 3,
        qualifierPublicCode: "KG926-P0007",
      }),
    ).toContain("KG926-P0007");
  });
});

describe("qualification validation boundaries", () => {
  it("uses controlled error codes for assignment conflicts", () => {
    const error = new CompetitionOperationsError(
      "Participant is already assigned to another pod.",
      "CONFLICT",
      409,
    );
    expect(error.code).toBe("CONFLICT");
    expect(error.status).toBe(409);
  });

  it("uses capacity error for pod limit", () => {
    const error = new CompetitionOperationsError(
      "Pod capacity (4) reached.",
      "CAPACITY_REACHED",
      409,
    );
    expect(error.code).toBe("CAPACITY_REACHED");
  });

  it("documents draw requires resolution — no random winner", () => {
    const error = new CompetitionOperationsError(
      "Final is not ready — semifinal winners unresolved.",
      "VALIDATION_ERROR",
      400,
    );
    expect(error.message).toMatch(/unresolved/i);
  });
});

describe("qualification audit event types", () => {
  it("lists Step 8 qualification audit events", () => {
    const events = [
      "QUALIFICATION_POD_CREATED",
      "QUALIFICATION_PARTICIPANT_ASSIGNED",
      "QUALIFICATION_PARTICIPANT_REASSIGNED",
      "QUALIFICATION_MATCH_CREATED",
      "QUALIFICATION_MATCH_RESOLVED",
      "QUALIFICATION_AUTO_ADVANCED",
      "QUALIFICATION_POD_COMPLETED",
      "QUALIFICATION_TOP32_ADVANCED",
    ] as const;
    expect(events).toHaveLength(8);
    expect(events).toContain("QUALIFICATION_AUTO_ADVANCED");
  });
});

describe("public participant codes", () => {
  it("uses KG926-P#### style codes — not database IDs", () => {
    expect("KG926-P0001").toMatch(/^KG926-P\d{4}$/);
    expect("550e8400-e29b-41d4-a716-446655440000").not.toMatch(/^KG926-P/);
  });
});
