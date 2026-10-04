export const COMMUNITY_ROOM_SLUG = "kirakitah-community" as const;

export const COMMUNITY_ROOM_ID = "c0a70000-0000-4000-8000-000000000001" as const;

export const CHAT_MAX_MESSAGE_LENGTH = 2000;

export const CHAT_MESSAGES_PAGE_SIZE = 40;

/** Minimum interval between sends per participant (ms). */
export const CHAT_SEND_COOLDOWN_MS = 1500;

/** Max messages per participant per minute. */
export const CHAT_SEND_RATE_LIMIT_PER_MINUTE = 20;

export const MENTION_USERNAME_PATTERN = /@([a-zA-Z0-9_]{3,32})/g;
