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
    const dob = page.getByLabel("Date of birth");
    await dob.click();
    await dob.fill("2012-03-10");
    // Ensure React Hook Form receives the change (date inputs can be flaky with fill alone).
    await dob.press("Tab");
    await expect(
      page.getByRole("group", { name: /IDENTITY VERIFICATION/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: /PARENT \/ GUARDIAN INFORMATION/i }),
    ).toBeVisible({ timeout: 10_000 });
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

    await page.route("**/api/registrations/email/challenge", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          challengeId: "00000000-0000-4000-8000-000000000001",
          resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
          message: "Verification email sent.",
        }),
      });
    });
    await page.route("**/api/registrations/email/verify", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          emailVerificationToken: "e2e-test-verification-token",
          expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
          message: "Email verified.",
        }),
      });
    });

    await page.goto("/esports/register");

    await expect(
      page.getByRole("heading", { level: 1, name: /REGISTER FOR KIRAKITAH GAMING 926/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /BEFORE YOU APPLY/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: /FOLLOW KIRAKITAH/i }),
    ).toBeVisible();

    await page.getByLabel("Email address").fill("e2e.player@example.com");
    await page.getByRole("button", { name: /SEND VERIFICATION CODE/i }).click();
    await page.getByLabel("Verification code").fill("123456");
    await page.getByRole("button", { name: /VERIFY EMAIL/i }).click();
    await expect(page.getByText(/^Email verified\.$/i)).toBeVisible();

    await page.getByLabel("Full name").fill("E2E Test Player");
    await page.getByLabel("Date of birth").fill("1995-06-15");
    await page.getByLabel("Country").selectOption("NG");
    await page.getByLabel("City / location").fill("Lagos");
    await page.getByLabel("Phone number").fill("08000000000");

    await page.getByLabel("Identification type").selectOption("nin");
    await page.getByRole("textbox", { name: "NIN" }).fill("12345678901");
    await page.getByLabel("Player photo").setInputFiles({
      name: "player-photo.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0xff, 0xd9,
      ]),
    });

    await page.getByLabel(/Gamer Tag/i).fill("E2EPlayer");
    await page.getByLabel(/X username/i).fill("e2e_x");
    await page.getByLabel(/Instagram username/i).fill("e2e_ig");
    await page.getByLabel(/TikTok username/i).fill("e2e_tt");
    await page
      .getByText(/I confirm that I follow KIRAKITAH on all three official social platforms listed above/i)
      .click();
    await page.getByLabel("Mobile platform").selectOption("android");
    await page.getByLabel("Time zone").selectOption("Africa/Lagos");
    await page.getByText("Flexible — will adapt to schedule").click();
    await page
      .getByLabel(/I have read and accept the.*tournament rules/i)
      .check({ force: true });
    await page
      .getByLabel(/I accept the.*terms and conditions/i)
      .check({ force: true });
    await page.getByLabel(/I accept the.*privacy policy/i).check({ force: true });
    await page.getByLabel(/I agree to the.*code of conduct/i).check({ force: true });
    await page
      .getByLabel(/I consent to media coverage of tournament participation/i)
      .check({ force: true });

    await page.getByRole("button", { name: /SUBMIT APPLICATION/i }).click();

    await expect(page.getByText(/APPLICATION RECEIVED/i)).toBeVisible({ timeout: 10000 });
  });

  test("invalid submission is blocked", async ({ page }) => {
    await page.goto("/esports/register");
    await expect(
      page.getByRole("button", { name: /SUBMIT APPLICATION/i }),
    ).toBeDisabled();
    await expect(
      page.getByText(/Verify your email above before submitting/i),
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
