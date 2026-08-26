import { test, expect } from "@playwright/test";

/**
 * Deterministic CI E2E for match scheduling surfaces.
 * Authenticated schedule/reschedule against Production is out of scope here.
 * Full mutation flow is covered by unit/service tests with local/synthetic data.
 */
test.describe("Admin match schedule (unauthenticated)", () => {
  test("schedule board redirects to admin login", async ({ page }) => {
    await page.goto("/admin/tournaments/event-kg926/schedule");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("qualification pod schedule surface redirects to admin login", async ({
    page,
  }) => {
    await page.goto("/admin/tournaments/event-kg926/qualification/pods/1");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("knockout schedule surface redirects to admin login", async ({ page }) => {
    await page.goto("/admin/tournaments/event-kg926/knockout");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("match schedule API requires authentication", async ({ request }) => {
    const response = await request.get(
      "/api/admin/matches/00000000-0000-4000-8000-000000000001",
    );
    expect(response.status()).toBeGreaterThanOrEqual(401);
  });
});
