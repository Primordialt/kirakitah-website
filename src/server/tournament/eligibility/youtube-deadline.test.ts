import { describe, expect, it } from "vitest";
import { DEFAULT_KG926_ELIGIBILITY_RULES } from "@/server/tournament/eligibility/eligibility-rules";
import { evaluateParticipationEligibility } from "@/server/tournament/eligibility/participation-eligibility";
import {
  isYouTubeOnlySocialGap,
  resolveYouTubeVerificationDeadlineState,
} from "@/server/tournament/eligibility/youtube-deadline";
import { parseLocalDateTimeInTimezone } from "@/server/tournament/scheduling/timezone";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { updateYouTubeVerificationDeadline } from "@/server/tournament/eligibility/eligibility-config-service";

const verifiedPlatforms = {
  x: "verified",
  instagram: "verified",
  tiktok: "verified",
  youtube: "pending",
};

const baseConfig = {
  ...DEFAULT_KG926_ELIGIBILITY_RULES,
  youtubeVerificationDeadline: null,
};

describe("resolveYouTubeVerificationDeadlineState", () => {
  it("returns unset when deadline is null", () => {
    expect(resolveYouTubeVerificationDeadlineState(null)).toBe("unset");
  });

  it("uses Africa/Lagos parsed instants for before/after checks", () => {
    const deadline = parseLocalDateTimeInTimezone({
      date: "2026-10-01",
      time: "18:00",
      timezone: "Africa/Lagos",
    });
    expect(
      resolveYouTubeVerificationDeadlineState(
        deadline,
        new Date("2026-10-01T16:59:00.000Z"),
      ),
    ).toBe("pending");
    expect(
      resolveYouTubeVerificationDeadlineState(
        deadline,
        new Date("2026-10-01T17:01:00.000Z"),
      ),
    ).toBe("passed");
  });
});

describe("isYouTubeOnlySocialGap", () => {
  it("detects when only YouTube is unverified", () => {
    expect(
      isYouTubeOnlySocialGap({
        socialFollowStatus: "pending_review",
        youtubeVerificationStatus: "pending",
        requiredPlatforms: ["x", "instagram", "tiktok", "youtube"],
        platformStatuses: verifiedPlatforms,
      }),
    ).toBe(true);
  });

  it("returns false when another platform is unverified", () => {
    expect(
      isYouTubeOnlySocialGap({
        socialFollowStatus: "pending_review",
        youtubeVerificationStatus: "pending",
        requiredPlatforms: ["x", "instagram", "tiktok", "youtube"],
        platformStatuses: {
          ...verifiedPlatforms,
          tiktok: "pending",
        },
      }),
    ).toBe(false);
  });
});

describe("participation eligibility — deadline unset", () => {
  it("keeps selected participant able to proceed without penalty", () => {
    const result = evaluateParticipationEligibility({
      participantStatus: "selected",
      youtubeVerificationStatus: "pending",
      socialFollowStatus: "pending_review",
      platformStatuses: verifiedPlatforms,
      config: baseConfig,
    });

    expect(result.canProceed).toBe(true);
    expect(result.state).toBe("ACTION_REQUIRED");
    expect(result.graceApplies).toBe(true);
    expect(result.reasons).toEqual([]);
  });
});

describe("participation eligibility — deadline configured, before deadline", () => {
  it("keeps selected participant valid and surfaces action required", () => {
    const deadline = parseLocalDateTimeInTimezone({
      date: "2026-12-31",
      time: "23:59",
      timezone: "Africa/Lagos",
    });

    const result = evaluateParticipationEligibility({
      participantStatus: "selected",
      youtubeVerificationStatus: "pending",
      socialFollowStatus: "pending_review",
      platformStatuses: verifiedPlatforms,
      config: { ...baseConfig, youtubeVerificationDeadline: deadline },
      now: new Date("2026-06-01T12:00:00.000Z"),
    });

    expect(result.canProceed).toBe(true);
    expect(result.state).toBe("ACTION_REQUIRED");
    expect(result.deadlineState).toBe("pending");
    expect(result.reasons).toEqual([]);
  });
});

describe("participation eligibility — deadline passed", () => {
  it("blocks unverified selected participant without deleting selection", () => {
    const deadline = parseLocalDateTimeInTimezone({
      date: "2026-06-01",
      time: "12:00",
      timezone: "Africa/Lagos",
    });

    const result = evaluateParticipationEligibility({
      participantStatus: "selected",
      youtubeVerificationStatus: "pending",
      socialFollowStatus: "pending_review",
      platformStatuses: verifiedPlatforms,
      config: { ...baseConfig, youtubeVerificationDeadline: deadline },
      now: new Date("2026-06-02T12:00:00.000Z"),
    });

    expect(result.canProceed).toBe(false);
    expect(result.state).toBe("BLOCKED");
    expect(result.reasons).toContain("YOUTUBE_VERIFICATION_DEADLINE_PASSED");
  });
});

describe("participation eligibility — verified before deadline", () => {
  it("allows selected participant to proceed", () => {
    const deadline = parseLocalDateTimeInTimezone({
      date: "2026-12-31",
      time: "23:59",
      timezone: "Africa/Lagos",
    });

    const result = evaluateParticipationEligibility({
      participantStatus: "selected",
      youtubeVerificationStatus: "verified",
      socialFollowStatus: "verified",
      platformStatuses: {
        ...verifiedPlatforms,
        youtube: "verified",
      },
      config: { ...baseConfig, youtubeVerificationDeadline: deadline },
      now: new Date("2026-06-01T12:00:00.000Z"),
    });

    expect(result.canProceed).toBe(true);
    expect(result.state).toBe("OK");
    expect(result.reasons).toEqual([]);
  });
});

describe("participation eligibility — verified after deadline", () => {
  it("restores proceed state when YouTube becomes verified", () => {
    const deadline = parseLocalDateTimeInTimezone({
      date: "2026-06-01",
      time: "12:00",
      timezone: "Africa/Lagos",
    });

    const result = evaluateParticipationEligibility({
      participantStatus: "selected",
      youtubeVerificationStatus: "verified",
      socialFollowStatus: "verified",
      platformStatuses: {
        ...verifiedPlatforms,
        youtube: "verified",
      },
      config: { ...baseConfig, youtubeVerificationDeadline: deadline },
      now: new Date("2026-06-02T12:00:00.000Z"),
    });

    expect(result.canProceed).toBe(true);
    expect(result.state).toBe("OK");
  });
});

describe("participation eligibility — non-selected applicants", () => {
  it("does not apply grace to applicants who are not selected", () => {
    const result = evaluateParticipationEligibility({
      participantStatus: null,
      youtubeVerificationStatus: "pending",
      socialFollowStatus: "pending_review",
      platformStatuses: verifiedPlatforms,
      config: baseConfig,
    });

    expect(result.state).toBe("NOT_APPLICABLE");
    expect(result.canProceed).toBe(true);
  });
});

describe("admin RBAC for eligibility config", () => {
  it("allows SUPER_ADMIN to manage eligibility config", () => {
    expect(roleHasPermission("SUPER_ADMIN", "tournament:eligibility_config_manage")).toBe(
      true,
    );
  });

  it("denies TOURNAMENT_ADMIN eligibility config management", () => {
    expect(
      roleHasPermission("TOURNAMENT_ADMIN", "tournament:eligibility_config_manage"),
    ).toBe(false);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:eligibility_config_view")).toBe(
      true,
    );
  });

  it("rejects unauthorized admin deadline updates server-side", async () => {
    await expect(
      updateYouTubeVerificationDeadline({
        tournamentId: "event-kg926",
        reason: "Attempted unauthorized change",
        deadlineDate: "2026-12-31",
        deadlineTime: "23:59",
        actorId: "admin-1",
        actorRole: "TOURNAMENT_ADMIN",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("regression — four-platform requirement unchanged", () => {
  it("still requires YouTube in default KG926 config", () => {
    expect(DEFAULT_KG926_ELIGIBILITY_RULES.requiredSocialPlatforms).toEqual([
      "x",
      "instagram",
      "tiktok",
      "youtube",
    ]);
    expect(DEFAULT_KG926_ELIGIBILITY_RULES.youtubeVerificationDeadline).toBeNull();
  });
});
