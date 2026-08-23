import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TournamentEligibilityPanel } from "@/components/admin/TournamentEligibilityPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("TournamentEligibilityPanel", () => {
  it("shows permission message when user cannot evaluate or select", () => {
    render(
      <TournamentEligibilityPanel
        referenceId="KG926-2026-ABCDEF"
        canEvaluate={false}
        canSelect={false}
      />,
    );
    expect(
      screen.getByText(/cannot evaluate eligibility or manage participants/i),
    ).toBeInTheDocument();
  });

  it("renders evaluate button for authorized users", () => {
    render(
      <TournamentEligibilityPanel
        referenceId="KG926-2026-ABCDEF"
        canEvaluate={true}
        canSelect={false}
      />,
    );
    expect(screen.getByRole("button", { name: /evaluate eligibility/i })).toBeInTheDocument();
  });

  it("shows participant status when provided", () => {
    render(
      <TournamentEligibilityPanel
        referenceId="KG926-2026-ABCDEF"
        canEvaluate={true}
        canSelect={true}
        initialParticipantId="part-1"
        initialParticipantStatus="selected"
      />,
    );
    expect(screen.getByText(/selected/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /withdraw/i })).toBeInTheDocument();
  });
});
