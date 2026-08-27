import { describe, expect, it, vi, beforeEach } from "vitest";

const sendLifecycleEmail = vi.fn();

vi.mock("@/server/verification", () => ({
  getVerificationProviders: () => ({
    email: { sendLifecycleEmail },
  }),
}));

vi.mock("@/lib/site-url", () => ({
  getSiteUrl: () => "https://example.test",
}));

vi.mock("@/server/env", () => ({
  serverEnv: { nodeEnv: "test" },
}));

import {
  notifyApplicationReceived,
  notifyParticipantSelected,
  notifyProfileCorrectionRequired,
  notifyProfileVerified,
} from "@/server/participant/communications";
import {
  buildApplicationReceivedTemplate,
  buildProfileCorrectionTemplate,
  buildProfileVerifiedTemplate,
  buildSelectionTemplate,
} from "@/server/verification/templates/lifecycle";
import {
  getNotificationPresentation,
  PARTICIPANT_VISIBLE_AUDIT_EVENT_TYPES,
} from "@/lib/participant/tournament-status";

describe("lifecycle email templates", () => {
  it("builds application received without promising selection", () => {
    const template = buildApplicationReceivedTemplate({
      referenceId: "KG926-ABC123",
      actionUrl: "https://example.test/tournaments/event-kg926",
    });
    expect(template.subject).toMatch(/Application received/i);
    expect(template.text).toContain("KG926-ABC123");
    expect(template.text).not.toMatch(/accepted|selected/i);
    expect(template.html).toContain("View application");
  });

  it("builds profile correction with action CTA", () => {
    const template = buildProfileCorrectionTemplate({
      reason: "Please update your player photo.",
      actionUrl: "https://example.test/profile",
    });
    expect(template.subject).toMatch(/Profile update required/i);
    expect(template.text).toContain("Please update your player photo.");
    expect(template.html).toContain("Review profile");
  });

  it("builds profile verified without implying tournament selection", () => {
    const template = buildProfileVerifiedTemplate({
      actionUrl: "https://example.test/tournaments",
    });
    expect(template.text).toMatch(/verified/i);
    expect(template.text).toMatch(/does not mean you have been selected/i);
  });

  it("builds selection template only for authoritative selection", () => {
    const template = buildSelectionTemplate({
      publicCode: "KG926-P0001",
      actionUrl: "https://example.test/tournaments/event-kg926",
    });
    expect(template.text).toContain("You have been selected");
    expect(template.text).toContain("KG926-P0001");
    expect(template.text).toMatch(/Qualification/i);
  });
});

describe("participant lifecycle communications", () => {
  beforeEach(() => {
    sendLifecycleEmail.mockReset();
  });

  it("sends application received email via provider", async () => {
    sendLifecycleEmail.mockResolvedValue({ status: "sent", provider: "mock" });
    await notifyApplicationReceived({
      email: "player@example.com",
      referenceId: "KG926-ABC123",
      tournamentId: "event-kg926",
    });
    expect(sendLifecycleEmail).toHaveBeenCalledTimes(1);
    expect(sendLifecycleEmail.mock.calls[0][0].email).toBe("player@example.com");
    expect(sendLifecycleEmail.mock.calls[0][0].subject).toMatch(
      /Application received/i,
    );
  });

  it("does not throw when email delivery fails", async () => {
    sendLifecycleEmail.mockRejectedValue(new Error("Resend down"));
    await expect(
      notifyProfileVerified({ email: "player@example.com" }),
    ).resolves.toBeUndefined();
    await expect(
      notifyProfileCorrectionRequired({
        email: "player@example.com",
        reason: "Update your photo to meet guidelines.",
      }),
    ).resolves.toBeUndefined();
    await expect(
      notifyParticipantSelected({
        email: "player@example.com",
        publicCode: "KG926-P0001",
      }),
    ).resolves.toBeUndefined();
  });

  it("does not throw when provider returns unavailable", async () => {
    sendLifecycleEmail.mockResolvedValue({
      status: "unavailable",
      provider: "mock",
      message: "down",
    });
    await expect(
      notifyApplicationReceived({
        email: "player@example.com",
        referenceId: "KG926-XYZ",
      }),
    ).resolves.toBeUndefined();
  });
});

describe("notification presentation safety", () => {
  it("maps lifecycle events to participant-safe routes", () => {
    expect(getNotificationPresentation("PARTICIPANT_PROFILE_REJECTED").href).toBe(
      "/profile",
    );
    expect(
      getNotificationPresentation("PARTICIPANT_APPLICATION_SUBMITTED").href,
    ).toBe("/tournaments/event-kg926");
    expect(getNotificationPresentation("PARTICIPANT_SELECTED").href).toBe(
      "/tournaments/event-kg926",
    );
    expect(getNotificationPresentation("MATCH_SCHEDULED").href).toBe("/matches");
    expect(
      getNotificationPresentation("PARTICIPANT_QUALIFICATION_ASSIGNED").href,
    ).toBe("/tournaments/event-kg926");
  });

  it("keeps match event types intact", () => {
    for (const event of [
      "MATCH_SCHEDULED",
      "MATCH_RESCHEDULED",
      "MATCH_REMINDER",
      "MATCH_CANCELLED",
    ] as const) {
      const presentation = getNotificationPresentation(event);
      expect(presentation.title.length).toBeGreaterThan(0);
      expect(presentation.href).toBe("/matches");
    }
  });

  it("limits visible audit event types", () => {
    expect(PARTICIPANT_VISIBLE_AUDIT_EVENT_TYPES).not.toContain(
      "PARTICIPANT_LOGIN_SUCCESS",
    );
    expect(PARTICIPANT_VISIBLE_AUDIT_EVENT_TYPES).toContain(
      "PARTICIPANT_APPLICATION_SUBMITTED",
    );
  });
});
