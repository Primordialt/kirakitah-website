import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordParticipantAuditEvent, notifyProfileReopened } = vi.hoisted(() => ({
  recordParticipantAuditEvent: vi.fn(async () => undefined),
  notifyProfileReopened: vi.fn(async () => undefined),
}));

vi.mock("@/server/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/server/env", () => ({
  serverEnv: {
    registrationPiiEncryptionKey: "a".repeat(64),
    nodeEnv: "test",
  },
}));

vi.mock("@/server/participant/audit", () => ({
  recordParticipantAuditEvent,
}));

vi.mock("@/server/participant/communications", () => ({
  notifyProfileVerified: vi.fn(),
  notifyProfileCorrectionRequired: vi.fn(),
  notifyProfileReopened,
}));

import { getDb } from "@/server/db";
import { PROFILE_REOPENED_PARTICIPANT_MESSAGE } from "@/lib/participant/profile-verification";
import {
  ParticipantProfileError,
  adminReopenVerifiedProfile,
} from "@/server/participant/profile/service";

function verifiedProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "profile-1",
    accountId: "account-1",
    status: "verified",
    firstName: "Ada",
    lastName: "Okafor",
    dateOfBirth: "2000-01-15",
    country: "NG",
    city: "Lagos",
    phone: "+2348012345678",
    phoneNormalized: "2348012345678",
    identificationType: "nin",
    governmentIdType: null,
    identificationNumberHash: "hash",
    identificationNumberEncrypted: "enc",
    gamerTag: "QDP",
    playerPhotoBlobKey: "blob-key",
    playerPhotoMeta: {
      fileName: "photo.jpg",
      fileSize: 1200,
      mimeType: "image/jpeg",
    },
    guardian: null,
    completionPercent: 100,
    correctionReason: null,
    submittedAt: "2026-01-01T00:00:00.000Z",
    verifiedAt: "2026-01-02T00:00:00.000Z",
    verifiedBy: "admin-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("adminReopenVerifiedProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reopens a verified profile and records audit metadata", async () => {
    const existing = verifiedProfile();
    const reopened = verifiedProfile({
      status: "needs_correction",
      correctionReason: PROFILE_REOPENED_PARTICIPANT_MESSAGE,
      verifiedAt: null,
      verifiedBy: null,
    });

    const selectLimit = vi.fn(async () => [existing]);
    const selectFrom = vi.fn(() => ({ where: vi.fn(() => ({ limit: selectLimit })) }));
    const returning = vi.fn(async () => [reopened]);
    const updateWhere = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where: updateWhere }));
    const update = vi.fn(() => ({ set }));
    const accountLimit = vi.fn(async () => [{ email: "ada@example.com" }]);
    const accountWhere = vi.fn(() => ({ limit: accountLimit }));

    vi.mocked(getDb).mockReturnValue({
      select: vi.fn(() => ({ from: selectFrom })),
      update,
    } as never);

    selectFrom.mockImplementationOnce(() => ({
      where: vi.fn(() => ({ limit: selectLimit })),
    }));
    selectFrom.mockImplementationOnce(() => ({
      where: accountWhere,
    }) as never);

    const view = await adminReopenVerifiedProfile({
      profileId: "profile-1",
      actorId: "super-admin-1",
      reason: "Approved in error during review",
    });

    expect(view.status).toBe("needs_correction");
    expect(view.verifiedAt).toBeNull();
    expect(view.correctionReason).toBe(PROFILE_REOPENED_PARTICIPANT_MESSAGE);
    expect(recordParticipantAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PARTICIPANT_PROFILE_REOPENED",
        accountId: "account-1",
        actor: "super-admin-1",
        metadata: expect.objectContaining({
          profileId: "profile-1",
          reopenReason: "Approved in error during review",
        }),
      }),
    );
    expect(notifyProfileReopened).toHaveBeenCalledWith({
      email: "ada@example.com",
    });
  });

  it("rejects reopen when profile is not verified", async () => {
    const selectLimit = vi.fn(async () => [
      verifiedProfile({ status: "submitted_for_review", verifiedAt: null }),
    ]);
    const selectFrom = vi.fn(() => ({ where: vi.fn(() => ({ limit: selectLimit })) }));

    vi.mocked(getDb).mockReturnValue({
      select: vi.fn(() => ({ from: selectFrom })),
    } as never);

    await expect(
      adminReopenVerifiedProfile({
        profileId: "profile-1",
        actorId: "super-admin-1",
        reason: "Should not reopen pending profile",
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
    } satisfies Partial<ParticipantProfileError>);
  });

  it("requires a reopen reason of at least 8 characters", async () => {
    await expect(
      adminReopenVerifiedProfile({
        profileId: "profile-1",
        actorId: "super-admin-1",
        reason: "short",
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    } satisfies Partial<ParticipantProfileError>);
  });
});
