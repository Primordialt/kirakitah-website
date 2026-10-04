/** Canonical competition brand name (KIRAKITAH GAMING 926). */
export const COMPETITION_NAME = "KIRAKITAH GAMING 926" as const;

export const TOURNAMENT_EVENT_ID = "event-kg926" as const;

export const TOURNAMENT_SLUG = "kirakitah-gaming-926" as const;

/**
 * Current KG926 edition calendar start date (Africa/Lagos), ISO `YYYY-MM-DD`.
 * Authoritative source for public commencement copy and mock tournament data.
 */
export const KG926_EDITION_START_DATE = "2026-11-01" as const;

/** Start-of-edition instant for mock event/tournament date fields. */
export const KG926_EDITION_START_ISO = "2026-11-01T00:00:00.000Z" as const;

/** Human-readable edition start for public copy (en-GB). */
export const KG926_EDITION_START_DISPLAY = "1 November 2026" as const;

/** Homepage / featured initiative commencement line. */
export const KG926_EDITION_COMMENCEMENT_SHORT = `Commences ${KG926_EDITION_START_DISPLAY}.` as const;

/** Month/year label for edition messaging. */
export const KG926_EDITION_MONTH_YEAR_LABEL = "November 2026" as const;
