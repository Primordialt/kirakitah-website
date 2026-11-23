import { describe, expect, it } from "vitest";
import { pushSubscriptionSchema, safeNotificationPath } from "@/server/push/subscription";

describe("push subscriptions", () => {
  it("accepts an https device endpoint and rejects web addresses that are not https", () => {
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: "https://updates.push.services.mozilla.com/wpush/v2/abc",
        keys: { p256dh: "key", auth: "auth" },
      }).success,
    ).toBe(true);
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: "http://updates.example/wpush",
        keys: { p256dh: "key", auth: "auth" },
      }).success,
    ).toBe(false);
  });

  it("keeps a tapped alert inside the site", () => {
    expect(safeNotificationPath("/wallet")).toBe("/wallet");
    expect(safeNotificationPath("https://evil.example")).toBe("/notifications");
    expect(safeNotificationPath("//evil.example")).toBe("/notifications");
  });
});
