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
  test("minor age triggers guardian fields", async ({ page }) => {
    await page.goto("/esports/register");
    await page.getByLabel("Date of birth").fill("2012-03-10");
    await expect(
      page.getByRole("group", { name: /IDENTITY VERIFICATION/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: /PARENT \/ GUARDIAN INFORMATION/i }),
    ).toBeVisible();
  });

  test("adult age does not show guardian fields", async ({ page }) => {
    await page.goto("/esports/register");
    await page.getByLabel("Date of birth").fill("1995-06-15");
    await expect(
      page.getByRole("group", { name: /PARENT \/ GUARDIAN INFORMATION/i }),
    ).toHaveCount(0);
  });

  test("registration flow with mock success", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/esports/register");

    await expect(
      page.getByRole("heading", { level: 1, name: /YOUR GAME\. YOUR SKILL\. YOUR SHOT\./i }),
    ).toBeVisible();

    await page.getByLabel("Full name").fill("E2E Test Player");
    await page.getByLabel("Date of birth").fill("1995-06-15");
    await page.getByLabel("Country").selectOption("NG");
    await page.getByLabel("City / location").fill("Lagos");
    await page.getByLabel(/^Email/i).fill("e2e.player@example.com");
    await page.getByLabel("Phone number").fill("08000000000");

    await page.getByLabel("Identification type").selectOption("nin");
    await page.getByRole("textbox", { name: "NIN" }).fill("12345678901");
    await page.getByLabel("Player photo").setInputFiles({
      name: "player-photo.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("mock-player-photo"),
    });

    await page.getByLabel("Gamer tag").fill("E2EPlayer");
    await page.getByLabel("Mobile platform").selectOption("android");
    await page.getByLabel("Time zone").selectOption("Africa/Lagos");
    await page.getByText("Flexible — will adapt to schedule").click();
    await page.getByText("I have read and accept the tournament rules").click();
    await page.getByText("I accept the terms and conditions").click();
    await page.getByText("I accept the privacy policy").click();
    await page.getByText("I agree to the code of conduct").click();
    await page.getByText("I consent to media coverage of tournament participation").click();

    await page.getByRole("button", { name: /SUBMIT APPLICATION/i }).click();

    await expect(page.getByText(/YOU'RE IN THE SYSTEM/i)).toBeVisible({ timeout: 10000 });
  });

  test("invalid submission is blocked", async ({ page }) => {
    await page.goto("/esports/register");
    await page.getByRole("button", { name: /SUBMIT APPLICATION/i }).click();
    await expect(page.getByText("Full name is required")).toBeVisible();
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
