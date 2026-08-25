import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  roleHasPermission,
  assertPermission,
  AdminAuthorizationError,
} from "@/server/admin/authorization/permissions";
import { AdminUserManagementError } from "@/server/admin/users/service";
import {
  hashAdminPassword,
  validateAdminPassword,
} from "@/server/admin/auth/password";

describe("admin:manage permission matrix", () => {
  it("grants admin:manage only to SUPER_ADMIN", () => {
    expect(roleHasPermission("SUPER_ADMIN", "admin:manage")).toBe(true);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "admin:manage")).toBe(false);
    expect(roleHasPermission("REVIEWER", "admin:manage")).toBe(false);
    expect(roleHasPermission("SUPPORT", "admin:manage")).toBe(false);
    expect(() => assertPermission("REVIEWER", "admin:manage")).toThrow(
      AdminAuthorizationError,
    );
  });

  it("lets REVIEWER update application status without participant selection", () => {
    expect(roleHasPermission("REVIEWER", "applications:status")).toBe(true);
    expect(roleHasPermission("REVIEWER", "identity:review")).toBe(true);
    expect(roleHasPermission("REVIEWER", "social:review")).toBe(true);
    expect(roleHasPermission("REVIEWER", "tournament:eligibility")).toBe(true);
    expect(roleHasPermission("REVIEWER", "tournament:participant_select")).toBe(
      false,
    );
  });

  it("keeps SUPPORT restricted from reviews and admin management", () => {
    expect(roleHasPermission("SUPPORT", "identity:review")).toBe(false);
    expect(roleHasPermission("SUPPORT", "social:review")).toBe(false);
    expect(roleHasPermission("SUPPORT", "applications:status")).toBe(false);
    expect(roleHasPermission("SUPPORT", "admin:manage")).toBe(false);
  });
});

describe("admin password handling for provisioning", () => {
  it("rejects weak or short passwords", () => {
    expect(validateAdminPassword("short")).toMatch(/at least 12/i);
    expect(validateAdminPassword("password1234")).toMatch(/too common/i);
  });

  it("hashes passwords without returning plaintext", async () => {
    const password = "StrongAdminPass!99";
    const hash = await hashAdminPassword(password);
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash).not.toContain(password);
  });
});

describe("AdminUserManagementError", () => {
  it("carries conflict status for last SUPER_ADMIN protection messages", () => {
    const error = new AdminUserManagementError(
      "Cannot deactivate the last active SUPER_ADMIN.",
      "CONFLICT",
      409,
    );
    expect(error.status).toBe(409);
    expect(error.code).toBe("CONFLICT");
  });
});

vi.mock("@/server/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/server/admin/audit/record", () => ({
  recordAdminAuditEvent: vi.fn(async () => undefined),
}));

describe("admin user service last SUPER_ADMIN protection", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("blocks deactivating the last active SUPER_ADMIN", async () => {
    const { getDb } = await import("@/server/db");
    const mockDb = {
      select: vi.fn(),
      update: vi.fn(),
    };

    // getAdminUserById
    mockDb.select
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: "sa-1",
                email: "super@example.com",
                displayName: "Super",
                role: "SUPER_ADMIN",
                active: true,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
                lastLoginAt: null,
              },
            ],
          }),
        }),
      })
      // countActiveSuperAdmins excluding self → 0
      .mockReturnValueOnce({
        from: () => ({
          where: async () => [{ value: 0 }],
        }),
      });

    vi.mocked(getDb).mockReturnValue(mockDb as never);

    const { setAdminUserActive } = await import(
      "@/server/admin/users/service"
    );

    await expect(
      setAdminUserActive({
        actorId: "actor",
        actorRole: "SUPER_ADMIN",
        targetId: "sa-1",
        active: false,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/last active SUPER_ADMIN/i),
    });
  });

  it("blocks downgrading the last active SUPER_ADMIN", async () => {
    const { getDb } = await import("@/server/db");
    const mockDb = {
      select: vi.fn(),
      update: vi.fn(),
    };

    mockDb.select
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: "sa-1",
                email: "super@example.com",
                displayName: "Super",
                role: "SUPER_ADMIN",
                active: true,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
                lastLoginAt: null,
              },
            ],
          }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: async () => [{ value: 0 }],
        }),
      });

    vi.mocked(getDb).mockReturnValue(mockDb as never);

    const { updateAdminUserRole } = await import(
      "@/server/admin/users/service"
    );

    await expect(
      updateAdminUserRole({
        actorId: "actor",
        actorRole: "SUPER_ADMIN",
        targetId: "sa-1",
        role: "REVIEWER",
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/last active SUPER_ADMIN/i),
    });
  });
});
