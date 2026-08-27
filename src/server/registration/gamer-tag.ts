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
