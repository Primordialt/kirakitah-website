import {
  normalizeIdentificationNumber,
  validateIdentificationNumber,
} from "@/lib/identification";
import { describe, expect, it } from "vitest";

describe("identification", () => {
  it("normalizes NIN to digits only", () => {
    expect(normalizeIdentificationNumber("nin", "123 4567 8901")).toBe("12345678901");
  });

  it("normalizes passport to uppercase without spaces", () => {
    expect(normalizeIdentificationNumber("passport", "ab 12 cd 34")).toBe("AB12CD34");
  });

  it("validates NIN format", () => {
    expect(validateIdentificationNumber("nin", "12345678901")).toBeUndefined();
    expect(validateIdentificationNumber("nin", "12345")).toBe(
      "NIN must be exactly 11 digits",
    );
  });

  it("validates passport format", () => {
    expect(validateIdentificationNumber("passport", "A1234567")).toBeUndefined();
    expect(validateIdentificationNumber("passport", "ABC")).toBe(
      "Passport number must be 6–20 letters or numbers",
    );
  });
});
