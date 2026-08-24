/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RegistrationSuccess } from "@/components/features/registration/RegistrationSuccess";

describe("RegistrationSuccess — MVP messaging", () => {
  it("confirms application received without claiming verification or qualification", () => {
    render(
      <RegistrationSuccess
        referenceId="KG926-2026-ABCDEF"
        contactVerification={{
          email: { status: "pending" },
          phone: { status: "pending" },
        }}
      />,
    );

    expect(screen.getByText(/YOU'RE IN THE SYSTEM/i)).toBeInTheDocument();
    expect(
      screen.getByText(/KIRAKITAH GAMING 926 application has been received/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/KG926-2026-ABCDEF/)).toBeInTheDocument();
    expect(
      screen.getByText(/Contact verification will follow/i),
    ).toBeInTheDocument();

    expect(screen.queryByText(/email has been verified/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/phone has been verified/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/you qualified/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/You are confirmed/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/not confirmed tournament participation/i),
    ).toBeInTheDocument();
  });
});
