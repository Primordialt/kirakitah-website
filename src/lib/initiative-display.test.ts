import {
  getInitiativeCategoryLabel,
  getInitiativeStatusLabel,
} from "@/lib/initiative-display";
import { describe, expect, it } from "vitest";

describe("initiative-display", () => {
  it("maps status labels for accessibility", () => {
    expect(getInitiativeStatusLabel("active")).toBe("Active");
    expect(getInitiativeStatusLabel("coming-soon")).toBe("Coming Soon");
    expect(getInitiativeStatusLabel("archived")).toBe("Completed");
  });

  it("maps category labels", () => {
    expect(getInitiativeCategoryLabel("competition")).toBe("Gaming & eSports");
    expect(getInitiativeCategoryLabel("technology")).toBe("Innovation");
  });
});
