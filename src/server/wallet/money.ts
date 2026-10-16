/** 1 KK = 1000 milli-KK (0.001 KK precision). */
export const MILLI_PER_KK = 1000;

/** Arena economics (milli-KK). 500 = 0.5 KK per accepted response. */
export const DEFAULT_ENTRY_FEE_MILLI = 500;
/** Floor paid to a valid-round winner. 3000 milli = 3 KK. */
export const DEFAULT_MIN_WIN_PRIZE_MILLI = 3000;
export const DEFAULT_PRIZE_MILLI = DEFAULT_MIN_WIN_PRIZE_MILLI;
/** 6000 basis points = 60% of the charged-entry pool. */
export const ARENA_PRIZE_POOL_BPS = 6000;
/** Minimum successfully charged responses required to validate a round. */
export const DEFAULT_MIN_CHARGED_RESPONSES = 10;
export const DEFAULT_MIN_UNIQUE_RESPONDERS = DEFAULT_MIN_CHARGED_RESPONSES;
export const DEFAULT_INTERMISSION_SECONDS = 10;
export const DEFAULT_ROUND_DURATION_SECONDS = 30;

export function canSpend(balanceMilli: number, reservedMilli: number, amountMilli: number): boolean {
  return amountMilli > 0 && balanceMilli - reservedMilli >= amountMilli;
}

export function milliToKkDisplay(milli: number): string {
  const whole = Math.floor(milli / MILLI_PER_KK);
  const frac = Math.abs(milli % MILLI_PER_KK);
  if (frac === 0) return whole.toFixed(0);
  return `${whole}.${frac.toString().padStart(3, "0").replace(/0+$/, "")}`;
}

export function kkToMilli(kk: number): number {
  if (!Number.isFinite(kk) || kk < 0) {
    throw new Error("Invalid KK amount");
  }
  return Math.round(kk * MILLI_PER_KK);
}

export function parseKkInput(input: string): number {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,3})?$/.test(trimmed)) {
    throw new Error("Invalid amount format");
  }
  const [whole, frac = ""] = trimmed.split(".");
  const milli =
    Number(whole) * MILLI_PER_KK + Number(frac.padEnd(3, "0").slice(0, 3));
  if (!Number.isSafeInteger(milli) || milli <= 0) {
    throw new Error("Amount must be positive");
  }
  return milli;
}

export type ArenaPrizeQuote = {
  poolMilli: number;
  prizeMilli: number;
  platformRemainderMilli: number;
};

/**
 * Winner prize is 60% of the charged-entry pool, and never below 3 KK.
 * Integer milli-KK only. Settlement must call this with the final charged count.
 * Invalid rounds (under the minimum) are not paid; do not use this quote as a payout then.
 */
export function calculateArenaPrize(input: {
  chargedEntries: number;
  entryFeeMilli?: number;
  minPrizeMilli?: number;
  prizePoolBps?: number;
}): ArenaPrizeQuote {
  const chargedEntries = input.chargedEntries;
  const entryFeeMilli = input.entryFeeMilli ?? DEFAULT_ENTRY_FEE_MILLI;
  const minPrizeMilli = input.minPrizeMilli ?? DEFAULT_MIN_WIN_PRIZE_MILLI;
  const prizePoolBps = input.prizePoolBps ?? ARENA_PRIZE_POOL_BPS;
  if (!Number.isSafeInteger(chargedEntries) || chargedEntries < 0) {
    throw new Error("Invalid charged entry count");
  }
  if (!Number.isSafeInteger(entryFeeMilli) || entryFeeMilli < 0) {
    throw new Error("Invalid entry fee");
  }
  const poolMilli = chargedEntries * entryFeeMilli;
  const shareMilli = Math.floor((poolMilli * prizePoolBps) / 10_000);
  const prizeMilli = Math.max(minPrizeMilli, shareMilli);
  return {
    poolMilli,
    prizeMilli,
    platformRemainderMilli: poolMilli - prizeMilli,
  };
}

/** A prize is payable only for a valid round whose pool covers the calculated prize. */
export function isArenaPrizePayable(input: {
  chargedEntries: number;
  minChargedEntries?: number;
  entryFeeMilli?: number;
}): boolean {
  const minChargedEntries = input.minChargedEntries ?? DEFAULT_MIN_CHARGED_RESPONSES;
  if (input.chargedEntries < minChargedEntries) return false;
  const quote = calculateArenaPrize({
    chargedEntries: input.chargedEntries,
    entryFeeMilli: input.entryFeeMilli,
  });
  return quote.prizeMilli >= 0 && quote.prizeMilli <= quote.poolMilli && quote.platformRemainderMilli >= 0;
}

export function arenaPrizeIdempotencyKey(roundId: string): string {
  return `arena-prize:${roundId}`;
}
