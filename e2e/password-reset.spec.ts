import { test, expect } from "@playwright/test";

test.describe("Participant password recovery", () => {
  test("login links to forgot-password", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("link", { name: /Forgot password\?/i }),
    ).toHaveAttribute("href", "/forgot-password");
    await expect(
      page.getByText(/Password recovery is not available yet/i),
    ).toHaveCount(0);
  });

  test("forgot-password is enumeration-safe", async ({ page }) => {
    await page.route("**/api/participant/auth/forgot-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message:
            "If an account exists for this email, we've sent a password reset link.",
        }),
      });
    });

    await page.goto("/forgot-password");
    await expect(
      page.getByRole("heading", { name: /FORGOT PASSWORD/i }),
    ).toBeVisible();
    await page.getByRole("textbox", { name: /Email/i }).fill("unknown@example.com");
    await page.getByRole("button", { name: /SEND RESET LINK/i }).click();
    await expect(
      page.getByText(
        /If an account exists for this email, we've sent a password reset link/i,
      ),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to Login|LOGIN/i })).toBeVisible();
  });

  test("reset-password without token shows invalid state", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(
      page.getByText(/invalid or has expired|missing|reset link/i),
    ).toBeVisible();
  });

  test("reset-password with mocked token succeeds then offers login", async ({
    page,
  }) => {
    await page.route("**/api/participant/auth/reset-password", async (route) => {
      const body = route.request().postDataJSON() as {
        token?: string;
        password?: string;
        confirmPassword?: string;
      };
      expect(body.token).toBeTruthy();
      expect(body.password).toBeTruthy();
      expect(body.confirmPassword).toBe(body.password);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Your password has been reset successfully.",
        }),
      });
    });

    await page.goto("/reset-password?token=e2e-reset-token");
    await page.getByRole("textbox", { name: /New password/i }).fill("NewSecurePass123!");
    await page
      .getByRole("textbox", { name: /^Confirm password/i })
      .fill("NewSecurePass123!");
    await page.getByRole("button", { name: /RESET PASSWORD/i }).click();
    await expect(
      page.getByText(/Your password has been reset successfully/i),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /^LOGIN$/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  test("reset-password API rejects mismatched passwords via UI", async ({
    page,
  }) => {
    await page.goto("/reset-password?token=e2e-reset-token");
    await page.getByRole("textbox", { name: /New password/i }).fill("NewSecurePass123!");
    await page
      .getByRole("textbox", { name: /^Confirm password/i })
      .fill("DifferentPass123!");
    await page.getByRole("button", { name: /RESET PASSWORD/i }).click();
    await expect(page.getByText(/do not match/i)).toBeVisible();
  });
});
