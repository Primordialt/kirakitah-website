import { test, expect } from "@playwright/test";

test.describe("Participant account UI", () => {
  test("register email screen shows only email field and continue", async ({
    page,
  }) => {
    await page.route("**/api/participant/auth/email/challenge", async (route) => {
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

    await page.goto("/register");

    await expect(
      page.getByRole("heading", { level: 1, name: /JOIN KIRAKITAH/i }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: /CONTINUE/i })).toBeVisible();

    await expect(page.getByLabel(/password/i)).toHaveCount(0);
    await expect(page.getByLabel(/username/i)).toHaveCount(0);
    await expect(page.getByLabel(/first name/i)).toHaveCount(0);
    await expect(page.getByLabel(/NIN/i)).toHaveCount(0);
    await expect(page.getByLabel(/player photo/i)).toHaveCount(0);

    await page.getByLabel("Email").fill("player@example.com");
    await page.getByRole("button", { name: /CONTINUE/i }).click();
    await expect(page.getByLabel("Verification code")).toBeVisible();
    await expect(page.getByRole("button", { name: /VERIFY/i })).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { level: 1, name: /^LOGIN$/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/email or username/i)).toBeVisible();
    await expect(page.getByLabel(/^Password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^LOGIN$/i })).toBeVisible();
    await expect(
      page.getByText(/Forgot password\? Password recovery is not available yet/i),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "REGISTER", exact: true })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  test("dashboard redirects unauthenticated users to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    const url = new URL(page.url());
    expect(url.searchParams.get("next")).toBe("/dashboard");
  });

  test("legacy esports register redirects to /register", async ({ page }) => {
    await page.goto("/esports/register");
    await expect(page).toHaveURL(/\/register$/);
  });
});
