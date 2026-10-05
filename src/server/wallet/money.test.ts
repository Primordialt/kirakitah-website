import { describe, expect, it } from "vitest";
import {
  DEFAULT_ENTRY_FEE_MILLI,
  DEFAULT_MIN_CHARGED_RESPONSES,
  DEFAULT_PRIZE_MILLI,
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
    expect(DEFAULT_PRIZE_MILLI).toBe(3000);
    expect(DEFAULT_MIN_CHARGED_RESPONSES).toBe(10);
    expect(milliToKkDisplay(DEFAULT_ENTRY_FEE_MILLI)).toBe("0.5");
    expect(milliToKkDisplay(DEFAULT_PRIZE_MILLI)).toBe("3");
  });

  it("parses user KK input", () => {
    expect(parseKkInput("0.5")).toBe(500);
    expect(parseKkInput("10")).toBe(10000);
  });
});
