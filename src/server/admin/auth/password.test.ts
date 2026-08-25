import { describe, expect, it } from "vitest";
import {
  hashAdminPassword,
  validateAdminPassword,
  verifyAdminPassword,
} from "@/server/admin/auth/password";

describe("admin password hashing", () => {
  it("rejects short and common passwords", () => {
    expect(validateAdminPassword("short")).toMatch(/at least 12/i);
    expect(validateAdminPassword("password1234")).toMatch(/too common/i);
  });

  it("hashes and verifies with scrypt", async () => {
    const password = "correct-horse-battery";
    const hash = await hashAdminPassword(password);
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash).not.toContain(password);
    expect(await verifyAdminPassword(password, hash)).toBe(true);
    expect(await verifyAdminPassword("wrong-password!!", hash)).toBe(false);
  });
});
