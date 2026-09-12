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

const mockUpcomingFixture = {
  matchId: "11111111-1111-4111-8111-111111111111",
  matchShortId: "11111111",
  tournamentId: "event-kg926",
  tournamentName: "KIRAKITAH GAMING 926",
  phase: "Qualification",
  roundLabel: "semifinal 1",
  podNumber: 3,
  yourGamerTag: "PlayerOne",
  yourUsername: "playerone",
  yourPublicCode: "KG926-P0001",
  yourVerified: true,
  opponentLabel: "PlayerTwo",
  opponentGamerTag: "PlayerTwo",
  opponentUsername: "playertwo",
  opponentPublicCode: "KG926-P0002",
  opponentVerified: false,
  opponentKind: "participant",
  scheduledAt: "2026-09-19T18:00:00.000Z",
  scheduledDateDisplay: "Saturday, 19 September",
  scheduledTimeDisplay: "7:00 PM WAT",
  schedulePendingLabel: null,
  timezone: "Africa/Lagos",
  timezoneLabel: "Africa/Lagos (WAT)",
  matchStatus: "scheduled",
  matchStatusLabel: "Scheduled",
  schedulingStatus: "scheduled",
  section: "upcoming",
  yourScore: null,
  opponentScore: null,
  outcomeLabel: null,
  resultLabel: "Result pending",
  completedAt: null,
};

test.describe("Participant fixtures", () => {
  test("fixtures page redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/matches");
    await expect(page).toHaveURL(/\/login/);
  });

  test("fixtures API requires authentication", async ({ request }) => {
    const response = await request.get("/api/participant/fixtures");
    expect(response.status()).toBeGreaterThanOrEqual(401);
  });

  test("fixture detail API requires authentication", async ({ request }) => {
    const response = await request.get(
      "/api/participant/fixtures/00000000-0000-4000-8000-000000000001",
    );
    expect(response.status()).toBeGreaterThanOrEqual(401);
  });

  test("authenticated participant sees fixtures navigation and page", async ({
    page,
    context,
  }) => {
    await seedParticipantCookie(context);

    await page.route("**/api/participant/fixtures", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          upcoming: [mockUpcomingFixture],
          completed: [],
        }),
      });
    });

    await page.goto("/matches");
    await expect(page.getByRole("heading", { level: 1, name: /FIXTURES/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Upcoming matches/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Completed matches/i })).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Participant portal sidebar" })
        .getByRole("link", { name: "FIXTURES", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("KIRAKITAH GAMING 926")).toBeVisible();
    await expect(page.getByText("PlayerTwo", { exact: true })).toBeVisible();
    await expect(page.getByText(/7:00 PM WAT/i)).toBeVisible();
  });

  test("participant can open fixture detail", async ({ page, context }) => {
    await seedParticipantCookie(context);

    await page.route("**/api/participant/fixtures/11111111-1111-4111-8111-111111111111", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          fixture: mockUpcomingFixture,
        }),
      });
    });

    await page.goto("/matches/11111111-1111-4111-8111-111111111111");
    await expect(page.getByRole("heading", { level: 1, name: /KIRAKITAH GAMING 926/i })).toBeVisible();
    await expect(page.getByText(/Match 11111111/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to fixtures/i })).toBeVisible();
  });
});
