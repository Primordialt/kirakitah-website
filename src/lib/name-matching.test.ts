import { namesMatch, normalizePersonName } from "@/lib/name-matching";
import { describe, expect, it } from "vitest";

describe("name-matching", () => {
  it("normalizes names", () => {
    expect(normalizePersonName("  Chidi  Okafor  ")).toBe("chidi okafor");
  });

  it("matches identical names", () => {
    expect(namesMatch("Chidi Okafor", "Chidi Okafor")).toBe(true);
  });

  it("matches reordered names", () => {
    expect(namesMatch("Okafor Chidi", "Chidi Okafor")).toBe(true);
  });

  it("matches when applicant omits middle name", () => {
    expect(namesMatch("Chidi Okafor", "Chidi Emeka Okafor")).toBe(true);
  });

  it("rejects clearly different names", () => {
    expect(namesMatch("Chidi Okafor", "Ada Bello")).toBe(false);
  });
});
