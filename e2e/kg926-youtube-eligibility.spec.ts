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

test.describe("KG926 YouTube eligibility", () => {
  test("public esports page lists YouTube among required social platforms", async ({
    page,
  }) => {
    await page.goto("/esports");
    await expect(page.getByText(/X \+ Instagram \+ TikTok \+ YouTube/i)).toBeVisible();
    await expect(
      page.getByText(/manually verified by the KIRAKITAH team/i),
    ).toBeVisible();
  });

  test("tournament hub shows YouTube requirement and attestation panel when needed", async ({
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
              referenceId: "KG926-YT",
              statusLabel: "APPLICATION RECEIVED",
              statusDescription: "Your application has been received.",
              submittedAt: "2026-01-01T00:00:00.000Z",
              identityLabel: "Pending review",
              socialLabel: "Pending review",
              needsYouTubeSubscriptionAttestation: true,
              socialPlatforms: [
                { platform: "x", platformLabel: "X", label: "Verified" },
                {
                  platform: "instagram",
                  platformLabel: "Instagram",
                  label: "Verified",
                },
                { platform: "tiktok", platformLabel: "TikTok", label: "Verified" },
                {
                  platform: "youtube",
                  platformLabel: "YouTube",
                  label: "Pending review",
                },
              ],
            },
            eligibility: {
              label: "NOT ELIGIBLE",
              description: "Some eligibility requirements are not yet met.",
            },
            selection: null,
            qualification: null,
            upcomingMatch: null,
          },
        }),
      });
    });

    await page.goto("/tournaments/event-kg926");
    await expect(page.getByText(/YouTube:/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Subscribe to KIRAKITAH on YouTube/i }),
    ).toHaveAttribute("href", "https://youtube.com/@Kirakitah926");
    await expect(
      page.getByRole("button", { name: /I've subscribed/i }),
    ).toBeVisible();
    await expect(page.getByText(/NOT ELIGIBLE/i)).toBeVisible();
  });

  test("YouTube subscribe CTA opens official channel in a new tab", async ({
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
              referenceId: "KG926-YT",
              statusLabel: "APPLICATION RECEIVED",
              statusDescription: "Your application has been received.",
              submittedAt: "2026-01-01T00:00:00.000Z",
              identityLabel: "Pending review",
              socialLabel: "Pending review",
              needsYouTubeSubscriptionAttestation: true,
              socialPlatforms: [
                { platform: "youtube", platformLabel: "YouTube", label: "Pending review" },
              ],
            },
            eligibility: null,
            selection: null,
            qualification: null,
            upcomingMatch: null,
          },
        }),
      });
    });

    await page.goto("/tournaments/event-kg926");
    const subscribeLink = page.getByRole("link", {
      name: /Subscribe to KIRAKITAH on YouTube/i,
    });
    await expect(subscribeLink).toHaveAttribute("target", "_blank");
    await expect(subscribeLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("unauthenticated YouTube attestation API returns 401", async ({ request }) => {
    const response = await request.post(
      "/api/participant/tournaments/event-kg926/social/youtube-subscription",
      {
        data: { youtubeChannel: "test-channel" },
      },
    );
    expect(response.status()).toBe(401);
  });
});
