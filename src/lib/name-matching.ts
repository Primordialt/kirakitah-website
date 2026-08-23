/**
 * Normalizes person names for identity comparison.
 * Strips diacritics, punctuation, and collapses whitespace.
 */
export function normalizePersonName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameTokens(name: string): string[] {
  return normalizePersonName(name).split(" ").filter(Boolean);
}

/**
 * Compares applicant-provided name with provider-verified name.
 * Supports reordering and middle-name omission (common on official records).
 */
export function namesMatch(applicantName: string, verifiedName: string): boolean {
  const applicantTokens = nameTokens(applicantName);
  const verifiedTokens = nameTokens(verifiedName);

  if (applicantTokens.length === 0 || verifiedTokens.length === 0) {
    return false;
  }

  const applicantSet = new Set(applicantTokens);
  const verifiedSet = new Set(verifiedTokens);

  if (applicantSet.size === verifiedSet.size) {
    for (const token of applicantSet) {
      if (!verifiedSet.has(token)) {
        return false;
      }
    }
    return true;
  }

  // Applicant may omit middle names present on the official record.
  if (applicantTokens.length < verifiedTokens.length) {
    return applicantTokens.every((token) => verifiedSet.has(token));
  }

  // Verified record may omit middle names the applicant included.
  return verifiedTokens.every((token) => applicantSet.has(token));
}
