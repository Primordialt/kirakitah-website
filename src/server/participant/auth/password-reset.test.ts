import { describe, expect, it } from "vitest";
import {
  buildPasswordResetUrl,
  hashPasswordResetToken,
  isPasswordResetTokenExpired,
  PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
  PASSWORD_RESET_SUCCESS_MESSAGE,
} from "@/server/participant/auth/password-reset";
import { validateParticipantPassword } from "@/server/participant/auth/password";
import { revokeAllParticipantSessionsForAccount } from "@/server/participant/auth/session";

describe("password reset helpers", () => {
  it("exposes the enumeration-safe success message constant", () => {
    expect(PASSWORD_RESET_SUCCESS_MESSAGE).toBe(
      "If an account exists for this email, we've sent a password reset link.",
    );
  });

  it("exposes the generic invalid-token message", () => {
    expect(PASSWORD_RESET_INVALID_TOKEN_MESSAGE).toBe(
      "This reset link is invalid or has expired.",
    );
  });

  it("hashes reset tokens with the PII pepper (never stores plaintext)", () => {
    const pepper = "a".repeat(64);
    const raw = "b".repeat(64);
    const hash = hashPasswordResetToken(raw, pepper);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(raw);
    expect(hashPasswordResetToken(raw, pepper)).toBe(hash);
    expect(hashPasswordResetToken(`${raw}x`, pepper)).not.toBe(hash);
  });

  it("detects expired tokens", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isPasswordResetTokenExpired(past)).toBe(true);
    expect(isPasswordResetTokenExpired(future)).toBe(false);
  });

  it("builds reset URLs with the token query param", () => {
    const url = buildPasswordResetUrl("abc123");
    expect(url).toContain("/reset-password?token=");
    expect(url).toContain("abc123");
  });

  it("reuses participant password validation rules", () => {
    expect(validateParticipantPassword("short")).toMatch(/at least/i);
    expect(validateParticipantPassword("password1234")).toMatch(/common|stronger/i);
    expect(
      validateParticipantPassword("a-reasonably-long-passphrase"),
    ).toBeUndefined();
  });

  it("exports revokeAllParticipantSessionsForAccount for reset completion", () => {
    expect(typeof revokeAllParticipantSessionsForAccount).toBe("function");
  });
});
