import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TournamentApplyForm } from "@/components/features/participant/TournamentApplyForm";
import type { ApplicationPreflight } from "@/server/participant/application-preflight";

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

const readyPreflight: ApplicationPreflight = {
  canContinue: true,
  blockingCode: null,
  blockingMessage: null,
  accountChecks: [
    {
      id: "email",
      label: "Email verified",
      ready: true,
      detail: "Your email address is verified.",
    },
    {
      id: "profile-complete",
      label: "Profile complete",
      ready: true,
      detail: "Profile completion 100%.",
    },
    {
      id: "profile-verified",
      label: "Profile verified",
      ready: true,
      detail: "Your participant profile is verified.",
    },
    {
      id: "eligible-to-apply",
      label: "Account eligible to apply",
      ready: true,
      detail: "Your account meets the current application gate.",
    },
  ],
  requirementChecks: [
    {
      id: "req-verified-profile",
      label: "Verified participant profile",
      ready: true,
      detail: "Ready",
    },
    {
      id: "req-tournament-info",
      label: "Required tournament information",
      ready: true,
      detail: "Collected in the application form.",
    },
    {
      id: "req-efootball",
      label: "eFootball account",
      ready: true,
      detail: "Taken from your verified profile.",
    },
    {
      id: "req-x",
      label: "X follow",
      ready: true,
      detail: "Confirmed during application; manually reviewed later.",
    },
    {
      id: "req-instagram",
      label: "Instagram follow",
      ready: true,
      detail: "Confirmed during application; manually reviewed later.",
    },
    {
      id: "req-tiktok",
      label: "TikTok follow",
      ready: true,
      detail: "Confirmed during application; manually reviewed later.",
    },
  ],
  profile: {
    gamerTag: "QDP",
    firstName: "Ada",
    lastName: "Okafor",
    emailMasked: "ad***@example.com",
    status: "verified",
    completionPercent: 100,
  },
};

const blockedPreflight: ApplicationPreflight = {
  ...readyPreflight,
  canContinue: false,
  blockingCode: "PROFILE_NOT_VERIFIED",
  blockingMessage:
    "Your profile is awaiting verification. You can apply once an administrator has verified your profile.",
  accountChecks: readyPreflight.accountChecks.map((check) =>
    check.id === "profile-verified" || check.id === "eligible-to-apply"
      ? {
          ...check,
          ready: false,
          detail: "Your profile is still being reviewed.",
          actionHref: "/profile",
          actionLabel: "View profile",
        }
      : check,
  ),
};

async function advanceToReview() {
  fireEvent.click(
    screen.getByRole("button", { name: /Continue to application/i }),
  );

  fireEvent.change(screen.getByLabelText(/Mobile platform/i), {
    target: { value: "android" },
  });
  for (const option of screen.getAllByRole("checkbox")) {
    fireEvent.click(option);
  }
  fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));

  fireEvent.click(
    screen.getByRole("checkbox", { name: /I will compete using eFootball/i }),
  );
  fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));

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
    screen.getByRole("checkbox", {
      name: /I confirm that I follow KIRAKITAH/i,
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));
}

describe("TournamentApplyForm application experience", () => {
  beforeEach(() => {
    vi.mocked(participantFetch).mockReset();
  });

  it("shows blocked preflight for unverified profiles", () => {
    render(
      <TournamentApplyForm
        tournamentId="event-kg926"
        preflight={blockedPreflight}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /Application check/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/still being reviewed/i).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /Continue to application/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /View profile/i })[0]).toHaveAttribute(
      "href",
      "/profile",
    );
  });

  it("renders wizard steps and review after ready preflight", async () => {
    render(
      <TournamentApplyForm
        tournamentId="event-kg926"
        preflight={readyPreflight}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /Application check/i }),
    ).toBeInTheDocument();

    await advanceToReview();

    expect(
      screen.getByRole("heading", { name: /Application review/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("QDP")).toBeInTheDocument();
    expect(screen.getByText(/ad\*\*\*@example.com/i)).toBeInTheDocument();
    expect(screen.getAllByText(/VERIFIED/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Your application will be reviewed after submission/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Edit$/i }).length).toBeGreaterThanOrEqual(3);
  });

  it("edit from review returns to the eFootball step without losing state", async () => {
    render(
      <TournamentApplyForm
        tournamentId="event-kg926"
        preflight={readyPreflight}
      />,
    );

    await advanceToReview();

    const editButtons = screen.getAllByRole("button", { name: /^Edit$/i });
    fireEvent.click(editButtons[1]!);

    expect(
      screen.getByRole("heading", { name: /eFootball account/i }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("QDP")).toBeInTheDocument();
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
      } as Awaited<ReturnType<typeof participantFetch>>);

      render(
        <TournamentApplyForm
          tournamentId="event-kg926"
          preflight={readyPreflight}
        />,
      );

      await advanceToReview();

      for (const checkbox of screen.getAllByRole("checkbox")) {
        fireEvent.click(checkbox);
      }

      fireEvent.click(
        screen.getByRole("button", { name: /Submit application/i }),
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

  it("shows success state with reference and non-qualification messaging", async () => {
      vi.mocked(participantFetch).mockResolvedValue({
        response: { ok: true, status: 201 } as Response,
        payload: {
          referenceId: "KG926-TEST-001",
          status: "received",
        },
      } as Awaited<ReturnType<typeof participantFetch>>);

    render(
      <TournamentApplyForm
        tournamentId="event-kg926"
        preflight={readyPreflight}
      />,
    );

    await advanceToReview();
    for (const checkbox of screen.getAllByRole("checkbox")) {
      fireEvent.click(checkbox);
    }
    fireEvent.click(screen.getByRole("button", { name: /Submit application/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Application received/i }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("KG926-TEST-001")).toBeInTheDocument();
    expect(screen.getAllByText(/APPLICATION RECEIVED/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/does not guarantee participation/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Eligibility, selection, and qualification are separate/i),
    ).toBeInTheDocument();
  });
});
