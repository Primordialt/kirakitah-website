import { test, expect } from "@playwright/test";

test.describe("Admin qualification (unauthenticated)", () => {
  test("qualification page redirects to admin login", async ({ page }) => {
    await page.goto("/admin/tournaments/event-kg926/qualification");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("qualification pod detail redirects to admin login", async ({ page }) => {
    await page.goto("/admin/tournaments/event-kg926/qualification/pods/1");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("qualification participants redirects to admin login", async ({ page }) => {
    await page.goto("/admin/tournaments/event-kg926/qualification/participants");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("qualification top-32 redirects to admin login", async ({ page }) => {
    await page.goto("/admin/tournaments/event-kg926/qualification/top-32");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
