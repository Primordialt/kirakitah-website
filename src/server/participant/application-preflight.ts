import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  participantAccounts,
  participantProfiles,
  registrationApplications,
} from "@/server/db/schema";
import {
  getProfileApplicationBlock,
  type ProfileApplicationBlock,
} from "@/server/participant/application-gate";
import { getApplyGateAction } from "@/lib/participant/profile-presentation";

const ACTIVE_APPLICATION_STATUSES = [
  "received",
  "under_review",
  "verified",
] as const;

export type PreflightCheck = {
  id: string;
  label: string;
  ready: boolean;
  detail: string;
  actionHref?: string;
  actionLabel?: string;
};

export type ApplicationPreflight = {
  canContinue: boolean;
  blockingCode: string | null;
  blockingMessage: string | null;
  accountChecks: PreflightCheck[];
  requirementChecks: PreflightCheck[];
  profile: {
    gamerTag: string;
    firstName: string;
    lastName: string;
    emailMasked: string;
    status: string;
    completionPercent: number;
  } | null;
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  if (local.length <= 2) return `${local[0] ?? "*"}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function actionForBlock(
  block: ProfileApplicationBlock | null,
): { href: string; buttonLabel: string } {
  if (!block) {
    return getApplyGateAction(null);
  }
  return getApplyGateAction(block.code);
}

/**
 * Server-authoritative application pre-flight checklist.
 * Does not grant apply permission — POST still re-runs the gate.
 */
export async function getApplicationPreflight(
  accountId: string,
  eventId: string,
): Promise<ApplicationPreflight> {
  const db = getDb();

  const [account] = await db
    .select({
      id: participantAccounts.id,
      email: participantAccounts.email,
      active: participantAccounts.active,
      emailVerifiedAt: participantAccounts.emailVerifiedAt,
    })
    .from(participantAccounts)
    .where(eq(participantAccounts.id, accountId))
    .limit(1);

  if (!account || !account.active) {
    return {
      canContinue: false,
      blockingCode: "UNAUTHORIZED",
      blockingMessage: "Sign in to apply to this tournament.",
      accountChecks: [
        {
          id: "signed-in",
          label: "Signed in",
          ready: false,
          detail: "Sign in with your KIRAKITAH participant account.",
          actionHref: "/login",
          actionLabel: "Sign in",
        },
      ],
      requirementChecks: [],
      profile: null,
    };
  }

  const emailVerified = Boolean(account.emailVerifiedAt);
  const [profile] = await db
    .select()
    .from(participantProfiles)
    .where(eq(participantProfiles.accountId, accountId))
    .limit(1);

  const profileBlock = getProfileApplicationBlock(
    profile?.status,
    profile?.correctionReason,
  );
  const profileVerified = profile?.status === "verified";
  const profileAction = actionForBlock(profileBlock);

  const [duplicateByAccount] = await db
    .select({ id: registrationApplications.id })
    .from(registrationApplications)
    .where(
      and(
        eq(registrationApplications.eventId, eventId),
        eq(registrationApplications.participantAccountId, accountId),
        inArray(registrationApplications.status, [
          ...ACTIVE_APPLICATION_STATUSES,
        ]),
      ),
    )
    .limit(1);

  const [duplicateByEmail] = await db
    .select({ id: registrationApplications.id })
    .from(registrationApplications)
    .where(
      and(
        eq(registrationApplications.eventId, eventId),
        inArray(registrationApplications.status, [
          ...ACTIVE_APPLICATION_STATUSES,
        ]),
        sql`lower(${registrationApplications.email}) = ${account.email.toLowerCase()}`,
      ),
    )
    .limit(1);

  const alreadyApplied = Boolean(duplicateByAccount || duplicateByEmail);

  let blockingCode: string | null = null;
  let blockingMessage: string | null = null;

  if (!emailVerified) {
    blockingCode = "EMAIL_VERIFICATION_REQUIRED";
    blockingMessage = "Verify your email before applying.";
  } else if (profileBlock) {
    blockingCode = profileBlock.code;
    blockingMessage = profileBlock.message;
  } else if (profile && profile.completionPercent < 100) {
    blockingCode = "PROFILE_INCOMPLETE";
    blockingMessage = "Complete your participant profile before applying.";
  } else if (alreadyApplied) {
    blockingCode = "DUPLICATE_APPLICATION";
    blockingMessage = "You already have an active application for this tournament.";
  }

  const accountChecks: PreflightCheck[] = [
    {
      id: "email",
      label: "Email verified",
      ready: emailVerified,
      detail: emailVerified
        ? "Your email address is verified."
        : "Verify your email to continue.",
      actionHref: emailVerified ? undefined : "/account",
      actionLabel: emailVerified ? undefined : "View account",
    },
    {
      id: "profile-complete",
      label: "Profile complete",
      ready: Boolean(profile) && profile!.completionPercent >= 100,
      detail:
        profile && profile.completionPercent >= 100
          ? `Profile completion ${profile.completionPercent}%.`
          : "Complete your participant profile before applying.",
      actionHref:
        profile && profile.completionPercent >= 100 ? undefined : "/profile",
      actionLabel:
        profile && profile.completionPercent >= 100
          ? undefined
          : "Complete profile",
    },
    {
      id: "profile-verified",
      label: "Profile verified",
      ready: profileVerified,
      detail: profileVerified
        ? "Your participant profile is verified."
        : profileBlock?.message ?? "Your profile must be verified before you can apply.",
      actionHref: profileVerified ? undefined : profileAction.href,
      actionLabel: profileVerified ? undefined : profileAction.buttonLabel,
    },
    {
      id: "eligible-to-apply",
      label: "Account eligible to apply",
      ready: !blockingCode,
      detail: alreadyApplied
        ? "You already have an active application for this tournament."
        : blockingCode
          ? blockingMessage ?? "You cannot apply yet."
          : "Your account meets the current application gate.",
      actionHref: alreadyApplied
        ? `/tournaments/${eventId}`
        : blockingCode
          ? profileAction.href
          : undefined,
      actionLabel: alreadyApplied
        ? "View application"
        : blockingCode
          ? profileAction.buttonLabel
          : undefined,
    },
  ];

  const hasGamerTag = Boolean(profile?.gamerTag?.trim());

  const requirementChecks: PreflightCheck[] = [
    {
      id: "req-verified-profile",
      label: "Verified participant profile",
      ready: profileVerified,
      detail: profileVerified
        ? "Ready"
        : "Required before tournament application.",
    },
    {
      id: "req-tournament-info",
      label: "Required tournament information",
      ready: !blockingCode,
      detail: !blockingCode
        ? "Collected in the application form."
        : "Available after account checks pass.",
    },
    {
      id: "req-efootball",
      label: "eFootball account",
      ready: hasGamerTag && profileVerified,
      detail: hasGamerTag
        ? "Taken from your verified profile."
        : "Add your eFootball username on your profile.",
      actionHref: hasGamerTag ? undefined : "/profile",
      actionLabel: hasGamerTag ? undefined : "Update profile",
    },
    {
      id: "req-x",
      label: "X follow",
      ready: !blockingCode,
      detail: "Confirmed during application; manually reviewed later.",
    },
    {
      id: "req-instagram",
      label: "Instagram follow",
      ready: !blockingCode,
      detail: "Confirmed during application; manually reviewed later.",
    },
    {
      id: "req-tiktok",
      label: "TikTok follow",
      ready: !blockingCode,
      detail: "Confirmed during application; manually reviewed later.",
    },
  ];

  return {
    canContinue: blockingCode === null,
    blockingCode,
    blockingMessage,
    accountChecks,
    requirementChecks,
    profile:
      profile && profile.gamerTag && profile.firstName && profile.lastName
        ? {
            gamerTag: profile.gamerTag,
            firstName: profile.firstName,
            lastName: profile.lastName,
            emailMasked: maskEmail(account.email),
            status: profile.status,
            completionPercent: profile.completionPercent,
          }
        : profile
          ? {
              gamerTag: profile.gamerTag ?? "",
              firstName: profile.firstName ?? "",
              lastName: profile.lastName ?? "",
              emailMasked: maskEmail(account.email),
              status: profile.status,
              completionPercent: profile.completionPercent,
            }
          : {
              gamerTag: "",
              firstName: "",
              lastName: "",
              emailMasked: maskEmail(account.email),
              status: "incomplete",
              completionPercent: 0,
            },
  };
}
