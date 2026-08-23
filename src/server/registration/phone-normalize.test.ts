import {
  isValidNormalizedPhone,
  normalizePhoneForUniqueness,
} from "@/server/registration/phone-normalize";
import { describe, expect, it } from "vitest";

describe("normalizePhoneForUniqueness", () => {
  it("strips formatting without inventing country codes", () => {
    expect(normalizePhoneForUniqueness("0801 234 5678")).toBe("08012345678");
    expect(normalizePhoneForUniqueness("+234-801-234-5678")).toBe("2348012345678");
  });

  it("validates digit length bounds", () => {
    expect(isValidNormalizedPhone("08012345678")).toBe(true);
    expect(isValidNormalizedPhone("123")).toBe(false);
  });
});
