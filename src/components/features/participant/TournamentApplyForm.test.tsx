import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TournamentApplyForm } from "@/components/features/participant/TournamentApplyForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/participant/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/participant/api")>(
    "@/lib/participant/api",
  );
  return {
    ...actual,
    participantFetch: vi.fn(),
  };
});

import { participantFetch } from "@/lib/participant/api";

describe("TournamentApplyForm duplicate eFootball UX", () => {
  beforeEach(() => {
    vi.mocked(participantFetch).mockReset();
  });

  it(
    "shows controlled eFootball already-registered state without leaking owners",
    async () => {
      vi.mocked(participantFetch).mockResolvedValue({
        response: { ok: false, status: 409 } as Response,
        payload: {
          error: {
            code: "EFOOTBALL_ACCOUNT_ALREADY_REGISTERED",
            message:
              "This eFootball account is already registered for KIRAKITAH GAMING 926.",
          },
        },
      });

      render(<TournamentApplyForm tournamentId="event-kg926" />);

      fireEvent.change(screen.getByLabelText(/Mobile platform/i), {
        target: { value: "android" },
      });

      for (const checkbox of screen.getAllByRole("checkbox")) {
        fireEvent.click(checkbox);
      }

      fireEvent.change(screen.getByLabelText(/X username/i), {
        target: { value: "playerx" },
      });
      fireEvent.change(screen.getByLabelText(/Instagram username/i), {
        target: { value: "playerig" },
      });
      fireEvent.change(screen.getByLabelText(/TikTok username/i), {
        target: { value: "playertt" },
      });

      fireEvent.click(
        screen.getByRole("button", { name: /SUBMIT APPLICATION/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByRole("heading", {
            name: /EFOOTBALL ACCOUNT ALREADY REGISTERED/i,
          }),
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          /This eFootball account is already registered for this tournament/i,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Back to tournament/i }),
      ).toHaveAttribute("href", "/tournaments/event-kg926");
      expect(screen.queryByText(/another participant/i)).not.toBeInTheDocument();
    },
    15_000,
  );
});
