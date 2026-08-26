import { describe, expect, it } from "vitest";
import {
  calculateCompletionPercent,
  getMissingRequiredFields,
  getRequiredFieldCount,
  isProfileComplete,
} from "@/server/participant/profile/completion";

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

describe("calculateCompletionPercent", () => {
  it("returns 0 for empty profile", () => {
    expect(calculateCompletionPercent({})).toBe(0);
  });

  it("returns 100 for a complete adult profile", () => {
    expect(calculateCompletionPercent(completeBase)).toBe(100);
    expect(isProfileComplete(completeBase)).toBe(true);
  });

  it("requires guardian for minors", () => {
    const minor = {
      ...completeBase,
      dateOfBirth: "2012-03-10",
      guardian: null,
    };
    expect(getRequiredFieldCount(minor.dateOfBirth)).toBe(
      getRequiredFieldCount(completeBase.dateOfBirth) + 1,
    );
    expect(getMissingRequiredFields(minor)).toContain("guardian");
    expect(isProfileComplete(minor)).toBe(false);

    const withGuardian = {
      ...minor,
      guardian: {
        fullName: "Parent",
        relationship: "Mother",
        email: "parent@example.com",
        phone: "+2348111111111",
        consentAt: new Date().toISOString(),
      },
    };
    expect(isProfileComplete(withGuardian)).toBe(true);
    expect(calculateCompletionPercent(withGuardian)).toBe(100);
  });

  it("marks under-minimum age as missing dateOfBirth", () => {
    const tooYoung = {
      ...completeBase,
      dateOfBirth: "2020-01-01",
    };
    expect(getMissingRequiredFields(tooYoung)).toContain("dateOfBirth");
  });
});
