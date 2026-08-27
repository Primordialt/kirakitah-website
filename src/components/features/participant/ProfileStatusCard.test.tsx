import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfileStatusCard } from "@/components/features/participant/ProfileStatusCard";

describe("ProfileStatusCard correction prominence", () => {
  it("shows action-required messaging for needs_correction without inventing fields", () => {
    render(
      <ProfileStatusCard
        status="needs_correction"
        completionPercent={100}
        correctionReason="Please upload a clearer identity document."
      />,
    );

    expect(screen.getByText(/Action required/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Your profile needs correction before you can apply/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Please upload a clearer identity document/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Review and update/i }),
    ).toHaveAttribute("href", "/profile");
  });
});
