import { describe, expect, it } from "vitest";
import {
  HTTP_ADMIN_AUTH_IMPLEMENTED,
  evaluateLaunchReadiness,
} from "@/server/registration/launch-readiness";

describe("launch readiness gate", () => {
  it("keeps HTTP admin auth unimplemented until a real provider exists", () => {
    expect(HTTP_ADMIN_AUTH_IMPLEMENTED).toBe(false);
  });

  it("does not report REGISTRATION_READY without production infrastructure", async () => {
    const report = await evaluateLaunchReadiness();
    expect(report.gate).toBe("REGISTRATION_NOT_READY");
    expect(report.identityVerificationMode).toBe("manual");
    expect(report.blockers.length).toBeGreaterThan(0);

    const admin = report.checks.find((check) => check.id === "ADMIN_AUTH");
    expect(admin?.status).toBe("NOT_CONFIGURED");

    const capacity = report.checks.find((check) => check.id === "CAPACITY_POLICY");
    expect(capacity?.status).toBe("PENDING_PRODUCT_DECISION");
  });
});
