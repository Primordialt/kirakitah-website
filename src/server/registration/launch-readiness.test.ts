import { describe, expect, it } from "vitest";
import {
  DATABASE_ADMIN_AUTH_IMPLEMENTED,
  HTTP_ADMIN_AUTH_IMPLEMENTED,
  evaluateLaunchReadiness,
} from "@/server/registration/launch-readiness";
import { registrationPolicy } from "@/config/registration-policy";

describe("launch readiness gate — MVP", () => {
  it("keeps HTTP/OIDC admin stub unimplemented while database auth is enabled", () => {
    expect(HTTP_ADMIN_AUTH_IMPLEMENTED).toBe(false);
    expect(DATABASE_ADMIN_AUTH_IMPLEMENTED).toBe(true);
  });

  it("reports MVP mode and does not claim full production ready without contact providers", async () => {
    const report = await evaluateLaunchReadiness();
    expect(registrationPolicy.isMvpManualReview).toBe(true);
    expect(report.operatingMode).toBe("MVP_MANUAL_REVIEW");
    expect(report.contactVerification).toBe("DEFERRED");
    expect(report.identityVerificationMode).toBe("manual");
    expect(report.fullProductionVerificationOperational).toBe(false);
    expect(report.gate).not.toBe("REGISTRATION_READY");

    const email = report.checks.find((check) => check.id === "EMAIL_PROVIDER");
    expect(email?.status).toBe("DEFERRED");
    expect(email?.requiredForMvp).toBe(false);

    const sms = report.checks.find((check) => check.id === "SMS_PROVIDER");
    expect(sms?.status).toBe("DEFERRED");

    const admin = report.checks.find((check) => check.id === "ADMIN_AUTH");
    expect(admin?.requiredForMvp).toBe(false);
    expect(["CONFIGURED", "NOT_CONFIGURED"]).toContain(admin?.status);
  });

  it("requires database/blob/encryption for MVP readiness (not fake-ready)", async () => {
    const report = await evaluateLaunchReadiness();
    if (!report.applicationsReceivable) {
      expect(report.gate).toBe("REGISTRATION_NOT_READY");
      expect(report.blockers.length).toBeGreaterThan(0);
    } else {
      expect(report.gate).toBe("MVP_REGISTRATION_READY");
    }
  });
});
