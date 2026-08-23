import { Badge } from "@/components/ui/badge";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Badge", () => {
  it("renders default variant", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge.className).toContain("bg-surface-muted");
  });

  it("renders semantic variants", () => {
    const { rerender } = render(<Badge variant="success">Success</Badge>);
    expect(screen.getByText("Success").className).toContain("text-success");

    rerender(<Badge variant="warning">Warning</Badge>);
    expect(screen.getByText("Warning").className).toContain("text-warning");

    rerender(<Badge variant="error">Error</Badge>);
    expect(screen.getByText("Error").className).toContain("text-error");

    rerender(<Badge variant="brand">Brand</Badge>);
    expect(screen.getByText("Brand").className).toContain("text-accent");
  });
});
