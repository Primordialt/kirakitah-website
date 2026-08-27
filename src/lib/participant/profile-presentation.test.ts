import { describe, expect, it } from "vitest";
import {
  getCompletionSections,
  getMissingRequiredFields,
} from "@/server/participant/profile/completion";
import {
  getApplyGateAction,
  getProfilePresentation,
  getTournamentApplyPresentation,
} from "@/lib/participant/profile-presentation";

const completeBase = {
  firstName: "Ada",
  lastName: "Okoye",
  dateOfBirth: "1995-06-15",
  country: "NG",
  city: "Lagos",
  phone: "+2348000000000",
  identificationType: "nin",
  hasIdentificationNumber: true,
  gamerTag: "AdaEF",
  playerPhotoBlobKey: "participants/1/photo.jpg",
  playerPhotoMeta: {
    fileName: "photo.jpg",
    fileSize: 1024,
    mimeType: "image/jpeg",
  },
  guardian: null,
};

describe("getCompletionSections", () => {
  it("marks all adult sections complete for a full profile", () => {
    const sections = getCompletionSections(completeBase);
    expect(sections.every((section) => section.complete)).toBe(true);
    expect(sections.map((section) => section.id)).not.toContain("guardian");
  });

  it("includes guardian section for minors and lists missing guardian", () => {
    const sections = getCompletionSections({
      ...completeBase,
      dateOfBirth: "2012-03-10",
      guardian: null,
    });
    const guardian = sections.find((section) => section.id === "guardian");
    expect(guardian).toBeDefined();
    expect(guardian?.complete).toBe(false);
    expect(getMissingRequiredFields({
      ...completeBase,
      dateOfBirth: "2012-03-10",
      guardian: null,
    })).toContain("guardian");
  });

  it("flags incomplete identity when identification number is missing", () => {
    const sections = getCompletionSections({
      ...completeBase,
      hasIdentificationNumber: false,
    });
    const identity = sections.find((section) => section.id === "identity");
    expect(identity?.complete).toBe(false);
    expect(identity?.missingFields).toContain("identificationNumber");
  });
});

describe("profile presentation", () => {
  it("distinguishes incomplete from ready-to-submit", () => {
    expect(getProfilePresentation("incomplete", 50).verificationLabel).toBe(
      "INCOMPLETE",
    );
    expect(getProfilePresentation("incomplete", 100).verificationLabel).toBe(
      "READY TO SUBMIT",
    );
    expect(getProfilePresentation("verified", 100).buttonLabel).toBe(
      "EXPLORE TOURNAMENTS",
    );
  });

  it("maps tournament apply CTAs by profile status", () => {
    expect(
      getTournamentApplyPresentation("incomplete", 20, false).buttonLabel,
    ).toBe("COMPLETE PROFILE");
    expect(
      getTournamentApplyPresentation("submitted_for_review", 100, false)
        .buttonLabel,
    ).toBe("PROFILE UNDER REVIEW");
    expect(
      getTournamentApplyPresentation("needs_correction", 100, false)
        .buttonLabel,
    ).toBe("UPDATE PROFILE");
    expect(
      getTournamentApplyPresentation("verified", 100, false).buttonLabel,
    ).toBe("APPLY FOR TOURNAMENT");
  });

  it("maps gate codes to profile actions", () => {
    expect(getApplyGateAction("PROFILE_NOT_VERIFIED").buttonLabel).toBe(
      "VIEW PROFILE",
    );
    expect(getApplyGateAction("PROFILE_REQUIRES_CORRECTION").buttonLabel).toBe(
      "UPDATE PROFILE",
    );
  });
});
