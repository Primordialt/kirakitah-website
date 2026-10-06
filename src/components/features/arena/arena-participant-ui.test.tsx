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

  it("shows entry, win, and status without internal thresholds", async () => {
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
    expect(screen.getByText("Entry")).toBeInTheDocument();
    expect(screen.getByText("0.5 KK")).toBeInTheDocument();
    expect(screen.getByText("Win")).toBeInTheDocument();
    expect(screen.getByText("3 KK")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Enter arena/i })).toHaveAttribute(
      "href",
      "/arena/quickfire",
    );

    const text = document.body.textContent ?? "";
    for (const phrase of forbidden) {
      expect(text).not.toContain(phrase);
    }
    expect(text).not.toContain("17");
    expect(text).not.toContain("waiting_for_players");
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
    expect(screen.getByText("Round ended. Get ready for the next one.")).toBeInTheDocument();
    expect(screen.queryByText(/Red Planet/)).not.toBeInTheDocument();

    const text = document.body.textContent ?? "";
    for (const phrase of forbidden) {
      expect(text).not.toContain(phrase);
    }
    expect(text).not.toContain("Players in arena");
    expect(text).not.toContain("per response");
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
        winnerAnnouncement: { username: "alex", prizeKk: "3", streak: 2 },
        wallet: { balanceKk: "9" },
      },
    } as never);

    render(<ArenaPlayClient slug="quickfire" />);

    expect(await screen.findByText(/@alex wins Round #5/)).toBeInTheDocument();
    expect(screen.getByText(/2 wins in a row/)).toBeInTheDocument();
    expect(screen.getByText(/3 KK won/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("Activity");
  });
});
