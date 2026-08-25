import { test, expect } from "@playwright/test";

test.describe("Global website shell", () => {
  test("foundation placeholder page loads with header and footer", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /THE FUTURE IS YOURS TO CREATE/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  });

  test("mobile menu opens and closes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const menuButton = page.locator('[aria-controls="mobile-navigation"]');
    await expect(menuButton).toBeVisible();
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");

    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByRole("dialog", { name: "Mobile navigation" }),
    ).toBeVisible();

    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("Homepage", () => {
  test("desktop homepage loads without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await expect(
      page.getByRole("link", { name: "EXPLORE KIRAKITAH" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "KIRAKITAH GAMING 926", exact: true }).first(),
    ).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test("mobile homepage shows hero and primary CTA", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: /THE FUTURE IS YOURS TO CREATE/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "EXPLORE KIRAKITAH" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});

test.describe("About page", () => {
  test("loads with main sections and CTA on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/about");

    await expect(
      page.getByRole("heading", { level: 1, name: /MORE THAN ONE THING/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "EXPLORE INITIATIVES" }).first(),
    ).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});

test.describe("Initiatives page", () => {
  test("loads with gaming initiative on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/initiatives");

    await expect(
      page.getByRole("heading", { level: 1, name: /WHAT WE'RE BUILDING/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "KIRAKITAH Gaming" })).toBeVisible();
    await expect(page.getByText("In Development").first()).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
