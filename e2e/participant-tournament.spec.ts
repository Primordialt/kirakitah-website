import { test, expect } from "@playwright/test";

const PARTICIPANT_COOKIE = "kirakitah_participant_session";

async function seedParticipantCookie(context: import("@playwright/test").BrowserContext) {
  await context.addCookies([
    {
      name: PARTICIPANT_COOKIE,
      value: "e2e-participant-session",
      domain: "localhost",
      path: "/",
      httpOnly: true,
    },
  ]);
}

test.describe("Participant tournament experience", () => {
  test("unauthenticated dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated tournaments API returns 401", async ({ request }) => {
    const response = await request.get("/api/participant/tournaments");
    expect(response.status()).toBe(401);
  });

  test("unauthenticated tournament detail API returns 401", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/participant/tournaments/event-kg926",
    );
    expect(response.status()).toBe(401);
  });

  test("unauthenticated matches page redirects to login", async ({ page }) => {
    await page.goto("/matches");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated notifications page redirects to login", async ({
    page,
  }) => {
    await page.goto("/notifications");
    await expect(page).toHaveURL(/\/login/);
  });

  test("dashboard loads profile and tournament sections with mocked APIs", async ({
    page,
    context,
  }) => {
    await seedParticipantCookie(context);
    await page.route("**/api/participant/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          account: { username: "testplayer", email: "player@example.com" },
          profile: {
            status: "verified",
            completionPercent: 100,
            correctionReason: null,
          },
        }),
      });
    });

    await page.route("**/api/participant/tournaments", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          tournaments: [
            {
              tournamentId: "event-kg926",
              name: "KIRAKITAH GAMING 926",
              game: "eFootball Mobile",
              status: "registration_open",
              hasApplication: true,
              applicationStatusLabel: "APPLICATION RECEIVED",
              selected: false,
              publicCode: null,
              participantStatus: null,
            },
          ],
        }),
      });
    });

    await page.route("**/api/participant/notifications", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, notifications: [] }),
      });
    });

    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { level: 1, name: /WELCOME, TESTPLAYER/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /PROFILE STATUS/i }),
    ).toBeVisible();
    await expect(page.getByText(/PROFILE VERIFIED/i)).toBeVisible();
    await expect(page.getByText(/VERIFIED/i).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /MY TOURNAMENTS/i }),
    ).toBeVisible();
    await expect(page.getByText(/APPLICATION RECEIVED/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /MY MATCHES/i }),
    ).toBeVisible();
  });

  test("dashboard shows incomplete profile next action with mocked APIs", async ({
    page,
    context,
  }) => {
    await seedParticipantCookie(context);
    await page.route("**/api/participant/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          account: { username: "draftplayer", email: "draft@example.com" },
          profile: {
            status: "incomplete",
            completionPercent: 40,
            correctionReason: null,
          },
        }),
      });
    });
    await page.route("**/api/participant/tournaments", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          tournaments: [
            {
              tournamentId: "event-kg926",
              name: "KIRAKITAH GAMING 926",
              game: "eFootball Mobile",
              status: "registration_open",
              hasApplication: false,
              applicationStatusLabel: null,
              selected: false,
              publicCode: null,
              participantStatus: null,
            },
          ],
        }),
      });
    });
    await page.route("**/api/participant/notifications", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, notifications: [] }),
      });
    });

    await page.goto("/dashboard");
    await expect(page.getByText(/INCOMPLETE/i).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: /COMPLETE PROFILE/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/Complete your profile before you can apply/i),
    ).toBeVisible();
  });

  test("tournament hub shows application status with mocked experience", async ({
    page,
    context,
  }) => {
    await seedParticipantCookie(context);
    await page.route("**/api/participant/tournaments/event-kg926", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          experience: {
            tournament: {
              id: "event-kg926",
              name: "KIRAKITAH GAMING 926",
              game: "eFootball Mobile",
              edition: "2026",
              status: "registration_open",
            },
            profileGate: { canApply: false, message: null, code: null },
            application: {
              referenceId: "KG926-TEST",
              statusLabel: "APPLICATION RECEIVED",
              statusDescription:
                "Your application has been received and is being reviewed.",
              submittedAt: "2026-01-01T00:00:00.000Z",
              identityLabel: "Pending review",
              socialLabel: "Pending review",
              socialPlatforms: [
                { platformLabel: "X", label: "Pending review" },
                { platformLabel: "Instagram", label: "Pending review" },
                { platformLabel: "TikTok", label: "Pending review" },
              ],
            },
            eligibility: {
              label: "ELIGIBILITY PENDING",
              description:
                "Some eligibility requirements are not yet met. This does not mean you have been selected.",
            },
            selection: null,
            qualification: null,
            upcomingMatch: null,
          },
        }),
      });
    });

    await page.goto("/tournaments/event-kg926");
    await expect(
      page.getByRole("heading", { level: 1, name: /KIRAKITAH GAMING 926/i }),
    ).toBeVisible();
    await expect(page.getByText(/APPLICATION RECEIVED/i)).toBeVisible();
    await expect(page.getByText(/ELIGIBILITY PENDING/i)).toBeVisible();
    await expect(page.getByText(/KG926-TEST/i)).toBeVisible();
    await expect(page.getByText(/X:/i)).toBeVisible();
  });

  test("participant nav links are present on matches page with empty state", async ({
    page,
    context,
  }) => {
    await seedParticipantCookie(context);
    await page.route("**/api/participant/tournaments/event-kg926/matches", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          matches: [],
          upcoming: null,
        }),
      });
    });

    await page.goto("/matches");
    await expect(
      page.getByRole("heading", { level: 1, name: /MY MATCHES/i }),
    ).toBeVisible();
    await expect(page.getByText(/No matches scheduled yet/i)).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: /Participant portal/i }).getByRole(
        "link",
        { name: "DASHBOARD", exact: true },
      ),
    ).toBeVisible();
  });
});
