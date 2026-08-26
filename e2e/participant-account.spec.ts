import { test, expect } from "@playwright/test";
import { TOURNAMENT_EVENT_ID } from "../src/config/competition";

const PARTICIPANT_COOKIE = "kirakitah_participant_session";

async function mockRegistrationApis(page: import("@playwright/test").Page) {
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
  await page.route("**/api/participant/auth/email/verify", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        emailVerificationToken: "e2e-participant-verification-token",
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        message: "Email verified.",
      }),
    });
  });
  await page.route("**/api/participant/auth/register", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      headers: {
        "Set-Cookie": `${PARTICIPANT_COOKIE}=e2e-participant-session; Path=/; HttpOnly`,
      },
      body: JSON.stringify({
        success: true,
        accountId: "00000000-0000-4000-8000-000000000010",
        username: "e2e_player",
      }),
    });
  });
}

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
      page.getByRole("link", { name: /Forgot password\?/i }),
    ).toHaveAttribute("href", "/forgot-password");
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

  test("profile and tournaments redirect unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/tournaments");
    await expect(page).toHaveURL(/\/login/);
  });

  test("legacy esports register redirects to /register", async ({ page }) => {
    await page.goto("/esports/register");
    await expect(page).toHaveURL(/\/register$/);
  });

  test("full register journey reaches dashboard with mocked APIs", async ({
    page,
    context,
  }) => {
    test.setTimeout(60_000);
    await mockRegistrationApis(page);
    await page.route("**/api/participant/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          account: {
            id: "00000000-0000-4000-8000-000000000010",
            email: "player@example.com",
            username: "e2e_player",
            emailVerifiedAt: new Date().toISOString(),
          },
          profile: {
            id: "00000000-0000-4000-8000-000000000020",
            accountId: "00000000-0000-4000-8000-000000000010",
            status: "incomplete",
            completionPercent: 0,
            missingFields: ["firstName"],
            firstName: null,
            lastName: null,
            dateOfBirth: null,
            country: null,
            city: null,
            phone: null,
            identificationType: null,
            hasIdentificationNumber: false,
            gamerTag: null,
            hasPlayerPhoto: false,
            playerPhotoMeta: null,
            guardian: null,
            submittedAt: null,
            verifiedAt: null,
            correctionReason: null,
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto("/register");
    await page.getByLabel("Email").fill("player@example.com");
    await page.getByRole("button", { name: /CONTINUE/i }).click();
    await page.getByLabel("Verification code").fill("123456");
    await page.getByRole("button", { name: /VERIFY/i }).click();
    await expect(page).toHaveURL(/\/register\/username/);

    await page.getByLabel(/username/i).fill("e2e_player");
    await page.getByRole("button", { name: /CONTINUE/i }).click();
    await expect(page).toHaveURL(/\/register\/password/);
    await expect(
      page.getByRole("heading", { name: /CREATE YOUR PASSWORD/i }),
    ).toBeVisible();

    await page.getByRole("textbox", { name: /^Password/i }).fill("SecurePass123!");
    await page
      .getByRole("textbox", { name: /Confirm password/i })
      .fill("SecurePass123!");
    await page.getByRole("button", { name: /CREATE ACCOUNT/i }).click();

    // Middleware needs a participant cookie; mock register cannot reliably Set-Cookie.
    await context.addCookies([
      {
        name: PARTICIPANT_COOKIE,
        value: "e2e-participant-session",
        domain: "localhost",
        path: "/",
        httpOnly: true,
      },
    ]);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/WELCOME,\s*E2E_PLAYER/i)).toBeVisible();
    await expect(page.getByText(/Incomplete/i)).toBeVisible();
  });

  test("apply API rejects unauthenticated callers", async ({ request }) => {
    const response = await request.post(
      `/api/participant/tournaments/${TOURNAMENT_EVENT_ID}/apply`,
      {
        data: {
          platform: "android",
          timezone: "Africa/Lagos",
          availability: ["flexible"],
          socialHandles: { x: "x", instagram: "ig", tiktok: "tt" },
          socialFollowAttestation: true,
          consents: {
            rules: true,
            terms: true,
            privacy: true,
            codeOfConduct: true,
            mediaConsent: true,
          },
        },
      },
    );
    expect(response.status()).toBe(401);
  });

  test("participant me API rejects unauthenticated callers", async ({
    request,
  }) => {
    const response = await request.get("/api/participant/me");
    expect(response.status()).toBe(401);
  });

  test("admin routes stay admin-gated for anonymous users", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin/reviews/profiles");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("forgot-password page submits and shows generic success", async ({
    page,
  }) => {
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
      page.getByRole("heading", { level: 1, name: /FORGOT PASSWORD/i }),
    ).toBeVisible();
    await page.getByRole("textbox", { name: /Email/i }).fill("player@example.com");
    await page.getByRole("button", { name: /SEND RESET LINK/i }).click();
    await expect(
      page.getByText(
        /If an account exists for this email, we've sent a password reset link\./i,
      ),
    ).toBeVisible();
  });

  test("reset-password page requires token and updates password", async ({
    page,
  }) => {
    await page.goto("/reset-password");
    await expect(
      page.getByText(/This reset link is invalid or has expired/i),
    ).toBeVisible();

    await page.route("**/api/participant/auth/reset-password", async (route) => {
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
    await page.getByRole("textbox", { name: /New password/i }).fill(
      "a-reasonably-long-passphrase",
    );
    await page
      .getByRole("textbox", { name: /^Confirm password/i })
      .fill("a-reasonably-long-passphrase");
    await page.getByRole("button", { name: /RESET PASSWORD/i }).click();
    await expect(
      page.getByText(/Your password has been reset successfully/i),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /^LOGIN$/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
