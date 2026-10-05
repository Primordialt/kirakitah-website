import { ArenaError } from "@/server/arena/errors";

const WINDOW_MS = 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 15;

const recentByAccount = new Map<string, number[]>();

export function assertArenaSubmissionRateLimit(participantAccountId: string): void {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const prior = recentByAccount.get(participantAccountId) ?? [];
  const inWindow = prior.filter((t) => t >= windowStart);
  if (inWindow.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    throw new ArenaError(
      "Too many submissions. Slow down and try again.",
      "RATE_LIMITED",
      429,
    );
  }
  inWindow.push(now);
  recentByAccount.set(participantAccountId, inWindow);
}

export function resetArenaSubmissionRateLimitForTests() {
  recentByAccount.clear();
}
