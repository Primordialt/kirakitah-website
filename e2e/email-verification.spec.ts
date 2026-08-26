import { test, expect } from "@playwright/test";

async function mockEmailVerificationApis(page: import("@playwright/test").Page) {
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
  await page.route("**/api/registrations/email/resend", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        challengeId: "00000000-0000-4000-8000-000000000002",
        resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
        message: "Verification email sent.",
      }),
    });
  });
}

test.describe("Pre-registration email verification", () => {
  test("submit stays blocked until email is verified", async ({ page }) => {
    await page.goto("/esports/register");
    await expect(
      page.getByRole("group", { name: /EMAIL VERIFICATION/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /SUBMIT APPLICATION/i }),
    ).toBeDisabled();
    await expect(
      page.getByText(/Verify your email above before submitting/i),
    ).toBeVisible();
  });

  test("duplicate registered email shows approved message", async ({ page }) => {
    await page.route("**/api/registrations/email/challenge", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "DUPLICATE_EMAIL",
            message:
              "This email address is already registered for KIRAKITAH GAMING 926.",
          },
        }),
      });
    });

    await page.goto("/esports/register");
    await page.getByLabel("Email address").fill("taken@example.com");
    await page.getByRole("button", { name: /SEND VERIFICATION CODE/i }).click();
    await expect(
      page.getByText(
        /This email address is already registered for KIRAKITAH GAMING 926\./i,
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /SUBMIT APPLICATION/i }),
    ).toBeDisabled();
  });

  test("verify email then complete registration to APPLICATION RECEIVED", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await mockEmailVerificationApis(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/esports/register");

    await page.getByLabel("Email address").fill("e2e.player@example.com");
    await page.getByRole("button", { name: /SEND VERIFICATION CODE/i }).click();
    await expect(page.getByText(/Verification email sent/i)).toBeVisible();
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
      .getByText(
        /I confirm that I follow KIRAKITAH on all three official social platforms listed above/i,
      )
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
    await expect(page.getByText(/APPLICATION RECEIVED/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
