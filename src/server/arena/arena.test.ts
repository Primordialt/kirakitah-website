import { describe, expect, it } from "vitest";
import {
  gradeQuickfire,
  gradeTyperush,
  isValidQuickfireOption,
  normalizeTyperushText,
} from "@/server/arena/validation";
import { roleHasPermission } from "@/server/admin/authorization/permissions";

describe("Quickfire validation", () => {
  it("grades options case-insensitively", () => {
    expect(gradeQuickfire("b", "B")).toBe(true);
    expect(gradeQuickfire("A", "B")).toBe(false);
  });

  it("validates option letters", () => {
    expect(isValidQuickfireOption("C")).toBe(true);
    expect(isValidQuickfireOption("Z")).toBe(false);
  });
});

describe("TypeRush validation", () => {
  it("normalizes whitespace", () => {
    expect(normalizeTyperushText("  hello   world ")).toBe("hello world");
  });

  it("requires exact normalized match", () => {
    const target = "Success is built one disciplined decision at a time.";
    expect(gradeTyperush(target, target)).toBe(true);
    expect(gradeTyperush("success is built", target)).toBe(false);
  });
});

describe("Arena RBAC", () => {
  it("grants SUPER_ADMIN arena management", () => {
    expect(roleHasPermission("SUPER_ADMIN", "arena:manage")).toBe(true);
    expect(roleHasPermission("SUPER_ADMIN", "arena:questions")).toBe(true);
  });

  it("does not grant arena manage to REVIEWER", () => {
    expect(roleHasPermission("REVIEWER", "arena:manage")).toBe(false);
    expect(roleHasPermission("REVIEWER", "arena:view")).toBe(false);
  });

  it("keeps Arena economics on SUPER_ADMIN only", () => {
    expect(roleHasPermission("SUPER_ADMIN", "arena:economics")).toBe(true);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "arena:economics")).toBe(false);
    expect(roleHasPermission("REVIEWER", "arena:economics")).toBe(false);
    expect(roleHasPermission("SUPPORT", "arena:economics")).toBe(false);
  });

  it("grants tournament admin view only", () => {
    expect(roleHasPermission("TOURNAMENT_ADMIN", "arena:view")).toBe(true);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "arena:manage")).toBe(false);
  });
});
