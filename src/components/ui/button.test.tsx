import { Button } from "@/components/ui/button";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

describe("Button", () => {
  it("renders with children", () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole("button", { name: "Click me" }),
    ).toBeInTheDocument();
  });

  it("renders variant classes", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole("button", { name: "Secondary" });
    expect(button.className).toContain("bg-surface-elevated");
  });

  it("applies disabled state", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
  });

  it("handles click interaction", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await user.click(screen.getByRole("button", { name: "Click" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is keyboard accessible", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Press</Button>);
    const button = screen.getByRole("button", { name: "Press" });
    button.focus();
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalled();
  });

  it("shows loading state", () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole("button", { name: "Submit" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("renders as link when href is provided", () => {
    render(<Button href="/test">Link</Button>);
    expect(screen.getByRole("link", { name: "Link" })).toHaveAttribute(
      "href",
      "/test",
    );
  });
});
