/**
 * Official KIRAKITAH social platforms — single source of truth.
 *
 * KG926 required follow platforms: X, Instagram, TikTok.
 * YouTube remains in the platform model for future use but is NOT required
 * until an official YouTube URL is explicitly provided.
 */

/** All known platform keys (extensible). Includes optional future platforms. */
export const SOCIAL_PLATFORMS = [
  "x",
  "instagram",
  "tiktok",
  "youtube",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface OfficialSocialAccount {
  platform: SocialPlatform;
  label: string;
  /** Official KIRAKITAH account URL — null when not yet configured. */
  href: string | null;
  handleFieldLabel: string;
  handlePlaceholder: string;
  /** When true, required for KG926 social-follow eligibility. */
  requiredForKg926: boolean;
}

/**
 * Official accounts. Required KG926 follow set = requiredForKg926 true.
 * Do not invent URLs for platforms without Product Owner confirmation.
 */
export const OFFICIAL_SOCIAL_ACCOUNTS: readonly OfficialSocialAccount[] = [
  {
    platform: "x",
    label: "X",
    href: "https://x.com/Kirakitah",
    handleFieldLabel: "X username",
    handlePlaceholder: "Your X username",
    requiredForKg926: true,
  },
  {
    platform: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/kirakitah",
    handleFieldLabel: "Instagram username",
    handlePlaceholder: "Your Instagram username",
    requiredForKg926: true,
  },
  {
    platform: "tiktok",
    label: "TikTok",
    href: "https://www.tiktok.com/@kirakitah926",
    handleFieldLabel: "TikTok username",
    handlePlaceholder: "Your TikTok username",
    requiredForKg926: true,
  },
  {
    platform: "youtube",
    label: "YouTube",
    href: null,
    handleFieldLabel: "YouTube handle / channel name",
    handlePlaceholder: "Your YouTube handle or channel name",
    requiredForKg926: false,
  },
] as const;

/** KG926 required platform keys (excludes optional platforms such as YouTube). */
export type RequiredKg926SocialPlatform = "x" | "instagram" | "tiktok";

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

/** Platforms applicants must follow for KG926 participation. */
export const REQUIRED_SOCIAL_PLATFORMS: readonly RequiredKg926SocialPlatform[] =
  OFFICIAL_SOCIAL_ACCOUNTS.filter(isRequiredKg926Account).map(
    (account) => account.platform,
  );

export const REQUIRED_SOCIAL_ACCOUNTS: readonly RequiredKg926SocialAccount[] =
  OFFICIAL_SOCIAL_ACCOUNTS.filter(isRequiredKg926Account);

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
