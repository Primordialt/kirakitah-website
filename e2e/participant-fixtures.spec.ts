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

const mockAllUpcoming = {
  matchId: "22222222-2222-4222-8222-222222222222",
  matchShortId: "22222222",
  tournamentId: "event-kg926",
  tournamentName: "KIRAKITAH GAMING 926",
  phase: "Qualification",
  roundLabel: "semifinal 1",
  podNumber: 1,
  competitorA: {
    label: "PlayerAlpha",
    gamerTag: "PlayerAlpha",
    username: "alpha",
    publicCode: "KG926-P0010",
    verified: true,
    kind: "participant",
  },
  competitorB: {
    label: "PlayerBeta",
    gamerTag: "PlayerBeta",
    username: "beta",
    publicCode: "KG926-P0011",
    verified: false,
    kind: "participant",
  },
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
  scoreA: null,
  scoreB: null,
  resultLabel: "Result pending",
  completedAt: null,
  isYourMatch: false,
};

const mockMineUpcoming = {
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

const mockBundle = {
  success: true,
  all: {
    upcoming: [mockAllUpcoming],
    completed: [],
  },
  mine: {
    upcoming: [mockMineUpcoming],
    completed: [],
  },
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

  test("authenticated participant sees all fixtures and my matches tabs", async ({
    page,
    context,
  }) => {
    await seedParticipantCookie(context);

    await page.route("**/api/participant/fixtures", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockBundle),
      });
    });

    await page.goto("/matches");
    await expect(page.getByRole("heading", { level: 1, name: /FIXTURES/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /All fixtures/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("tab", { name: /Upcoming \(1\)/i })).toBeVisible();
    await expect(page.getByText("PlayerAlpha", { exact: true })).toBeVisible();
    await expect(page.getByText("PlayerBeta", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: /My matches/i }).click();
    await expect(page.getByRole("tab", { name: /My matches/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByText("You", { exact: true })).toBeVisible();
    await expect(page.getByText("PlayerTwo", { exact: true })).toBeVisible();
    await expect(page.getByText("PlayerAlpha", { exact: true })).not.toBeVisible();
  });

  test("participant can switch to completed section", async ({ page, context }) => {
    await seedParticipantCookie(context);

    await page.route("**/api/participant/fixtures", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...mockBundle,
          all: { upcoming: [], completed: [mockAllUpcoming] },
        }),
      });
    });

    await page.goto("/matches");
    await page.getByRole("tab", { name: /Completed \(1\)/i }).click();
    await expect(page.getByText("PlayerAlpha", { exact: true })).toBeVisible();
  });

  test("participant can open fixture detail", async ({ page, context }) => {
    await seedParticipantCookie(context);

    await page.route("**/api/participant/fixtures/11111111-1111-4111-8111-111111111111", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          tournament: {
            ...mockAllUpcoming,
            matchId: "11111111-1111-4111-8111-111111111111",
            matchShortId: "11111111",
            isYourMatch: true,
          },
          personal: mockMineUpcoming,
        }),
      });
    });

    await page.goto("/matches/11111111-1111-4111-8111-111111111111");
    await expect(page.getByRole("heading", { level: 1, name: /KIRAKITAH GAMING 926/i })).toBeVisible();
    await expect(page.getByText(/Match 11111111/i)).toBeVisible();
    await expect(page.getByText("You", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to fixtures/i })).toBeVisible();
  });

  test("participant can open all-fixtures match detail without personal context", async ({
    page,
    context,
  }) => {
    await seedParticipantCookie(context);

    await page.route("**/api/participant/fixtures/22222222-2222-4222-8222-222222222222", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          tournament: mockAllUpcoming,
          personal: null,
        }),
      });
    });

    await page.goto("/matches/22222222-2222-4222-8222-222222222222");
    await expect(page.getByText("Player A", { exact: true })).toBeVisible();
    await expect(page.getByText("Player B", { exact: true })).toBeVisible();
    await expect(page.getByText("You", { exact: true })).not.toBeVisible();
  });
});
