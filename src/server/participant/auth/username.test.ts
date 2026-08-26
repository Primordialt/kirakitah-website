import { describe, expect, it } from "vitest";
import {
  normalizeUsername,
  validateUsername,
} from "@/server/participant/auth/username";

describe("validateUsername", () => {
  it("accepts valid usernames", () => {
    expect(validateUsername("player_one")).toBeUndefined();
    expect(validateUsername("ABC123")).toBeUndefined();
  });

  it("rejects short or long usernames", () => {
    expect(validateUsername("ab")).toMatch(/at least 3/i);
    expect(validateUsername("a".repeat(25))).toMatch(/at most 24/i);
  });

  it("rejects invalid characters", () => {
    expect(validateUsername("bad-name")).toMatch(/letters, numbers, and underscores/i);
    expect(validateUsername("has space")).toMatch(/letters, numbers, and underscores/i);
  });

  it("rejects reserved usernames", () => {
    expect(validateUsername("admin")).toMatch(/reserved/i);
    expect(validateUsername("Dashboard")).toMatch(/reserved/i);
  });
});

describe("normalizeUsername", () => {
  it("lowercases and trims", () => {
    expect(normalizeUsername("  Player_One  ")).toBe("player_one");
  });
});
