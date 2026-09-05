import { describe, expect, it } from "vitest";
import {
  normalizeIdentificationNumber,
  validateGovernmentIdType,
  validateIdentificationNumber,
} from "@/lib/identification";
import {
  calculateCompletionPercent,
  getMissingRequiredFields,
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

describe("other government-issued ID", () => {
  it("validates government ID type and number", () => {
    expect(validateGovernmentIdType("Driver's Licence")).toBeUndefined();
    expect(validateGovernmentIdType("")).toBe("Government ID type is required");
    expect(
      validateIdentificationNumber("other_government_id", "ABC12345"),
    ).toBeUndefined();
    expect(validateIdentificationNumber("other_government_id", "AB")).toBe(
      "Government ID number must be at least 3 characters",
    );
  });

  it("requires government ID type and number for profile completion", () => {
    const incompleteOther = {
      ...completeBase,
      identificationType: "other_government_id",
      governmentIdType: null,
      hasIdentificationNumber: false,
    };
    expect(getMissingRequiredFields(incompleteOther)).toEqual(
      expect.arrayContaining(["governmentIdType", "identificationNumber"]),
    );
    expect(isProfileComplete(incompleteOther)).toBe(false);

    const completeOther = {
      ...incompleteOther,
      governmentIdType: "Permanent Voter's Card",
      hasIdentificationNumber: true,
    };
    expect(isProfileComplete(completeOther)).toBe(true);
    expect(calculateCompletionPercent(completeOther)).toBe(100);
  });

  it("keeps existing NIN and passport profiles valid", () => {
    expect(isProfileComplete(completeBase)).toBe(true);

    const passportProfile = {
      ...completeBase,
      identificationType: "passport",
    };
    expect(isProfileComplete(passportProfile)).toBe(true);
    expect(
      validateIdentificationNumber(
        "passport",
        normalizeIdentificationNumber("passport", "ab123456"),
      ),
    ).toBeUndefined();
  });
});
