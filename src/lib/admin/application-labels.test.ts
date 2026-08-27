import { describe, expect, it } from "vitest";
import {
  APPLICATION_STATUS_FILTERS,
  formatApplicationStatusLabel,
  formatIdentityStatusLabel,
  formatSocialStatusLabel,
} from "@/lib/admin/application-labels";

describe("admin application labels", () => {
  it("maps application statuses to operator-friendly labels", () => {
    expect(formatApplicationStatusLabel("received")).toBe("Received");
    expect(formatApplicationStatusLabel("under_review")).toBe("Under review");
    expect(formatApplicationStatusLabel("verified")).toBe("Verified");
    expect(formatApplicationStatusLabel("rejected")).toBe("Rejected");
  });

  it("maps identity and social statuses without colour-only meaning", () => {
    expect(formatIdentityStatusLabel("pending_review")).toBe("Pending");
    expect(formatSocialStatusLabel("rejected")).toBe("Requires action");
  });

  it("exposes only authoritative application status filters", () => {
    expect(APPLICATION_STATUS_FILTERS.map((item) => item.value)).toEqual([
      "",
      "received",
      "under_review",
      "verified",
      "rejected",
      "withdrawn",
    ]);
  });
});
