import { describe, expect, it, afterEach, vi } from "vitest";
import {
  roleHasPermission,
  assertPermission,
  AdminAuthorizationError,
} from "@/server/admin/authorization/permissions";
import {
  canTransitionApplicationStatus,
  canTransitionIdentityReview,
} from "@/server/admin/registration/transitions";
import {
  maskIdentificationNumber,
  sanitizeReviewNotes,
} from "@/server/admin/registration/projections";
import {
  createSessionToken,
  verifySessionToken,
} from "@/server/admin/auth/session";

describe("admin permissions", () => {
  it("grants reviewer identity permissions without admin management", () => {
    expect(roleHasPermission("REVIEWER", "identity:review")).toBe(true);
    expect(roleHasPermission("REVIEWER", "identity:reveal")).toBe(true);
    expect(roleHasPermission("REVIEWER", "applications:status")).toBe(true);
    expect(roleHasPermission("REVIEWER", "admin:manage")).toBe(false);
    expect(roleHasPermission("REVIEWER", "tournament:participant_select")).toBe(
      false,
    );
  });

  it("limits support from sensitive identity reveal and review", () => {
    expect(roleHasPermission("SUPPORT", "applications:view")).toBe(true);
    expect(roleHasPermission("SUPPORT", "identity:reveal")).toBe(false);
    expect(roleHasPermission("SUPPORT", "guardian:view")).toBe(false);
    expect(roleHasPermission("SUPPORT", "photo:view")).toBe(false);
    expect(() => assertPermission("SUPPORT", "identity:review")).toThrow(
      AdminAuthorizationError,
    );
  });

  it("gives super admin full permissions", () => {
    expect(roleHasPermission("SUPER_ADMIN", "admin:manage")).toBe(true);
    expect(roleHasPermission("SUPER_ADMIN", "photo:view")).toBe(true);
  });
});

describe("admin status transitions", () => {
  it("allows received → under_review and under_review → verified", () => {
    expect(canTransitionApplicationStatus("received", "under_review")).toBe(true);
    expect(canTransitionApplicationStatus("under_review", "verified")).toBe(true);
    expect(canTransitionApplicationStatus("verified", "received")).toBe(false);
  });

  it("allows identity pending_review → approved/rejected only", () => {
    expect(canTransitionIdentityReview("pending_review", "approved")).toBe(true);
    expect(canTransitionIdentityReview("pending_review", "rejected")).toBe(true);
    expect(canTransitionIdentityReview("verified", "approved")).toBe(false);
  });
});

describe("admin projections", () => {
  it("masks NIN and passport numbers", () => {
    expect(maskIdentificationNumber("nin", "12345678901")).toBe("*******8901");
    expect(maskIdentificationNumber("passport", "A12345678")).toBe("*****5678");
  });

  it("sanitizes review notes and strips HTML", () => {
    expect(sanitizeReviewNotes('<script>alert(1)</script> matched')).toBe(
      "alert(1) matched",
    );
  });
});

describe("admin session tokens", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips a signed session token", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "a".repeat(64));
    vi.stubEnv("NODE_ENV", "test");

    const token = createSessionToken({
      id: "admin-1",
      email: "reviewer@kirakitah.local",
      displayName: "Reviewer",
      role: "REVIEWER",
      active: true,
    });

    const session = verifySessionToken(token);
    expect(session?.user.role).toBe("REVIEWER");
    expect(session?.user.email).toBe("reviewer@kirakitah.local");
  });

  it("rejects tampered tokens", () => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "a".repeat(64));
    const token = createSessionToken({
      id: "admin-1",
      email: "reviewer@kirakitah.local",
      displayName: "Reviewer",
      role: "REVIEWER",
      active: true,
    });
    const tampered = `${token.slice(0, -4)}aaaa`;
    expect(verifySessionToken(tampered)).toBeNull();
  });
});

describe("admin auth provider resolution", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("allows mock auth outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ADMIN_AUTH_PROVIDER", "mock");
    const { resetAdminAuthProviderForTests, getAdminAuthProvider } =
      await import("@/server/admin/auth/providers");
    resetAdminAuthProviderForTests();
    expect(getAdminAuthProvider().providerId).toBe("mock");
  });

  it("rejects mock auth in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("ADMIN_AUTH_PROVIDER", "mock");
    const { resetAdminAuthProviderForTests, getAdminAuthProvider } =
      await import("@/server/admin/auth/providers");
    resetAdminAuthProviderForTests();
    expect(getAdminAuthProvider().providerId).toBe("unavailable");
  });

  it("defaults to database auth in production when DATABASE_URL is present", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@ep-example.neon.tech/neondb");
    vi.stubEnv("ADMIN_AUTH_PROVIDER", "");
    const { resetAdminAuthProviderForTests, getAdminAuthProvider } =
      await import("@/server/admin/auth/providers");
    resetAdminAuthProviderForTests();
    expect(getAdminAuthProvider().providerId).toBe("database");
  });
});
