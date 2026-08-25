/**
 * Official KIRAKITAH social platforms — single source of truth.
 *
 * href values come from the existing site configuration (currently unset).
 * Do not invent platform URLs here; Product Owner supplies real links when ready.
 */

export const SOCIAL_PLATFORMS = ["instagram", "tiktok", "youtube"] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface OfficialSocialAccount {
  platform: SocialPlatform;
  label: string;
  /** Official KIRAKITAH account URL — null until Product Owner configures it. */
  href: string | null;
  handleFieldLabel: string;
  handlePlaceholder: string;
}

/**
 * Required platforms for tournament social-follow compliance (KG926).
 * URLs mirror existing navigation / esports placeholders (null until configured).
 */
export const OFFICIAL_SOCIAL_ACCOUNTS: readonly OfficialSocialAccount[] = [
  {
    platform: "instagram",
    label: "Instagram",
    href: null,
    handleFieldLabel: "Instagram username",
    handlePlaceholder: "Your Instagram username",
  },
  {
    platform: "tiktok",
    label: "TikTok",
    href: null,
    handleFieldLabel: "TikTok username",
    handlePlaceholder: "Your TikTok username",
  },
  {
    platform: "youtube",
    label: "YouTube",
    href: null,
    handleFieldLabel: "YouTube handle / channel name",
    handlePlaceholder: "Your YouTube handle or channel name",
  },
] as const;

export const REQUIRED_SOCIAL_PLATFORMS: readonly SocialPlatform[] =
  OFFICIAL_SOCIAL_ACCOUNTS.map((account) => account.platform);

/** Footer / nav shape — reuses official account entries. */
export function officialSocialFooterLinks(): Array<{
  label: string;
  href: string | null;
  external: true;
}> {
  return OFFICIAL_SOCIAL_ACCOUNTS.map((account) => ({
    label: account.label,
    href: account.href,
    external: true as const,
  }));
}
