import { test, expect } from "@playwright/test";

test.describe("Admin knockout (unauthenticated)", () => {
  test("knockout page redirects to admin login", async ({ page }) => {
    await page.goto("/admin/tournaments/event-kg926/knockout");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
