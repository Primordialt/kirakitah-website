import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHash, randomBytes } from "crypto";

const { sendPasswordResetEmail, revokeAllParticipantSessionsForAccount } =
  vi.hoisted(() => ({
    sendPasswordResetEmail: vi.fn(async () => ({
      status: "sent" as const,
      provider: "mock",
    })),
    revokeAllParticipantSessionsForAccount: vi.fn(async () => undefined),
  }));

vi.mock("@/server/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/server/env", () => ({
  serverEnv: {
    registrationPiiEncryptionKey: "a".repeat(64),
    participantSessionSecret: "b".repeat(64),
    nodeEnv: "test",
  },
}));

vi.mock("@/server/participant/audit", () => ({
  recordParticipantAuditEvent: vi.fn(async () => undefined),
}));

vi.mock("@/server/verification", () => ({
  getVerificationProviders: () => ({
    email: { sendPasswordResetEmail },
  }),
}));

vi.mock("@/server/participant/auth/session", () => ({
  revokeAllParticipantSessionsForAccount,
  assertParticipantCsrf: vi.fn(),
  ParticipantAuthenticationError: class ParticipantAuthenticationError extends Error {},
}));

import { getDb } from "@/server/db";
import {
  buildPasswordResetUrl,
  generatePasswordResetToken,
  hashPasswordResetToken,
  isPasswordResetTokenExpired,
  PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
  PASSWORD_RESET_SUCCESS_MESSAGE,
  PASSWORD_RESET_TOKEN_BYTES,
  RESET_EMAIL_MAX_PER_HOUR,
  RESET_IP_MAX_PER_HOUR,
  requestPasswordReset,
  resetPasswordWithToken,
  ParticipantPasswordResetError,
} from "@/server/participant/auth/password-reset";
import { validateParticipantPassword } from "@/server/participant/auth/password";
import { hashSensitiveValue } from "@/server/registration/pii";
import { PARTICIPANT_SESSION_COOKIE } from "@/server/participant/auth/constants";
import { ADMIN_SESSION_COOKIE } from "@/server/admin/auth/constants";
import { buildPasswordResetTemplate } from "@/server/verification/templates/password-reset";

const PEPPER = "a".repeat(64);

function attemptCount(count: number) {
  return {
    from: () => ({
      where: async () => [{ count }],
    }),
  };
}

function accountLookup(rows: unknown[]) {
  return {
    from: () => ({
      where: () => ({
        limit: async () => rows,
      }),
    }),
  };
}

function insertMock() {
  return {
    values: vi.fn(async () => undefined),
  };
}

describe("password reset helpers", () => {
  it("exposes enumeration-safe and invalid-token messages", () => {
    expect(PASSWORD_RESET_SUCCESS_MESSAGE).toBe(
      "If an account exists for this email, we've sent a password reset link.",
    );
    expect(PASSWORD_RESET_INVALID_TOKEN_MESSAGE).toBe(
      "This reset link is invalid or has expired.",
    );
  });

  it("documents rate limits of 5/email/hour and 20/IP/hour", () => {
    expect(RESET_EMAIL_MAX_PER_HOUR).toBe(5);
    expect(RESET_IP_MAX_PER_HOUR).toBe(20);
  });

  it("generates high-entropy cryptographically random tokens", () => {
    const a = generatePasswordResetToken();
    const b = generatePasswordResetToken();
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).toHaveLength(PASSWORD_RESET_TOKEN_BYTES * 2);
    expect(a).not.toBe(b);
    expect(a).not.toMatch(/@|user|email/i);
  });

  it("hashes reset tokens with the PII pepper (never stores plaintext)", () => {
    const raw = randomBytes(32).toString("hex");
    const hash = hashPasswordResetToken(raw, PEPPER);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(raw);
    expect(hash).toBe(hashSensitiveValue(raw, PEPPER));
    expect(hashPasswordResetToken(raw, PEPPER)).toBe(hash);
    expect(hashPasswordResetToken(`${raw}x`, PEPPER)).not.toBe(hash);
  });

  it("detects expired tokens", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isPasswordResetTokenExpired(past)).toBe(true);
    expect(isPasswordResetTokenExpired(future)).toBe(false);
  });

  it("builds reset URLs with opaque token only (no email/username/PII)", () => {
    const url = buildPasswordResetUrl("abc123");
    expect(url).toContain("/reset-password?token=");
    expect(url).toContain("abc123");
    expect(url).not.toMatch(/email=|username=|password=/i);
  });

  it("reuses participant password validation rules", () => {
    expect(validateParticipantPassword("short")).toMatch(/at least/i);
    expect(validateParticipantPassword("password1234")).toMatch(
      /common|stronger/i,
    );
    expect(
      validateParticipantPassword("a-reasonably-long-passphrase"),
    ).toBeUndefined();
  });

  it("keeps participant and admin session cookies separate", () => {
    expect(PARTICIPANT_SESSION_COOKIE).toBe("kirakitah_participant_session");
    expect(ADMIN_SESSION_COOKIE).toBe("kirakitah_admin_session");
    expect(PARTICIPANT_SESSION_COOKIE).not.toBe(ADMIN_SESSION_COOKIE);
  });

  it("builds reset email without internal PII", () => {
    const resetUrl = "https://www.kirakitah.com/reset-password?token=opaque";
    const template = buildPasswordResetTemplate({
      resetUrl,
      expiresInHours: 1,
    });
    expect(template.subject).toMatch(/Reset Your Password/i);
    expect(template.text).toContain(resetUrl);
    expect(template.text).toMatch(/1 hour/);
    expect(template.text).not.toMatch(/NIN|passport|guardian|qualification/i);
  });
});

describe("requestPasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the same message for unknown emails (enumeration-safe)", async () => {
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce(attemptCount(0))
        .mockReturnValueOnce(accountLookup([])),
      insert: vi.fn(() => insertMock()),
    };
    vi.mocked(getDb).mockReturnValue(mockDb as never);

    const result = await requestPasswordReset({
      email: "Nobody@Example.COM",
      clientIp: "1.2.3.4",
    });

    expect(result.message).toBe(PASSWORD_RESET_SUCCESS_MESSAGE);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("returns the same message and sends email for active accounts", async () => {
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce(attemptCount(0))
        .mockReturnValueOnce(
          accountLookup([
            {
              id: "acc-1",
              email: "player@example.com",
              active: true,
            },
          ]),
        )
        .mockReturnValueOnce(attemptCount(0)),
      insert: vi.fn(() => insertMock()),
      update: vi.fn(() => ({
        set: () => ({
          where: async () => undefined,
        }),
      })),
    };
    vi.mocked(getDb).mockReturnValue(mockDb as never);

    const result = await requestPasswordReset({
      email: "Player@Example.COM",
      clientIp: "1.2.3.4",
    });

    expect(result.message).toBe(PASSWORD_RESET_SUCCESS_MESSAGE);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "player@example.com",
        resetUrl: expect.stringMatching(/\/reset-password\?token=/),
      }),
    );
  });

  it("returns generic success for inactive accounts without sending email", async () => {
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce(attemptCount(0))
        .mockReturnValueOnce(
          accountLookup([
            {
              id: "acc-inactive",
              email: "gone@example.com",
              active: false,
            },
          ]),
        ),
      insert: vi.fn(() => insertMock()),
    };
    vi.mocked(getDb).mockReturnValue(mockDb as never);

    const result = await requestPasswordReset({
      email: "gone@example.com",
      clientIp: "9.9.9.9",
    });

    expect(result.message).toBe(PASSWORD_RESET_SUCCESS_MESSAGE);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("normalizes email casing so rate-limit keys collide", () => {
    const normalize = (email: string) => email.trim().toLowerCase();
    const hash = (value: string) =>
      createHash("sha256").update(`pepper:${value}`).digest("hex");
    expect(normalize("Player@Example.COM")).toBe("player@example.com");
    expect(hash(normalize("Player@Example.COM"))).toBe(
      hash(normalize("player@example.com")),
    );
  });

  it("rate-limits by IP after too many requests", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValueOnce(attemptCount(RESET_IP_MAX_PER_HOUR)),
      insert: vi.fn(),
    };
    vi.mocked(getDb).mockReturnValue(mockDb as never);

    await expect(
      requestPasswordReset({
        email: "anyone@example.com",
        clientIp: "8.8.8.8",
      }),
    ).rejects.toMatchObject({
      name: "ParticipantPasswordResetError",
      code: "RATE_LIMITED",
    });
  });

  it("rate-limits by email for active accounts after too many sends", async () => {
    const mockDb = {
      select: vi
        .fn()
        .mockReturnValueOnce(attemptCount(0))
        .mockReturnValueOnce(
          accountLookup([
            {
              id: "acc-1",
              email: "player@example.com",
              active: true,
            },
          ]),
        )
        .mockReturnValueOnce(attemptCount(RESET_EMAIL_MAX_PER_HOUR)),
      insert: vi.fn(() => insertMock()),
    };
    vi.mocked(getDb).mockReturnValue(mockDb as never);

    await expect(
      requestPasswordReset({
        email: "player@example.com",
        clientIp: "1.1.1.1",
      }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});

describe("resetPasswordWithToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects mismatched passwords before touching the token", async () => {
    const mockDb = {
      update: vi.fn(),
      select: vi.fn(),
    };
    vi.mocked(getDb).mockReturnValue(mockDb as never);

    await expect(
      resetPasswordWithToken({
        token: "raw-token",
        password: "a-reasonably-long-passphrase",
        confirmPassword: "different-passphrase!!",
      }),
    ).rejects.toThrow(ParticipantPasswordResetError);

    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("rejects weak passwords server-side", async () => {
    const mockDb = { update: vi.fn(), select: vi.fn() };
    vi.mocked(getDb).mockReturnValue(mockDb as never);

    await expect(
      resetPasswordWithToken({
        token: "raw-token",
        password: "short",
        confirmPassword: "short",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("rejects invalid, expired, or reused tokens when atomic consume returns no row", async () => {
    const mockDb = {
      update: vi.fn(() => ({
        set: () => ({
          where: () => ({
            returning: async () => [],
          }),
        }),
      })),
      select: vi.fn(),
    };
    vi.mocked(getDb).mockReturnValue(mockDb as never);

    await expect(
      resetPasswordWithToken({
        token: "dead-token",
        password: "a-reasonably-long-passphrase",
        confirmPassword: "a-reasonably-long-passphrase",
      }),
    ).rejects.toMatchObject({
      message: PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
    });
  });

  it("rejects inactive accounts without updating password", async () => {
    const mockDb = {
      update: vi.fn().mockReturnValueOnce({
        set: () => ({
          where: () => ({
            returning: async () => [{ id: "tok-1", accountId: "acc-1" }],
          }),
        }),
      }),
      select: vi.fn().mockReturnValueOnce(
        accountLookup([{ id: "acc-1", active: false }]),
      ),
    };
    vi.mocked(getDb).mockReturnValue(mockDb as never);

    await expect(
      resetPasswordWithToken({
        token: "live-token",
        password: "a-reasonably-long-passphrase",
        confirmPassword: "a-reasonably-long-passphrase",
      }),
    ).rejects.toMatchObject({
      message: PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
    });

    expect(mockDb.update).toHaveBeenCalledTimes(1);
    expect(revokeAllParticipantSessionsForAccount).not.toHaveBeenCalled();
  });

  it("updates password hash, consumes token, and revokes participant sessions", async () => {
    const mockDb = {
      update: vi
        .fn()
        .mockReturnValueOnce({
          set: () => ({
            where: () => ({
              returning: async () => [{ id: "tok-1", accountId: "acc-1" }],
            }),
          }),
        })
        .mockReturnValueOnce({
          set: (values: Record<string, unknown>) => {
            expect(values.passwordHash).toEqual(
              expect.stringMatching(/^scrypt\$/),
            );
            expect(values).not.toHaveProperty("active");
            expect(String(values.passwordHash)).not.toContain(
              "a-reasonably-long-passphrase",
            );
            return {
              where: async () => undefined,
            };
          },
        }),
      select: vi.fn().mockReturnValueOnce(
        accountLookup([{ id: "acc-1", active: true }]),
      ),
    };
    vi.mocked(getDb).mockReturnValue(mockDb as never);

    const result = await resetPasswordWithToken({
      token: "live-token",
      password: "a-reasonably-long-passphrase",
      confirmPassword: "a-reasonably-long-passphrase",
    });

    expect(result).toEqual({ success: true });
    expect(revokeAllParticipantSessionsForAccount).toHaveBeenCalledWith("acc-1");
    expect(mockDb.update).toHaveBeenCalledTimes(2);
  });
});
