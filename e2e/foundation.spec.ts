import { test, expect } from "@playwright/test";

test("foundation placeholder page loads", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "KIRAKITAH" }),
  ).toBeVisible();
});
