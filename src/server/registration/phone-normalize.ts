/**
 * Normalize phone numbers for duplicate detection only.
 * Does not rewrite country codes or invent E.164 conversions.
 * Original user-entered phone remains the stored display value.
 */
export function normalizePhoneForUniqueness(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isValidNormalizedPhone(normalized: string): boolean {
  return normalized.length >= 8 && normalized.length <= 15;
}
