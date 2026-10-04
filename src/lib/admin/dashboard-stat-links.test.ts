import { describe, expect, it } from "vitest";
import {
  applicationStatCardHref,
  applicationsQueueStatHref,
  DASHBOARD_STAT_CARDS,
} from "@/lib/admin/dashboard-stat-links";
import { TOURNAMENT_EVENT_ID } from "@/config/competition";

describe("application dashboard stat links", () => {
  it("maps every dashboard card to a filtered applications route", () => {
    expect(DASHBOARD_STAT_CARDS.length).toBeGreaterThanOrEqual(7);
    for (const card of DASHBOARD_STAT_CARDS) {
      const href = applicationStatCardHref(card.key, TOURNAMENT_EVENT_ID);
      expect(href).toContain(`/admin/tournaments/${TOURNAMENT_EVENT_ID}/applications`);
    }
  });

  it("links pending identity reviews to identityStatus filter", () => {
    expect(applicationStatCardHref("pendingIdentityReviews", TOURNAMENT_EVENT_ID)).toContain(
      "identityStatus=pending_review",
    );
  });

  it("links pending social reviews to socialFollowStatus filter", () => {
    expect(applicationStatCardHref("pendingSocialReviews", TOURNAMENT_EVENT_ID)).toContain(
      "socialFollowStatus=pending_review",
    );
  });

  it("links verified applications to status=verified", () => {
    expect(applicationStatCardHref("approved", TOURNAMENT_EVENT_ID)).toContain(
      "status=verified",
    );
  });

  it("builds applications queue stat hrefs with status filters", () => {
    const base = `/admin/tournaments/${TOURNAMENT_EVENT_ID}/applications`;
    expect(applicationsQueueStatHref("received", base)).toContain("status=received");
    expect(applicationsQueueStatHref("rejected", base)).toContain("status=rejected");
  });
});
