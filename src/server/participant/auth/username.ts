import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { participantAccounts } from "@/server/db/schema";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 24;

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "kirakitah",
  "support",
  "help",
  "root",
  "system",
  "moderator",
  "mod",
  "staff",
  "official",
  "null",
  "undefined",
  "api",
  "www",
  "login",
  "logout",
  "register",
  "signup",
  "signin",
  "dashboard",
  "profile",
  "settings",
  "account",
  "me",
  "user",
  "users",
  "participant",
  "participants",
  "tournament",
  "tournaments",
  "esports",
]);

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string): string | undefined {
  const trimmed = username.trim();
  if (trimmed.length < MIN_USERNAME_LENGTH) {
    return `Username must be at least ${MIN_USERNAME_LENGTH} characters.`;
  }
  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return `Username must be at most ${MAX_USERNAME_LENGTH} characters.`;
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    return "Username may only contain letters, numbers, and underscores.";
  }
  if (RESERVED_USERNAMES.has(normalizeUsername(trimmed))) {
    return "That username is reserved. Please choose another.";
  }
  return undefined;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const normalized = normalizeUsername(username);
  const db = getDb();
  const [hit] = await db
    .select({ id: participantAccounts.id })
    .from(participantAccounts)
    .where(eq(participantAccounts.usernameNormalized, normalized))
    .limit(1);
  return !hit;
}

export async function assertUsernameAvailable(username: string): Promise<void> {
  const available = await isUsernameAvailable(username);
  if (!available) {
    throw new UsernameConflictError();
  }
}

export class UsernameConflictError extends Error {
  readonly code = "DUPLICATE_USERNAME" as const;

  constructor(message = "That username is already taken.") {
    super(message);
    this.name = "UsernameConflictError";
  }
}
