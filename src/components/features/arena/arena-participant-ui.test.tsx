"use client";

import { ArenaDirectoryClient } from "./ArenaDirectoryClient";
import { ArenaPlayClient, formatArenaClock } from "./ArenaPlayClient";
import { participantFetch } from "@/lib/participant/api";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/participant/api", () => ({
  participantFetch: vi.fn(),
  apiErrorMessage: (_payload: unknown, fallback: string) => fallback,
}));

const forbidden = [
  "Responses:",
  "Players in arena",
  "Validate round",
  "Activity",
  "Round disqualified",
  "Copy and paste are disabled",
  "Screenshots cannot be fully blocked",
  "10 responses",
  "need 10",
];

describe("formatArenaClock", () => {
  it("pads seconds as a competitive clock", () => {
    expect(formatArenaClock(8)).toBe("00:08");
    expect(formatArenaClock(10)).toBe("00:10");
  });
});

describe("Arena participant UI", () => {
  beforeEach(() => {
    vi.mocked(participantFetch).mockReset();
  });

  it("shows entry and status without the prize or internal thresholds", async () => {
    vi.mocked(participantFetch).mockImplementation((async (input) => {
      if (String(input) === "/api/participant/wallet") {
        return {
          response: { ok: true } as Response,
          payload: { wallet: { balanceKk: "12.5" } },
        };
      }
      return {
        response: { ok: true } as Response,
        payload: {
          arenas: [
            {
              slug: "quickfire",
              name: "KIRAKITAH QUICKFIRE",
              kind: "quickfire",
              description: "Think fast. Answer faster.",
              enabled: true,
              paused: false,
              entryFeeKk: "0.5",
              prizeKk: "3",
              minResponsesRequired: 10,
              playersPresent: 17,
              roundState: "waiting_for_players",
            },
          ],
        },
      };
    }) as typeof participantFetch);

    render(<ArenaDirectoryClient />);

    expect(await screen.findByRole("heading", { name: /KIRAKITAH QUICKFIRE/i })).toBeInTheDocument();
    expect(screen.getByText("Think fast. Answer faster.")).toBeInTheDocument();
    expect(screen.getByText("Entry")).toBeInTheDocument();
    expect(screen.getByText("0.5 KK")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Enter arena/i })).toHaveAttribute(
      "href",
      "/arena/quickfire",
    );

    const card = screen.getByRole("heading", { name: /KIRAKITAH QUICKFIRE/i }).closest("li");
    const text = card?.textContent ?? "";
    for (const phrase of [
      "Win",
      "3 KK",
      "Prize",
      "Current prize",
      "Pool",
      "10 responses",
      "Players in arena",
    ]) {
      expect(text).not.toContain(phrase);
    }
  });

  it("hides activity, player counts, and validation copy on the game screen", async () => {
    vi.mocked(participantFetch).mockResolvedValue({
      response: { ok: true } as Response,
      payload: {
        arena: {
          slug: "quickfire",
          name: "KIRAKITAH QUICKFIRE",
          kind: "quickfire",
          entryFeeKk: "0.5",
          prizeKk: "3",
          minResponsesRequired: 10,
          enabled: true,
          paused: false,
        },
        playersPresent: 1,
        round: {
          number: 4,
          state: "intermission",
          secondsRemaining: 8,
          disqualifyReason: "Only 3 responses were submitted. 10 responses are required.",
          acceptedResponseCount: 3,
          responsesRemaining: 7,
          uniqueParticipantCount: 1,
          roundValidity: "waiting_for_minimum_responses",
        },
        question: {
          question: "Which planet is known as the Red Planet?",
          optionA: "Venus",
          optionB: "Mars",
          optionC: "Jupiter",
          optionD: "Mercury",
        },
        challenge: null,
        winnerAnnouncement: null,
        lastRound: { outcome: "ended" },
        activity: [
          { message: "Round #4 disqualified — only 0 responses (need 10).", kind: "disqualified" },
        ],
        wallet: { balanceKk: "12.50" },
      },
    } as never);

    render(<ArenaPlayClient slug="quickfire" />);

    expect(await screen.findByRole("heading", { name: /KIRAKITAH QUICKFIRE/i })).toBeInTheDocument();
    expect(screen.getByText("Round #4")).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("00:08");
    expect(screen.getByText(/12\.50 KK/)).toBeInTheDocument();
    expect(screen.getByText("LAST ROUND: ROUND ENDED")).toBeInTheDocument();
    expect(screen.getByText("READY TO MAKE YOUR MOVE?")).toBeInTheDocument();
    expect(screen.queryByText(/Red Planet/)).not.toBeInTheDocument();
    expect(screen.queryByText(/10 responses are required/)).not.toBeInTheDocument();

    const text = document.body.textContent ?? "";
    for (const phrase of forbidden) {
      expect(text).not.toContain(phrase);
    }
    expect(text).not.toContain("Players in arena");
    expect(text).not.toContain("per response");
    expect(text).not.toContain("Gross pool");
    expect(text).not.toContain("Platform remainder");
    expect(text).not.toContain("Current prize");
  });

  it("announces a winner without response counts", async () => {
    vi.mocked(participantFetch).mockResolvedValue({
      response: { ok: true } as Response,
      payload: {
        arena: {
          slug: "quickfire",
          name: "KIRAKITAH QUICKFIRE",
          kind: "quickfire",
          enabled: true,
          paused: false,
        },
        round: { number: 5, state: "intermission", secondsRemaining: null, disqualifyReason: null },
        question: null,
        challenge: null,
        winnerAnnouncement: { username: "alex", prizeKk: "6", streak: 2 },
        lastRound: { outcome: "winner", username: "alex", prizeKk: "6" },
        wallet: { balanceKk: "9" },
      },
    } as never);

    render(<ArenaPlayClient slug="quickfire" />);

    expect(await screen.findByText(/@alex wins again!/)).toBeInTheDocument();
    expect(screen.getByText("2 WINS IN A ROW")).toBeInTheDocument();
    expect(screen.getByText("🏆 +6 KK")).toBeInTheDocument();
    expect(screen.getByText("🏆 LAST ROUND WINNER: @alex — 6 KK")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Activity");
    expect(document.body.textContent).not.toContain("60%");
  });

  it("shows the previous winner prize from the server without the live pool", async () => {
    vi.mocked(participantFetch).mockResolvedValue({
      response: { ok: true } as Response,
      payload: {
        arena: {
          slug: "quickfire",
          name: "KIRAKITAH QUICKFIRE",
          kind: "quickfire",
          enabled: true,
          paused: false,
        },
        round: { number: 8, state: "active", secondsRemaining: 12 },
        question: {
          question: "Which planet is known as the Red Planet?",
          optionA: "Venus",
          optionB: "Mars",
          optionC: "Jupiter",
          optionD: "Mercury",
        },
        challenge: null,
        winnerAnnouncement: null,
        lastRound: { outcome: "winner", username: "nova", prizeKk: "60" },
        grossPoolKk: "100",
        chargedEntries: 200,
        currentPrizeKk: "60",
        wallet: { balanceKk: "4" },
      },
    } as never);

    render(<ArenaPlayClient slug="quickfire" />);

    expect(await screen.findByText("🏆 LAST ROUND WINNER: @nova — 60 KK")).toBeInTheDocument();
    expect(screen.getByText("YOUR MOMENT IS NOW.")).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("00:12");
    expect(screen.getByText(/Red Planet/)).toBeInTheDocument();
    const text = document.body.textContent ?? "";
    expect(text).not.toContain("Gross pool");
    expect(text).not.toContain("charged");
    expect(text).not.toContain("Current prize");
    expect(text).not.toContain("platform");
    expect(text).not.toContain("100");
  });
});
