/** 1 KK = 1000 milli-KK (0.001 KK precision). */
export const MILLI_PER_KK = 1000;

/** Arena economics (milli-KK). 500 = 0.5 KK per accepted response. 3000 = 3 KK prize. */
export const DEFAULT_ENTRY_FEE_MILLI = 500;
export const DEFAULT_PRIZE_MILLI = 3000;
/** Minimum successfully charged responses required to validate a round. */
export const DEFAULT_MIN_CHARGED_RESPONSES = 10;
export const DEFAULT_MIN_UNIQUE_RESPONDERS = DEFAULT_MIN_CHARGED_RESPONSES;
export const DEFAULT_INTERMISSION_SECONDS = 10;
export const DEFAULT_ROUND_DURATION_SECONDS = 30;

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
