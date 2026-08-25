/** @vitest-environment jsdom */
import { EligibilityRequirements } from "@/components/features/eligibility";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("EligibilityRequirements", () => {
  it("summarises approved KG926 eligibility criteria", () => {
    render(<EligibilityRequirements />);

    expect(
      screen.getByRole("heading", { name: /ELIGIBILITY REQUIREMENTS/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("10+")).toBeInTheDocument();
    expect(screen.getByText(/Required for ages 10–17/i)).toBeInTheDocument();
    expect(screen.getByText("Manual review")).toBeInTheDocument();
    expect(screen.getByText("X + Instagram + TikTok")).toBeInTheDocument();
    expect(screen.getByText(/Manual review and approval/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Final participant selection is separate/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Application submission is not the same as eligibility/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/YouTube/i)).not.toBeInTheDocument();
  });
});
