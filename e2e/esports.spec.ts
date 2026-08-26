import { test, expect } from "@playwright/test";

test.describe("eSports experience", () => {
  test("desktop /esports loads with tournament information", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/esports");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /YOUR GAME\. YOUR SKILL\. YOUR SHOT\./i,
      }),
    ).toBeVisible();

    const stats = page.getByLabel("Tournament statistics");
    await expect(stats.getByText("128", { exact: true })).toBeVisible();
    await expect(stats.getByText("GRAND PRIZE")).toBeVisible();
    await expect(page.getByRole("heading", { name: /TOURNAMENT JOURNEY/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /REGISTER NOW/i }).first()).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test("mobile /esports loads without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/esports");

    const stats = page.getByLabel("Tournament statistics");
    await expect(stats.getByText("PLAYERS")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "REGISTER", exact: true, level: 3 }),
    ).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});

test.describe("Registration", () => {
  test("legacy /esports/register redirects to participant /register", async ({
    page,
  }) => {
    await page.goto("/esports/register");
    await expect(page).toHaveURL(/\/register$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /JOIN KIRAKITAH/i }),
    ).toBeVisible();
  });
});

test.describe("Rules and FAQ", () => {
  test("/esports/rules loads with sections", async ({ page }) => {
    await page.goto("/esports/rules");
    await expect(
      page.getByRole("heading", { level: 1, name: /TOURNAMENT RULES/i }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Eligibility" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Safeguarding" })).toBeVisible();
  });

  test("/esports/faq loads with accordion", async ({ page }) => {
    await page.goto("/esports/faq");
    await expect(page.getByRole("heading", { level: 1, name: "FAQ" })).toBeVisible();

    const trigger = page.getByRole("button", { name: "Who can participate?" });
    await trigger.click();
    await expect(page.getByText(/Players aged 10 and above/i)).toBeVisible();
  });
});
