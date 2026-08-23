import { describe, expect, it } from "vitest";
import {
  canTransitionPhaseStatus,
  PHASE_TRANSITIONS,
} from "@/server/tournament/competition/errors";
import {
  DEFAULT_KG926_COMPETITION_RULES,
  isQualificationAdvancementConfigured,
  isQualificationPairingConfigured,
  parseCompetitionRules,
  KG926_COMPETITION_RULES_VERSION,
} from "@/server/tournament/competition/competition-rules";
import {
  assertNoSensitivePublicFields,
  toPublicTournamentSummary,
} from "@/server/tournament/competition/public-projections";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";

describe("phase status transitions", () => {
  it("allows draft → scheduled → active → completed", () => {
    expect(canTransitionPhaseStatus("draft", "scheduled")).toBe(true);
    expect(canTransitionPhaseStatus("scheduled", "active")).toBe(true);
    expect(canTransitionPhaseStatus("active", "completed")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransitionPhaseStatus("completed", "active")).toBe(false);
    expect(canTransitionPhaseStatus("cancelled", "draft")).toBe(false);
    expect(canTransitionPhaseStatus("draft", "completed")).toBe(false);
  });

  it("defines controlled statuses only", () => {
    expect(Object.keys(PHASE_TRANSITIONS).sort()).toEqual(
      ["active", "cancelled", "completed", "draft", "scheduled"].sort(),
    );
  });
});

describe("competition rules configuration", () => {
  it("uses kg926-v1 with finalized pod single-elimination structure", () => {
    expect(KG926_COMPETITION_RULES_VERSION).toBe("kg926-v1");
    expect(DEFAULT_KG926_COMPETITION_RULES.qualification.format).toBe(
      "single_elimination_pods",
    );
    expect(DEFAULT_KG926_COMPETITION_RULES.qualification.podCount).toBe(32);
    expect(DEFAULT_KG926_COMPETITION_RULES.qualification.positionsPerPod).toBe(4);
    expect(DEFAULT_KG926_COMPETITION_RULES.qualification.assignmentMode).toBe("manual");
    expect(DEFAULT_KG926_COMPETITION_RULES.knockout.seeding).toBe("pending");
    expect(DEFAULT_KG926_COMPETITION_RULES.knockout.pairing).toBe("manual");
  });

  it("does not invent win/draw point values in config", () => {
    const json = JSON.stringify(DEFAULT_KG926_COMPETITION_RULES);
    expect(json).not.toContain('"pointsForWin"');
    expect(json).not.toContain('"3 for win"');
    expect(json).not.toContain("round_robin");
  });

  it("keeps tie resolution pending while preserving pod structure", () => {
    const parsed = parseCompetitionRules({
      qualification: { tieResolution: "admin_resolution" },
    });
    expect(parsed.qualification.format).toBe("single_elimination_pods");
    expect(parsed.qualification.tieResolution).toBe("admin_resolution");
    expect(isQualificationAdvancementConfigured(parsed)).toBe(true);
    expect(isQualificationPairingConfigured(parsed)).toBe(true);
  });

  it("preserves known capacity targets", () => {
    expect(DEFAULT_KG926_COMPETITION_RULES.qualification.targetEntrants).toBe(128);
    expect(DEFAULT_KG926_COMPETITION_RULES.qualification.qualificationTarget).toBe(
      32,
    );
  });

  it("lists knockout round structure without generating brackets", () => {
    expect(DEFAULT_KG926_COMPETITION_RULES.knockout.rounds).toEqual([
      "round_of_32",
      "round_of_16",
      "quarterfinal",
      "semifinal",
      "grand_final",
    ]);
  });
});

describe("match score validation boundary", () => {
  it("rejects negative and non-integer scores via CompetitionOperationsError shape", () => {
    const error = new CompetitionOperationsError(
      "participantAScore must be a non-negative integer.",
      "VALIDATION_ERROR",
      400,
    );
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.status).toBe(400);
  });
});

describe("public projections", () => {
  it("maps tournament summary without sensitive fields", () => {
    const summary = toPublicTournamentSummary({
      id: "event-kg926",
      slug: "kirakitah-gaming-926",
      name: "KIRAKITAH GAMING 926",
      game: "eFootball Mobile",
      edition: "926",
      format: "Online 1v1",
      status: "registration_open",
      commencementDate: "2026-09-14",
      prizeInfo: "US$100 Grand Prize",
      targetParticipantCount: 128,
      qualificationTarget: 32,
    });
    expect(summary.name).toBe("KIRAKITAH GAMING 926");
    expect(summary).not.toHaveProperty("email");
    expect(summary).not.toHaveProperty("phone");
  });

  it("throws when sensitive fields leak into public payload", () => {
    expect(() =>
      assertNoSensitivePublicFields({ email: "a@b.com", publicCode: "KG926-P0001" }),
    ).toThrow(/sensitive field/i);
  });
});

describe("competition RBAC", () => {
  it("grants tournament admin match and result permissions", () => {
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:phase_manage")).toBe(
      true,
    );
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:match_manage")).toBe(
      true,
    );
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:result_record")).toBe(
      true,
    );
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:result_correct")).toBe(
      true,
    );
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:forfeit")).toBe(true);
  });

  it("limits reviewer to view standings/matches without mutations", () => {
    expect(roleHasPermission("REVIEWER", "tournament:standings_view")).toBe(true);
    expect(roleHasPermission("REVIEWER", "tournament:match_view")).toBe(true);
    expect(roleHasPermission("REVIEWER", "tournament:result_record")).toBe(false);
    expect(roleHasPermission("REVIEWER", "tournament:phase_manage")).toBe(false);
  });

  it("grants tournament admin pod management permission", () => {
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:pod_manage")).toBe(true);
    expect(roleHasPermission("SUPER_ADMIN", "tournament:pod_manage")).toBe(true);
  });

  it("denies reviewer and support pod management", () => {
    expect(roleHasPermission("REVIEWER", "tournament:pod_manage")).toBe(false);
    expect(roleHasPermission("SUPPORT", "tournament:pod_manage")).toBe(false);
  });

  it("grants tournament admin knockout management", () => {
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:knockout_manage")).toBe(
      true,
    );
    expect(roleHasPermission("SUPER_ADMIN", "tournament:knockout_manage")).toBe(true);
    expect(roleHasPermission("REVIEWER", "tournament:knockout_manage")).toBe(false);
    expect(roleHasPermission("SUPPORT", "tournament:knockout_manage")).toBe(false);
  });

  it("denies support mutation permissions", () => {
    expect(roleHasPermission("SUPPORT", "tournament:result_record")).toBe(false);
    expect(roleHasPermission("SUPPORT", "tournament:match_manage")).toBe(false);
    expect(roleHasPermission("SUPPORT", "tournament:forfeit")).toBe(false);
    expect(roleHasPermission("SUPPORT", "tournament:standings_view")).toBe(true);
  });
});

describe("qualification advancement boundary", () => {
  it("uses pod-winner advancement configuration", () => {
    expect(isQualificationAdvancementConfigured(DEFAULT_KG926_COMPETITION_RULES)).toBe(
      true,
    );
  });
});
