import { describe, expect, it } from "vitest";
import { podFillLabel } from "@/lib/admin/pod-fill-label";

describe("podFillLabel", () => {
  it("labels empty, partial, and full pods with text not colour alone", () => {
    expect(podFillLabel(0, 4)).toBe("EMPTY");
    expect(podFillLabel(2, 4)).toBe("PARTIAL");
    expect(podFillLabel(4, 4)).toBe("FULL");
  });
});
