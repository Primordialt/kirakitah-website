import { test, expect } from "@playwright/test";

test.describe("Admin scheduling and policy (unauthenticated)", () => {
  test("policy page redirects to admin login", async ({ page }) => {
    await page.goto("/admin/tournaments/event-kg926/policy");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("public match schedule mutation is rejected", async ({ request }) => {
    const response = await request.post("/api/admin/matches/00000000-0000-0000-0000-000000000001", {
      data: {
        action: "schedule",
        scheduledAt: "2026-09-15T18:00:00.000Z",
        timezone: "Africa/Lagos",
      },
    });
    expect(response.status()).toBeGreaterThanOrEqual(401);
  });
});
