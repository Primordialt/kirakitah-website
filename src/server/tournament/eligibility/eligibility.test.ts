import { describe, expect, it } from "vitest";
import {
  evaluateWithConfig,
  resolveRegistrationWindow,
} from "@/server/tournament/eligibility/eligibility-service";
import { DEFAULT_KG926_ELIGIBILITY_RULES } from "@/server/tournament/eligibility/eligibility-rules";
import { KG926_ELIGIBILITY_RULES_VERSION } from "@/server/tournament/eligibility/eligibility-types";
import { roleHasPermission } from "@/server/admin/authorization/permissions";

const baseApplication = {
  id: "app-1",
  referenceId: "KG926-2026-ABCDEF",
  dateOfBirth: "2010-05-01",
  status: "verified" as const,
  identityVerificationStatus: "verified",
  emailVerificationStatus: "verified",
  phoneVerificationStatus: "verified",
};

const baseInput = {
  tournamentId: "event-kg926",
  application: baseApplication,
  guardian: { consentAt: "2026-01-01T00:00:00.000Z" },
  existingParticipant: null,
  config: DEFAULT_KG926_ELIGIBILITY_RULES,
  rulesVersion: KG926_ELIGIBILITY_RULES_VERSION,
  registrationWindow: "open" as const,
};

describe("registration window", () => {
  it("returns closed when tournament status is not registration_open", () => {
    expect(
      resolveRegistrationWindow({
        status: "registration_closed",
        registrationStart: null,
        registrationDeadline: null,
      }),
    ).toBe("closed");
  });

  it("returns not_yet_open before registration start", () => {
    expect(
      resolveRegistrationWindow({
        status: "registration_open",
        registrationStart: "2099-01-01T00:00:00.000Z",
        registrationDeadline: null,
        now: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ).toBe("not_yet_open");
  });

  it("returns closed after registration deadline", () => {
    expect(
      resolveRegistrationWindow({
        status: "registration_open",
        registrationStart: null,
        registrationDeadline: "2025-01-01T00:00:00.000Z",
        now: new Date("2026-06-01T00:00:00.000Z"),
      }),
    ).toBe("closed");
  });

  it("returns open when within window", () => {
    expect(
      resolveRegistrationWindow({
        status: "registration_open",
        registrationStart: "2026-01-01T00:00:00.000Z",
        registrationDeadline: "2026-12-31T00:00:00.000Z",
        now: new Date("2026-06-01T00:00:00.000Z"),
      }),
    ).toBe("open");
  });
});

describe("eligibility engine", () => {
  it("marks applicant below minimum age ineligible", () => {
    const result = evaluateWithConfig({
      ...baseInput,
      application: {
        ...baseApplication,
        dateOfBirth: "2020-01-01",
      },
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("AGE_BELOW_MINIMUM");
  });

  it("requires guardian information for ages 10–17", () => {
    const result = evaluateWithConfig({
      ...baseInput,
      application: {
        ...baseApplication,
        dateOfBirth: "2012-06-01",
      },
      guardian: null,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("GUARDIAN_INFORMATION_MISSING");
  });

  it("requires guardian consent for minors", () => {
    const result = evaluateWithConfig({
      ...baseInput,
      application: {
        ...baseApplication,
        dateOfBirth: "2012-06-01",
      },
      guardian: { consentAt: "" },
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("GUARDIAN_CONSENT_MISSING");
  });

  it("does not require guardian for adults", () => {
    const result = evaluateWithConfig({
      ...baseInput,
      application: {
        ...baseApplication,
        dateOfBirth: "2000-01-01",
      },
      guardian: null,
    });
    expect(result.reasons).not.toContain("GUARDIAN_INFORMATION_MISSING");
  });

  it("rejects pending identity review", () => {
    const result = evaluateWithConfig({
      ...baseInput,
      application: {
        ...baseApplication,
        identityVerificationStatus: "pending_review",
      },
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("IDENTITY_PENDING");
  });

  it("rejects rejected identity", () => {
    const result = evaluateWithConfig({
      ...baseInput,
      application: {
        ...baseApplication,
        identityVerificationStatus: "rejected",
      },
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("IDENTITY_REJECTED");
  });

  it("passes verified identity", () => {
    const result = evaluateWithConfig({
      ...baseInput,
      application: {
        ...baseApplication,
        identityVerificationStatus: "verified",
      },
    });
    expect(result.reasons).not.toContain("IDENTITY_PENDING");
    expect(result.reasons).not.toContain("IDENTITY_REJECTED");
  });

  it("does not require email when config is false", () => {
    const result = evaluateWithConfig({
      ...baseInput,
      application: {
        ...baseApplication,
        emailVerificationStatus: "pending",
      },
      config: {
        ...DEFAULT_KG926_ELIGIBILITY_RULES,
        emailVerificationRequired: false,
      },
    });
    expect(result.reasons).not.toContain("EMAIL_NOT_VERIFIED");
  });

  it("requires email when config is true", () => {
    const result = evaluateWithConfig({
      ...baseInput,
      application: {
        ...baseApplication,
        emailVerificationStatus: "pending",
      },
      config: {
        ...DEFAULT_KG926_ELIGIBILITY_RULES,
        emailVerificationRequired: true,
      },
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("EMAIL_NOT_VERIFIED");
  });

  it("does not require phone when config is false", () => {
    const result = evaluateWithConfig({
      ...baseInput,
      application: {
        ...baseApplication,
        phoneVerificationStatus: "pending",
      },
      config: {
        ...DEFAULT_KG926_ELIGIBILITY_RULES,
        phoneVerificationRequired: false,
      },
    });
    expect(result.reasons).not.toContain("PHONE_NOT_VERIFIED");
  });

  it("requires phone when config is true", () => {
    const result = evaluateWithConfig({
      ...baseInput,
      application: {
        ...baseApplication,
        phoneVerificationStatus: "pending",
      },
      config: {
        ...DEFAULT_KG926_ELIGIBILITY_RULES,
        phoneVerificationRequired: true,
      },
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("PHONE_NOT_VERIFIED");
  });

  it("rejects non-approved application status", () => {
    const result = evaluateWithConfig({
      ...baseInput,
      application: {
        ...baseApplication,
        status: "under_review",
      },
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain("APPLICATION_NOT_APPROVED");
  });

  it("rejects rejected applications", () => {
    const result = evaluateWithConfig({
      ...baseInput,
      application: {
        ...baseApplication,
        status: "rejected",
      },
    });
    expect(result.reasons).toContain("APPLICATION_REJECTED");
  });

  it("rejects withdrawn applications", () => {
    const result = evaluateWithConfig({
      ...baseInput,
      application: {
        ...baseApplication,
        status: "withdrawn",
      },
    });
    expect(result.reasons).toContain("APPLICATION_WITHDRAWN");
  });

  it("rejects when registration window is closed", () => {
    const result = evaluateWithConfig({
      ...baseInput,
      registrationWindow: "closed",
    });
    expect(result.reasons).toContain("TOURNAMENT_REGISTRATION_CLOSED");
  });

  it("rejects when registration is not yet open", () => {
    const result = evaluateWithConfig({
      ...baseInput,
      registrationWindow: "not_yet_open",
    });
    expect(result.reasons).toContain("TOURNAMENT_REGISTRATION_NOT_OPEN");
  });

  it("flags already selected participants", () => {
    const result = evaluateWithConfig({
      ...baseInput,
      existingParticipant: { status: "selected" },
    });
    expect(result.reasons).toContain("ALREADY_SELECTED");
  });

  it("includes rules version in evaluation result", () => {
    const result = evaluateWithConfig(baseInput);
    expect(result.rulesVersion).toBe(KG926_ELIGIBILITY_RULES_VERSION);
  });

  it("returns eligible when all requirements pass", () => {
    const result = evaluateWithConfig(baseInput);
    expect(result.eligible).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });
});

describe("tournament admin permissions", () => {
  it("grants tournament admin full tournament permissions", () => {
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:view")).toBe(true);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:eligibility")).toBe(
      true,
    );
    expect(
      roleHasPermission("TOURNAMENT_ADMIN", "tournament:participant_select"),
    ).toBe(true);
    expect(
      roleHasPermission("TOURNAMENT_ADMIN", "tournament:participant_withdraw"),
    ).toBe(true);
    expect(
      roleHasPermission("TOURNAMENT_ADMIN", "tournament:participant_disqualify"),
    ).toBe(true);
  });

  it("limits reviewer to view and eligibility only", () => {
    expect(roleHasPermission("REVIEWER", "tournament:view")).toBe(true);
    expect(roleHasPermission("REVIEWER", "tournament:eligibility")).toBe(true);
    expect(roleHasPermission("REVIEWER", "tournament:participant_select")).toBe(
      false,
    );
  });

  it("denies support tournament mutation permissions", () => {
    expect(roleHasPermission("SUPPORT", "tournament:view")).toBe(false);
    expect(roleHasPermission("SUPPORT", "tournament:eligibility")).toBe(false);
    expect(roleHasPermission("SUPPORT", "tournament:participant_select")).toBe(
      false,
    );
  });
});

describe("eligibility rules version", () => {
  it("uses kg926-v1 as current version constant", () => {
    expect(KG926_ELIGIBILITY_RULES_VERSION).toBe("kg926-v1");
  });
});
