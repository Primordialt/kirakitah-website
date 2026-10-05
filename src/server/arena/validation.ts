const QUICKFIRE_OPTIONS = new Set(["A", "B", "C", "D"]);

export function normalizeQuickfireOption(input: string): string {
  return input.trim().toUpperCase().slice(0, 1);
}

export function isValidQuickfireOption(input: string): boolean {
  return QUICKFIRE_OPTIONS.has(normalizeQuickfireOption(input));
}

export function gradeQuickfire(submitted: string, correctOption: string): boolean {
  return normalizeQuickfireOption(submitted) === normalizeQuickfireOption(correctOption);
}

/** TypeRush: trim, collapse internal whitespace, case-sensitive exact match on normalized challenge. */
export function normalizeTyperushText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function gradeTyperush(submitted: string, normalizedChallenge: string): boolean {
  return normalizeTyperushText(submitted) === normalizedChallenge;
}

export function buildTyperushNormalized(challengeText: string): string {
  return normalizeTyperushText(challengeText);
}
