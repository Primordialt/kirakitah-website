import { describe, expect, it } from "vitest";
import { roleHasPermission } from "@/server/admin/authorization/permissions";

describe("admin match management RBAC", () => {
  it("grants match_edit to SUPER_ADMIN only", () => {
    expect(roleHasPermission("SUPER_ADMIN", "tournament:match_edit")).toBe(true);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:match_edit")).toBe(
      false,
    );
    expect(roleHasPermission("REVIEWER", "tournament:match_edit")).toBe(false);
    expect(roleHasPermission("SUPPORT", "tournament:match_edit")).toBe(false);
  });

  it("preserves existing match permissions for tournament admin", () => {
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:match_schedule")).toBe(
      true,
    );
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:result_record")).toBe(
      true,
    );
    expect(roleHasPermission("TOURNAMENT_ADMIN", "tournament:match_view")).toBe(true);
  });
});
