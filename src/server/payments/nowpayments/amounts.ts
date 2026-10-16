const DECIMAL = /^(?:0|[1-9]\d*)(?:\.(\d+))?$/;

/** Convert a decimal string to integer units by flooring extra fraction digits. */
export function decimalToUnits(value: string, scale: number): bigint | null {
  const trimmed = value.trim();
  const match = DECIMAL.exec(trimmed);
  if (!match || scale < 0 || scale > 18) return null;
  const [whole, frac = ""] = trimmed.split(".");
  const digits = `${frac}${"0".repeat(scale)}`.slice(0, scale);
  try {
    return BigInt(whole) * BigInt(10) ** BigInt(scale) + BigInt(digits || "0");
  } catch {
    return null;
  }
}

/** 1 USDT = 1 KK = 1000 milli. Extra USDT precision is floored, never rounded up. */
export function usdtDecimalToMilli(value: string): number | null {
  const units = decimalToUnits(value, 3);
  if (units === null || units > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(units);
}

export function milliToUsdtDecimal(milli: number): string {
  if (!Number.isSafeInteger(milli) || milli < 0) {
    throw new Error("Invalid milli amount");
  }
  const whole = Math.floor(milli / 1000);
  const frac = milli % 1000;
  if (frac === 0) return String(whole);
  return `${whole}.${String(frac).padStart(3, "0").replace(/0+$/, "")}`;
}

export function compareDecimals(left: string, right: string): number | null {
  const a = decimalToUnits(left, 8);
  const b = decimalToUnits(right, 8);
  if (a === null || b === null) return null;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Read a JSON number or string field without converting through binary floating point. */
export function decimalField(raw: string, field: string): string | null {
  const pattern = new RegExp(`"${field}"\\s*:\\s*("?)(\\d+(?:\\.\\d+)?)\\1`);
  const match = pattern.exec(raw);
  return match?.[2] ?? null;
}
