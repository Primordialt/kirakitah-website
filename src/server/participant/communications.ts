import { getSiteUrl } from "@/lib/site-url";
import { COMPETITION_NAME, TOURNAMENT_EVENT_ID } from "@/config/competition";
import { getVerificationProviders } from "@/server/verification";
import {
  buildApplicationReceivedTemplate,
  buildProfileCorrectionTemplate,
  buildProfileReopenedTemplate,
  buildProfileVerifiedTemplate,
  buildSelectionTemplate,
} from "@/server/verification/templates/lifecycle";
import { serverEnv } from "@/server/env";

/**
 * Best-effort lifecycle emails. Never throws into callers.
 * Authoritative operations must succeed even when delivery fails.
 */
async function sendLifecycleSafely(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  event: string;
}): Promise<void> {
  try {
    const providers = getVerificationProviders();
    const result = await providers.email.sendLifecycleEmail({
      email: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    if (result.status !== "sent" && result.status !== "skipped") {
      if (serverEnv.nodeEnv !== "test") {
        console.error(
          JSON.stringify({
            level: "error",
            event: "participant.lifecycle_email.failed",
            category: input.event,
            deliveryStatus: result.status,
          }),
        );
      }
    }
  } catch {
    if (serverEnv.nodeEnv !== "test") {
      console.error(
        JSON.stringify({
          level: "error",
          event: "participant.lifecycle_email.failed",
          category: input.event,
          deliveryStatus: "exception",
        }),
      );
    }
  }
}

export async function notifyApplicationReceived(input: {
  email: string;
  referenceId: string;
  tournamentId?: string;
}): Promise<void> {
  const tournamentId = input.tournamentId ?? TOURNAMENT_EVENT_ID;
  const actionUrl = `${getSiteUrl()}/tournaments/${tournamentId}`;
  const template = buildApplicationReceivedTemplate({
    referenceId: input.referenceId,
    actionUrl,
  });
  await sendLifecycleSafely({
    to: input.email,
    ...template,
    event: "application_received",
  });
}

export async function notifyProfileVerified(input: {
  email: string;
}): Promise<void> {
  const actionUrl = `${getSiteUrl()}/tournaments`;
  const template = buildProfileVerifiedTemplate({ actionUrl });
  await sendLifecycleSafely({
    to: input.email,
    ...template,
    event: "profile_verified",
  });
}

export async function notifyProfileReopened(input: {
  email: string;
}): Promise<void> {
  const actionUrl = `${getSiteUrl()}/profile`;
  const template = buildProfileReopenedTemplate({ actionUrl });
  await sendLifecycleSafely({
    to: input.email,
    ...template,
    event: "profile_reopened",
  });
}

export async function notifyProfileCorrectionRequired(input: {
  email: string;
  reason: string;
}): Promise<void> {
  const actionUrl = `${getSiteUrl()}/profile`;
  const template = buildProfileCorrectionTemplate({
    reason: input.reason,
    actionUrl,
  });
  await sendLifecycleSafely({
    to: input.email,
    ...template,
    event: "profile_correction_required",
  });
}

export async function notifyParticipantSelected(input: {
  email: string;
  publicCode: string | null;
  tournamentId?: string;
}): Promise<void> {
  const tournamentId = input.tournamentId ?? TOURNAMENT_EVENT_ID;
  const actionUrl = `${getSiteUrl()}/tournaments/${tournamentId}`;
  const template = buildSelectionTemplate({
    publicCode: input.publicCode,
    actionUrl,
  });
  await sendLifecycleSafely({
    to: input.email,
    ...template,
    event: "participant_selected",
  });
}

export { COMPETITION_NAME };
