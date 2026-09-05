import { describe, expect, it } from "vitest";
import {
  roleHasPermission,
} from "@/server/admin/authorization/permissions";
import { getProfileApplicationBlock } from "@/server/participant/application-gate";
import { PROFILE_REOPENED_PARTICIPANT_MESSAGE } from "@/lib/participant/profile-verification";
import { getProfilePresentation } from "@/lib/participant/profile-presentation";
import { getNotificationPresentation } from "@/lib/participant/tournament-status";

describe("profile verification RBAC and gates", () => {
  it("allows only SUPER_ADMIN to reopen verified profiles", () => {
    expect(roleHasPermission("SUPER_ADMIN", "profile:reopen_verified")).toBe(true);
    expect(roleHasPermission("REVIEWER", "profile:reopen_verified")).toBe(false);
    expect(roleHasPermission("SUPPORT", "profile:reopen_verified")).toBe(false);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "profile:reopen_verified")).toBe(
      false,
    );
  });

  it("blocks tournament apply after profile reopen", () => {
    expect(getProfileApplicationBlock("verified")).toBeNull();
    expect(getProfileApplicationBlock("needs_correction")).toEqual(
      expect.objectContaining({ code: "PROFILE_REQUIRES_CORRECTION" }),
    );
    expect(
      getProfileApplicationBlock("needs_correction", PROFILE_REOPENED_PARTICIPANT_MESSAGE),
    ).toEqual(
      expect.objectContaining({ code: "PROFILE_REQUIRES_CORRECTION" }),
    );
  });

  it("presents reopened profile status to participants", () => {
    const presentation = getProfilePresentation(
      "needs_correction",
      100,
      PROFILE_REOPENED_PARTICIPANT_MESSAGE,
    );
    expect(presentation.verificationLabel).toBe("PROFILE REQUIRES REVIEW");
    expect(presentation.buttonLabel).toBe("REVIEW PROFILE");

    const notification = getNotificationPresentation("PARTICIPANT_PROFILE_REOPENED");
    expect(notification.title).toBe("Profile verification updated");
    expect(notification.href).toBe("/profile");
  });
});
