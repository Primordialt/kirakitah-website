import { describe, expect, it } from "vitest";
import { randomInt } from "crypto";
import {
  VERIFICATION_CHALLENGE_TTL_MINUTES,
  VERIFICATION_MAX_ATTEMPTS,
  VERIFICATION_OTP_MAX,
  VERIFICATION_OTP_MIN,
  VERIFICATION_RESEND_COOLDOWN_SECONDS,
} from "@/server/verification/constants";
import {
  buildEmailVerificationTemplate,
  buildPhoneVerificationSms,
} from "@/server/verification/templates/contact-verification";
import { hashSensitiveValue } from "@/server/registration/pii";

const TEST_KEY = "b".repeat(64);

describe("verification constants", () => {
  it("uses approved TTL, attempts, and cooldown values", () => {
    expect(VERIFICATION_CHALLENGE_TTL_MINUTES).toBe(15);
    expect(VERIFICATION_MAX_ATTEMPTS).toBe(5);
    expect(VERIFICATION_RESEND_COOLDOWN_SECONDS).toBe(60);
  });
});

describe("secure OTP generation", () => {
  it("generates unpredictable 6-digit codes with crypto.randomInt", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 40; i += 1) {
      const code = randomInt(VERIFICATION_OTP_MIN, VERIFICATION_OTP_MAX).toString();
      expect(code).toMatch(/^\d{6}$/);
      codes.add(code);
    }
    expect(codes.size).toBeGreaterThan(1);
  });

  it("hashes codes so plaintext OTP is not stored", () => {
    const code = "123456";
    const hash = hashSensitiveValue(code, TEST_KEY);
    expect(hash).not.toContain(code);
    expect(hash).toHaveLength(64);
    expect(hashSensitiveValue(code, TEST_KEY)).toBe(hash);
    expect(hashSensitiveValue("123457", TEST_KEY)).not.toBe(hash);
  });
});

describe("contact verification templates", () => {
  it("builds email template without sensitive identity fields", () => {
    const template = buildEmailVerificationTemplate({
      referenceId: "KG926-2026-ABCDEF",
      code: "654321",
      recipientFirstName: "Ada",
    });

    expect(template.subject).toContain("KIRAKITAH GAMING 926");
    expect(template.subject).toContain("Verify Your Email");
    expect(template.text).toContain("Hi Ada,");
    expect(template.text).toContain("654321");
    expect(template.text).toContain("15 minutes");
    expect(template.text).toContain("PLAY. COMPETE. CREATE.");
    expect(template.text).not.toMatch(/NIN|passport|guardian|date of birth/i);
    expect(template.html).not.toMatch(/NIN|passport|guardian/i);
    expect(template.text).not.toContain("KG926-2026-ABCDEF");
  });

  it("builds concise SMS content", () => {
    const sms = buildPhoneVerificationSms({ code: "111222" });
    expect(sms).toContain("111222");
    expect(sms).toContain("15 minutes");
    expect(sms).toContain("Do not share");
    expect(sms.length).toBeLessThan(200);
  });
});
