/**
 * Official KIRAKITAH social platforms — single source of truth.
 *
 * KG926 required platforms: X, Instagram, TikTok, YouTube (subscription).
 */

/** All known platform keys (extensible). */
export const SOCIAL_PLATFORMS = [
  "x",
  "instagram",
  "tiktok",
  "youtube",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/** How a required platform is verified — follow handle vs YouTube subscription. */
export type SocialRequirementKind = "follow" | "subscription";

export interface OfficialSocialAccount {
  platform: SocialPlatform;
  label: string;
  /** Official KIRAKITAH account URL — null when not yet configured. */
  href: string | null;
  handleFieldLabel: string;
  handlePlaceholder: string;
  /** When true, required for KG926 social-follow eligibility. */
  requiredForKg926: boolean;
  /** Follow platforms require an applicant handle; subscription uses optional channel. */
  requirementKind: SocialRequirementKind;
}

/** Official KIRAKITAH YouTube channel for KG926 subscription requirement. */
export const KIRAKITAH_YOUTUBE_CHANNEL_URL =
  "https://youtube.com/@Kirakitah926" as const;

/** Placeholder when an existing application awaits YouTube subscription attestation. */
export const YOUTUBE_SUBSCRIPTION_PENDING_HANDLE = "Pending attestation";

/** Recorded when a participant attests YouTube subscription — still pending manual review. */
export const YOUTUBE_SUBSCRIPTION_ATTESTED_HANDLE =
  "Subscription attested — pending review";

/**
 * Official accounts. Required KG926 set = requiredForKg926 true.
 */
export const OFFICIAL_SOCIAL_ACCOUNTS: readonly OfficialSocialAccount[] = [
  {
    platform: "x",
    label: "X",
    href: "https://x.com/Kirakitah",
    handleFieldLabel: "X username",
    handlePlaceholder: "Your X username",
    requiredForKg926: true,
    requirementKind: "follow",
  },
  {
    platform: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/kirakitah",
    handleFieldLabel: "Instagram username",
    handlePlaceholder: "Your Instagram username",
    requiredForKg926: true,
    requirementKind: "follow",
  },
  {
    platform: "tiktok",
    label: "TikTok",
    href: "https://www.tiktok.com/@kirakitah926",
    handleFieldLabel: "TikTok username",
    handlePlaceholder: "Your TikTok username",
    requiredForKg926: true,
    requirementKind: "follow",
  },
  {
    platform: "youtube",
    label: "YouTube",
    href: KIRAKITAH_YOUTUBE_CHANNEL_URL,
    handleFieldLabel: "YouTube channel (optional)",
    handlePlaceholder: "Your YouTube channel or handle (helps our team verify)",
    requiredForKg926: true,
    requirementKind: "subscription",
  },
] as const;

/** KG926 required platform keys. */
export type RequiredKg926SocialPlatform =
  | "x"
  | "instagram"
  | "tiktok"
  | "youtube";

type RequiredKg926SocialAccount = OfficialSocialAccount & {
  platform: RequiredKg926SocialPlatform;
  requiredForKg926: true;
  href: string;
};

function isRequiredKg926Account(
  account: OfficialSocialAccount,
): account is RequiredKg926SocialAccount {
  return account.requiredForKg926 === true && Boolean(account.href);
}

/** Platforms applicants must satisfy for KG926 participation. */
export const REQUIRED_SOCIAL_PLATFORMS: readonly RequiredKg926SocialPlatform[] =
  OFFICIAL_SOCIAL_ACCOUNTS.filter(isRequiredKg926Account).map(
    (account) => account.platform,
  );

export const REQUIRED_SOCIAL_ACCOUNTS: readonly RequiredKg926SocialAccount[] =
  OFFICIAL_SOCIAL_ACCOUNTS.filter(isRequiredKg926Account);

/** Required platforms where the applicant must supply a social handle. */
export const REQUIRED_FOLLOW_ACCOUNTS = REQUIRED_SOCIAL_ACCOUNTS.filter(
  (account) => account.requirementKind === "follow",
);

/** Required subscription platforms (YouTube). */
export const REQUIRED_SUBSCRIPTION_ACCOUNTS = REQUIRED_SOCIAL_ACCOUNTS.filter(
  (account) => account.requirementKind === "subscription",
);

export function getRequiredSocialAccount(
  platform: RequiredKg926SocialPlatform,
): RequiredKg926SocialAccount {
  const account = REQUIRED_SOCIAL_ACCOUNTS.find(
    (item) => item.platform === platform,
  );
  if (!account) {
    throw new Error(`Unknown required social platform: ${platform}`);
  }
  return account;
}

/** Public footer / nav — only platforms with configured official URLs. */
export function officialSocialFooterLinks(): Array<{
  label: string;
  href: string;
  external: true;
}> {
  return OFFICIAL_SOCIAL_ACCOUNTS.filter(
    (account): account is OfficialSocialAccount & { href: string } =>
      Boolean(account.href),
  ).map((account) => ({
    label: account.label,
    href: account.href,
    external: true as const,
  }));
}
