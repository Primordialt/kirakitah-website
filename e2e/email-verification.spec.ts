import { test, expect } from "@playwright/test";

test.describe("Participant registration email verification", () => {
  test("email-only register screen challenges then verifies", async ({
    page,
  }) => {
    await page.route(
      "**/api/participant/auth/email/challenge",
      async (route) => {
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
      },
    );
    await page.route("**/api/participant/auth/email/verify", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          emailVerificationToken: "e2e-test-verification-token",
          expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        }),
      });
    });

    await page.goto("/register");
    await page.getByLabel("Email").fill("e2e.player@example.com");
    await page.getByRole("button", { name: /CONTINUE/i }).click();
    await page.getByLabel("Verification code").fill("123456");
    await page.getByRole("button", { name: /VERIFY/i }).click();
    await expect(page).toHaveURL(/\/register\/username/);
  });

  test("account exists shows login message", async ({ page }) => {
    await page.route(
      "**/api/participant/auth/email/challenge",
      async (route) => {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "ACCOUNT_EXISTS",
              message:
                "This email is already registered for KIRAKITAH GAMING 926. Please log in to continue.",
            },
          }),
        });
      },
    );

    await page.goto("/register");
    await page.getByLabel("Email").fill("taken@example.com");
    await page.getByRole("button", { name: /CONTINUE/i }).click();
    await expect(
      page.getByRole("heading", { name: /EMAIL ALREADY REGISTERED/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/This email is already registered for KIRAKITAH GAMING 926/i),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /^LOGIN$/i }).first()).toBeVisible();
    await expect(page.getByLabel("Verification code")).toHaveCount(0);
  });
});
