import { test, expect } from "@playwright/test";

test.describe("Chatbox access", () => {
  test("unauthenticated chatbox redirects to login", async ({ page }) => {
    await page.goto("/chatbox");
    await expect(page).toHaveURL(/\/login/);
    expect(page.url()).toContain("next=%2Fchatbox");
  });
});
