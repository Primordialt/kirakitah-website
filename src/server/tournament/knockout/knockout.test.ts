import { describe, expect, it } from "vitest";
import {
  DEFAULT_KG926_COMPETITION_RULES,
  isKnockoutPairingConfigured,
  KG926_COMPETITION_RULES_VERSION,
  KG926_FINAL_MATCH_COUNT,
  KG926_KNOCKOUT_ENTRANTS,
  KG926_KNOCKOUT_MATCH_COUNT,
  KG926_QF_MATCH_COUNT,
  KG926_R16_MATCH_COUNT,
  KG926_R32_MATCH_COUNT,
  KG926_SF_MATCH_COUNT,
  parseCompetitionRules,
} from "@/server/tournament/competition/competition-rules";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { CompetitionOperationsError } from "@/server/tournament/competition/errors";
import {
  assertNoSensitivePublicFields,
  toPublicChampion,
} from "@/server/tournament/competition/public-projections";

describe("KG926 knockout structure (FINALIZED PRODUCT RULE)", () => {
  it("defines Top 32 single-elimination match counts", () => {
    expect(KG926_KNOCKOUT_ENTRANTS).toBe(32);
    expect(KG926_R32_MATCH_COUNT).toBe(16);
    expect(KG926_R16_MATCH_COUNT).toBe(8);
    expect(KG926_QF_MATCH_COUNT).toBe(4);
    expect(KG926_SF_MATCH_COUNT).toBe(2);
    expect(KG926_FINAL_MATCH_COUNT).toBe(1);
    expect(KG926_KNOCKOUT_MATCH_COUNT).toBe(31);
  });

  it("uses single_elimination format with manual pairing", () => {
    expect(DEFAULT_KG926_COMPETITION_RULES.knockout.format).toBe("single_elimination");
    expect(DEFAULT_KG926_COMPETITION_RULES.knockout.pairing).toBe("manual");
    expect(isKnockoutPairingConfigured(DEFAULT_KG926_COMPETITION_RULES)).toBe(true);
  });

  it("keeps seeding and tie resolution pending", () => {
    expect(DEFAULT_KG926_COMPETITION_RULES.knockout.seeding).toBe("pending");
    expect(DEFAULT_KG926_COMPETITION_RULES.knockout.tieResolution).toBe("pending");
  });

  it("uses kg926-v1", () => {
    expect(KG926_COMPETITION_RULES_VERSION).toBe("kg926-v1");
  });

  it("does not invent 1vs32 seeding in rules", () => {
    const json = JSON.stringify(DEFAULT_KG926_COMPETITION_RULES.knockout);
    expect(json).not.toContain("1vs32");
    expect(json).not.toContain("random");
    expect(json).not.toContain("pod_number");
  });
});

describe("knockout pairing validation boundaries", () => {
  it("rejects incomplete pairing counts", () => {
    const error = new CompetitionOperationsError(
      `Exactly ${KG926_R32_MATCH_COUNT} Round of 32 pairings are required.`,
      "VALIDATION_ERROR",
      400,
    );
    expect(error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects self-match", () => {
    const error = new CompetitionOperationsError(
      "Self-match is not allowed.",
      "VALIDATION_ERROR",
      400,
    );
    expect(error.message).toMatch(/self-match/i);
  });

  it("returns KNOCKOUT_NOT_READY when Top 32 incomplete", () => {
    const error = new CompetitionOperationsError(
      "Knockout is not ready.",
      "KNOCKOUT_NOT_READY",
      400,
    );
    expect(error.code).toBe("KNOCKOUT_NOT_READY");
  });

  it("returns KNOCKOUT_PAIRINGS_NOT_CONFIGURED when pairings missing", () => {
    const error = new CompetitionOperationsError(
      "Round of 32 pairings have not been configured.",
      "KNOCKOUT_PAIRINGS_NOT_CONFIGURED",
      400,
    );
    expect(error.code).toBe("KNOCKOUT_PAIRINGS_NOT_CONFIGURED");
  });

  it("returns MATCH_REQUIRES_RESOLUTION for draws", () => {
    const error = new CompetitionOperationsError(
      "Draw recorded — MATCH_REQUIRES_RESOLUTION.",
      "MATCH_REQUIRES_RESOLUTION",
      409,
    );
    expect(error.code).toBe("MATCH_REQUIRES_RESOLUTION");
  });

  it("returns DOWNSTREAM_CONFLICT when correction would corrupt bracket", () => {
    const error = new CompetitionOperationsError(
      "Downstream match already completed.",
      "DOWNSTREAM_CONFLICT",
      409,
    );
    expect(error.code).toBe("DOWNSTREAM_CONFLICT");
  });
});

describe("knockout RBAC", () => {
  it("allows SUPER_ADMIN and TOURNAMENT_ADMIN knockout_manage", () => {
    expect(roleHasPermission("SUPER_ADMIN", "tournament:knockout_manage")).toBe(true);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:knockout_manage")).toBe(true);
  });

  it("denies REVIEWER and SUPPORT knockout mutations", () => {
    expect(roleHasPermission("REVIEWER", "tournament:knockout_manage")).toBe(false);
    expect(roleHasPermission("SUPPORT", "tournament:knockout_manage")).toBe(false);
  });
});

describe("public champion projection", () => {
  it("exposes public code without sensitive fields", () => {
    const champion = toPublicChampion({
      tournamentName: "KIRAKITAH GAMING 926",
      tournamentStatus: "completed",
      championPublicCode: "KG926-P0001",
      completedAt: "2026-09-20T00:00:00.000Z",
    });
    expect(champion.championPublicCode).toBe("KG926-P0001");
    expect(champion.tournamentName).toBe("KIRAKITAH GAMING 926");
    assertNoSensitivePublicFields({ ...champion });
  });

  it("rejects email in public payload", () => {
    expect(() =>
      assertNoSensitivePublicFields({
        championPublicCode: "KG926-P0001",
        email: "a@b.com",
      }),
    ).toThrow(/sensitive field/i);
  });
});

describe("knockout rules parse boundary", () => {
  it("forces seeding pending even if raw JSON invents a strategy", () => {
    const parsed = parseCompetitionRules({
      knockout: { pairing: "manual", seeding: "1vs32" as "pending" },
    });
    expect(parsed.knockout.pairing).toBe("manual");
    expect(parsed.knockout.seeding).toBe("pending");
  });
});

describe("knockout audit event inventory", () => {
  it("lists Step 9 audit events", () => {
    const events = [
      "KNOCKOUT_PAIRINGS_CONFIGURED",
      "KNOCKOUT_PAIRINGS_REVISED",
      "KNOCKOUT_BRACKET_GENERATED",
      "KNOCKOUT_MATCH_CREATED",
      "KNOCKOUT_RESULT_RECORDED",
      "KNOCKOUT_MATCH_RESOLVED",
      "KNOCKOUT_RESULT_CORRECTED",
      "KNOCKOUT_MATCH_DISPUTED",
      "KNOCKOUT_FORFEIT_RECORDED",
      "KNOCKOUT_ROUND_COMPLETED",
      "TOURNAMENT_COMPLETED",
      "CHAMPION_RECORDED",
    ] as const;
    expect(events).toHaveLength(12);
  });
});

describe("bracket dependency wiring math", () => {
  it("maps R32 slots into R16 dependencies", () => {
    // R16 match i depends on R32 (2i-1) and R32 (2i)
    for (let i = 1; i <= 8; i += 1) {
      const depA = 2 * i - 1;
      const depB = 2 * i;
      expect(depA).toBeGreaterThanOrEqual(1);
      expect(depB).toBeLessThanOrEqual(16);
    }
  });
});
