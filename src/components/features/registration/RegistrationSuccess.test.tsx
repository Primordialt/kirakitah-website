/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RegistrationSuccess } from "@/components/features/registration/RegistrationSuccess";

describe("RegistrationSuccess — MVP messaging", () => {
  it("confirms application received without claiming verification or qualification", () => {
    render(<RegistrationSuccess referenceId="KG926-2026-ABCDEF" />);

    expect(screen.getByText(/APPLICATION RECEIVED/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Thank you for submitting your KIRAKITAH GAMING 926 application/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Our team will review your application and contact you regarding the next steps\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Participation is subject to eligibility and manual review/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/KG926-2026-ABCDEF/)).toBeInTheDocument();
    expect(screen.getByText(/keep this reference/i)).toBeInTheDocument();

    expect(screen.queryByText(/@kirakitah\.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/YOU'RE IN THE SYSTEM/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Contact verification will follow/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/GAMING 2026/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/email has been verified/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/phone has been verified/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/you qualified/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/You are confirmed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/identity has been verified/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/You're registered for the tournament/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/follows have been verified/i)).not.toBeInTheDocument();
  });
});
