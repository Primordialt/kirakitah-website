import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProfileForm } from "@/components/features/participant/ProfileForm";

vi.mock("@/lib/participant/api", () => ({
  apiErrorMessage: () => "error",
  participantFetch: vi.fn(async () => ({
    response: { ok: true },
    payload: {
      profile: {
        id: "p1",
        status: "verified",
        firstName: "Ada",
        lastName: "Okafor",
        dateOfBirth: "2000-01-15",
        country: "NG",
        city: "Lagos",
        phone: "+2348012345678",
        identificationType: "nin",
        hasIdentificationNumber: true,
        gamerTag: "QDP",
        hasPlayerPhoto: true,
        playerPhotoMeta: null,
        guardian: null,
        completionPercent: 100,
        completionSections: [],
        missingFields: [],
        correctionReason: null,
        submittedAt: "2026-01-01T00:00:00.000Z",
        verifiedAt: "2026-01-02T00:00:00.000Z",
      },
    },
  })),
}));

describe("ProfileForm approved eFootball lock UI", () => {
  it("shows locked verified eFootball account with accessible status", async () => {
    render(<ProfileForm />);

    expect(
      await screen.findByText(
        /Your approved eFootball account is locked for KIRAKITAH GAMING 926 and cannot be changed/i,
      ),
    ).toBeInTheDocument();

    const input = screen.getByLabelText(/Your eFootball username/i);
    expect(input).toHaveAttribute("readonly");
    expect(input).toHaveValue("QDP");
    expect(screen.getByText(/^Verified$/i)).toBeInTheDocument();
    expect(
      screen.getAllByRole("img", { name: /Verified participant/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
