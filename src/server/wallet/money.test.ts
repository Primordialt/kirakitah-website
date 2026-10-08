import { describe, expect, it } from "vitest";
import {
  ARENA_PRIZE_POOL_BPS,
  DEFAULT_ENTRY_FEE_MILLI,
  DEFAULT_MIN_CHARGED_RESPONSES,
  DEFAULT_MIN_WIN_PRIZE_MILLI,
  DEFAULT_PRIZE_MILLI,
  calculateArenaPrize,
  isArenaPrizePayable,
  kkToMilli,
  milliToKkDisplay,
  parseKkInput,
} from "@/server/wallet/money";

describe("KK PTS money", () => {
  it("converts KK to milli without float drift", () => {
    expect(kkToMilli(0.5)).toBe(500);
    expect(kkToMilli(3)).toBe(3000);
    expect(kkToMilli(125.5)).toBe(125500);
  });

  it("formats milli for display", () => {
    expect(milliToKkDisplay(500)).toBe("0.5");
    expect(milliToKkDisplay(3000)).toBe("3");
    expect(milliToKkDisplay(125500)).toBe("125.5");
  });

  it("locks Arena economics", () => {
    expect(DEFAULT_ENTRY_FEE_MILLI).toBe(500);
    expect(DEFAULT_MIN_WIN_PRIZE_MILLI).toBe(3000);
    expect(DEFAULT_PRIZE_MILLI).toBe(3000);
    expect(ARENA_PRIZE_POOL_BPS).toBe(6000);
    expect(DEFAULT_MIN_CHARGED_RESPONSES).toBe(10);
    expect(milliToKkDisplay(DEFAULT_ENTRY_FEE_MILLI)).toBe("0.5");
    expect(milliToKkDisplay(DEFAULT_MIN_WIN_PRIZE_MILLI)).toBe("3");
  });

  it("pays 60% of the final pool with a 3 KK floor", () => {
    const cases = [
      { entries: 10, prize: 3000, pool: 5000 },
      { entries: 20, prize: 6000, pool: 10000 },
      { entries: 30, prize: 9000, pool: 15000 },
      { entries: 50, prize: 15000, pool: 25000 },
      { entries: 100, prize: 30000, pool: 50000 },
      { entries: 500, prize: 150000, pool: 250000 },
    ];
    for (const row of cases) {
      const quote = calculateArenaPrize({ chargedEntries: row.entries });
      expect(quote.poolMilli).toBe(row.pool);
      expect(quote.prizeMilli).toBe(row.prize);
      expect(quote.platformRemainderMilli).toBe(row.pool - row.prize);
      expect(quote.prizeMilli + quote.platformRemainderMilli).toBe(quote.poolMilli);
    }
  });

  it("uses the final charged count, not a stale smaller count", () => {
    const earlier = calculateArenaPrize({ chargedEntries: 20 });
    const final = calculateArenaPrize({ chargedEntries: 21 });
    expect(earlier.prizeMilli).toBe(6000);
    expect(final.prizeMilli).toBe(6300);
    expect(final.prizeMilli).not.toBe(earlier.prizeMilli);
  });

  it("refuses a prize when the charged pool cannot cover it", () => {
    const quote = calculateArenaPrize({ chargedEntries: 9 });
    expect(quote.poolMilli).toBe(4500);
    expect(isArenaPrizePayable({ chargedEntries: 9 })).toBe(false);
    expect(isArenaPrizePayable({ chargedEntries: 10 })).toBe(true);
  });

  it("parses user KK input", () => {
    expect(parseKkInput("0.5")).toBe(500);
    expect(parseKkInput("10")).toBe(10000);
  });
});
