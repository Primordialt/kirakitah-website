import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

describe("VerifiedBadge", () => {
  it("renders accessible label when verified", () => {
    render(<VerifiedBadge verified />);
    expect(screen.getByRole("img", { name: /Verified participant/i })).toBeInTheDocument();
  });

  it("renders nothing when not verified", () => {
    const { container } = render(<VerifiedBadge verified={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
