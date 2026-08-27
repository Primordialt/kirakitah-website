import { COMPETITION_NAME } from "@/config/competition";

/**
 * Normalize eFootball username / gamer tag for tournament uniqueness.
 *
 * Rule (integrity, not eligibility):
 * - trim surrounding whitespace
 * - compare case-insensitively (lowercased)
 *
 * Stored display value remains the trimmed original (casing preserved).
 * There was no prior product rule for gamer-tag case sensitivity; uniqueness
 * uses case-insensitive matching so "QDP" and "qdp" cannot both register for
 * the same tournament.
 */
export function normalizeGamerTagForUniqueness(gamerTag: string): string {
  return gamerTag.trim().toLowerCase();
}

/** Trim-only for storage / display (preserves case). */
export function normalizeGamerTagForStorage(gamerTag: string): string {
  return gamerTag.trim();
}

export const EFOOTBALL_ACCOUNT_ALREADY_REGISTERED_MESSAGE = `This eFootball account is already registered for ${COMPETITION_NAME}.`;

export const EFOOTBALL_ACCOUNT_ALREADY_REGISTERED_CODE =
  "EFOOTBALL_ACCOUNT_ALREADY_REGISTERED" as const;

/** Profile verification locks the approved eFootball username for KG926. */
export const APPROVED_EFOOTBALL_ACCOUNT_LOCKED_CODE =
  "APPROVED_EFOOTBALL_ACCOUNT_LOCKED" as const;

export const APPROVED_EFOOTBALL_ACCOUNT_LOCKED_MESSAGE = `Your approved eFootball account is locked for ${COMPETITION_NAME} and cannot be changed.`;

/**
 * True when a proposed gamer tag would change the approved identity
 * under existing uniqueness normalization (trim + lowercase).
 */
export function isGamerTagIdentityChange(
  current: string | null | undefined,
  proposed: string,
): boolean {
  const currentNormalized = normalizeGamerTagForUniqueness(current ?? "");
  const proposedNormalized = normalizeGamerTagForUniqueness(proposed);
  if (!currentNormalized) return false;
  return currentNormalized !== proposedNormalized;
}
