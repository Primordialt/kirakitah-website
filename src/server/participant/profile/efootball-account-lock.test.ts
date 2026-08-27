import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordParticipantAuditEvent } = vi.hoisted(() => ({
  recordParticipantAuditEvent: vi.fn(async () => undefined),
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
}));

import { getDb } from "@/server/db";
import {
  ParticipantProfileError,
  updateParticipantProfile,
} from "@/server/participant/profile/service";
import {
  APPROVED_EFOOTBALL_ACCOUNT_LOCKED_CODE,
  APPROVED_EFOOTBALL_ACCOUNT_LOCKED_MESSAGE,
  isGamerTagIdentityChange,
  normalizeGamerTagForUniqueness,
} from "@/server/registration/gamer-tag";

function baseProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "profile-1",
    accountId: "account-1",
    status: "incomplete",
    firstName: "Ada",
    lastName: "Okafor",
    dateOfBirth: "2000-01-15",
    country: "NG",
    city: "Lagos",
    phone: "+2348012345678",
    phoneNormalized: "2348012345678",
    identificationType: "nin",
    identificationNumberHash: "hash",
    identificationNumberEncrypted: "enc",
    gamerTag: "QDP",
    playerPhotoBlobKey: "blob-key",
    playerPhotoMeta: {
      contentType: "image/jpeg",
      byteSize: 1200,
      originalFilename: "photo.jpg",
    },
    guardian: null,
    completionPercent: 100,
    correctionReason: null,
    submittedAt: null,
    verifiedAt: null,
    verifiedBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function mockDbForUpdate(existing: ReturnType<typeof baseProfile>) {
  const payloads: Record<string, unknown>[] = [];
  const returning = vi.fn(async () => [
    {
      ...existing,
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
  ]);
  const whereUpdate = vi.fn(() => ({ returning }));
  const set = vi.fn((payload: Record<string, unknown>) => {
    payloads.push(payload);
    return { where: whereUpdate };
  });
  const update = vi.fn(() => ({ set }));

  const limit = vi.fn(async () => [existing]);
  const whereSelect = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where: whereSelect }));
  const select = vi.fn(() => ({ from }));

  vi.mocked(getDb).mockReturnValue({
    select,
    update,
  } as never);

  return { select, update, set, whereUpdate, returning, payloads };
}

describe("approved eFootball account lock helpers", () => {
  it("treats case and whitespace as the same identity", () => {
    expect(isGamerTagIdentityChange("QDP", "qdp")).toBe(false);
    expect(isGamerTagIdentityChange("QDP", " QDP ")).toBe(false);
    expect(isGamerTagIdentityChange("QDP", "QDP")).toBe(false);
    expect(isGamerTagIdentityChange("QDP", "ABC")).toBe(true);
    expect(normalizeGamerTagForUniqueness(" QdP ")).toBe("qdp");
  });
});

describe("updateParticipantProfile eFootball lock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordParticipantAuditEvent.mockClear();
  });

  it("allows unverified participants to change gamerTag", async () => {
    const existing = baseProfile({ status: "incomplete", gamerTag: "QDP" });
    const { payloads } = mockDbForUpdate(existing);

    await updateParticipantProfile("account-1", { gamerTag: "NewTag" });

    expect(payloads[0]?.gamerTag).toBe("NewTag");
  });

  it("rejects verified participant gamerTag identity changes", async () => {
    mockDbForUpdate(
      baseProfile({
        status: "verified",
        gamerTag: "QDP",
        verifiedAt: "2026-01-01T00:00:00.000Z",
      }),
    );

    await expect(
      updateParticipantProfile("account-1", { gamerTag: "ABC" }),
    ).rejects.toMatchObject({
      code: APPROVED_EFOOTBALL_ACCOUNT_LOCKED_CODE,
      message: APPROVED_EFOOTBALL_ACCOUNT_LOCKED_MESSAGE,
      status: 409,
    });

    expect(recordParticipantAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PARTICIPANT_APPROVED_EFOOTBALL_CHANGE_DENIED",
        accountId: "account-1",
      }),
    );
  });

  it("allows same-identity case/whitespace gamerTag with other field edits", async () => {
    const { payloads } = mockDbForUpdate(
      baseProfile({ status: "verified", gamerTag: "QDP" }),
    );
    await updateParticipantProfile("account-1", {
      gamerTag: " qdp ",
      city: "Abuja",
    });
    expect(payloads[0]?.gamerTag).toBeUndefined();
    expect(payloads[0]?.city).toBe("Abuja");
  });

  it("keeps other profile fields editable after verification", async () => {
    const { payloads } = mockDbForUpdate(
      baseProfile({ status: "verified", gamerTag: "QDP" }),
    );

    await updateParticipantProfile("account-1", {
      city: "Ibadan",
      phone: "+2348099999999",
    });

    expect(payloads[0]?.city).toBe("Ibadan");
    expect(payloads[0]?.phone).toBe("+2348099999999");
    expect(payloads[0]?.gamerTag).toBeUndefined();
    expect(payloads[0]?.status).toBeUndefined();
  });

  it("uses server-authoritative verified status for the lock", async () => {
    mockDbForUpdate(baseProfile({ status: "incomplete", gamerTag: "QDP" }));
    await expect(
      updateParticipantProfile("account-1", { gamerTag: "Changed" }),
    ).resolves.toBeTruthy();

    mockDbForUpdate(baseProfile({ status: "verified", gamerTag: "QDP" }));
    await expect(
      updateParticipantProfile("account-1", { gamerTag: "Changed" }),
    ).rejects.toBeInstanceOf(ParticipantProfileError);
  });

  it("still blocks edits while profile is under review", async () => {
    mockDbForUpdate(
      baseProfile({ status: "submitted_for_review", gamerTag: "QDP" }),
    );

    await expect(
      updateParticipantProfile("account-1", { city: "Kano" }),
    ).rejects.toMatchObject({
      code: "PROFILE_ALREADY_SUBMITTED",
      status: 409,
    });
  });

  it("surfaces concurrent update conflicts safely", async () => {
    const existing = baseProfile({ status: "verified", gamerTag: "QDP" });
    const returning = vi.fn(async () => []);
    const whereUpdate = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where: whereUpdate }));
    const update = vi.fn(() => ({ set }));
    const limit = vi.fn(async () => [existing]);
    const whereSelect = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where: whereSelect }));
    const select = vi.fn(() => ({ from }));
    vi.mocked(getDb).mockReturnValue({ select, update } as never);

    await expect(
      updateParticipantProfile("account-1", { city: "Enugu" }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      status: 409,
    });
  });
});
