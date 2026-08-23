import { describe, expect, it } from "vitest";
import { generateReferenceId } from "@/server/registration/reference-id";
import {
  decryptSensitiveValue,
  encryptSensitiveValue,
  hashSensitiveValue,
} from "@/server/registration/pii";

const TEST_KEY = "a".repeat(64);

describe("registration reference id", () => {
  it("generates KG926-prefixed reference ids", () => {
    expect(generateReferenceId(new Date("2026-09-01T00:00:00.000Z"))).toMatch(
      /^KG926-2026-[A-F0-9]{6}$/,
    );
  });
});

describe("registration pii", () => {
  it("hashes and encrypts identification numbers", () => {
    const hash = hashSensitiveValue("12345678901", TEST_KEY);
    expect(hash).toHaveLength(64);

    const encrypted = encryptSensitiveValue("12345678901", TEST_KEY);
    expect(decryptSensitiveValue(encrypted, TEST_KEY)).toBe("12345678901");
  });
});
