import { describe, expect, it } from "vitest";
import { kkToMilli, milliToKkDisplay, parseKkInput } from "@/server/wallet/money";

describe("KK PTS money", () => {
  it("converts KK to milli without float drift", () => {
    expect(kkToMilli(0.5)).toBe(500);
    expect(kkToMilli(6)).toBe(6000);
    expect(kkToMilli(125.5)).toBe(125500);
  });

  it("formats milli for display", () => {
    expect(milliToKkDisplay(500)).toBe("0.5");
    expect(milliToKkDisplay(6000)).toBe("6");
    expect(milliToKkDisplay(125500)).toBe("125.5");
  });

  it("parses user KK input", () => {
    expect(parseKkInput("0.5")).toBe(500);
    expect(parseKkInput("10")).toBe(10000);
  });
});
