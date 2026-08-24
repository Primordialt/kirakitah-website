import { describe, expect, it } from "vitest";
import {
  HTTP_ADMIN_AUTH_IMPLEMENTED,
  evaluateLaunchReadiness,
} from "@/server/registration/launch-readiness";
import { registrationPolicy } from "@/config/registration-policy";

describe("launch readiness gate — MVP", () => {
  it("keeps HTTP admin auth unimplemented until a real provider exists", () => {
    expect(HTTP_ADMIN_AUTH_IMPLEMENTED).toBe(false);
  });

  it("reports MVP mode and does not claim full production ready without infra", async () => {
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
    expect(admin?.status).toBe("DEFERRED");
    expect(admin?.requiredForMvp).toBe(false);
  });

  it("requires database/blob/encryption for MVP readiness (not fake-ready)", async () => {
    const report = await evaluateLaunchReadiness();
    // Without production secrets in this environment, MVP gate stays NOT_READY.
    if (!report.applicationsReceivable) {
      expect(report.gate).toBe("REGISTRATION_NOT_READY");
      expect(report.blockers.length).toBeGreaterThan(0);
    } else {
      expect(report.gate).toBe("MVP_REGISTRATION_READY");
    }
  });
});
