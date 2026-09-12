import { test, expect } from "@playwright/test";

/**
 * Admin matches management surfaces — unauthenticated redirect and API guard.
 * Full SUPER_ADMIN edit flow is covered by unit/service tests with synthetic data.
 */
test.describe("Admin tournament matches (unauthenticated)", () => {
  test("matches page redirects to admin login", async ({ page }) => {
    await page.goto("/admin/tournaments/event-kg926/matches");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("match edit API requires authentication", async ({ request }) => {
    const response = await request.post(
      "/api/admin/tournaments/event-kg926/matches/00000000-0000-4000-8000-000000000001",
      {
        data: { action: "edit", date: "2026-09-15", time: "18:00" },
      },
    );
    expect(response.status()).toBeGreaterThanOrEqual(401);
  });

  test("match detail API requires authentication", async ({ request }) => {
    const response = await request.get(
      "/api/admin/tournaments/event-kg926/matches/00000000-0000-4000-8000-000000000001",
    );
    expect(response.status()).toBeGreaterThanOrEqual(401);
  });
});
