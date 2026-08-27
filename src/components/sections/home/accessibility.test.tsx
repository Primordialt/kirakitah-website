import HomePage from "@/app/(site)/page";
import { homepagePrinciples } from "@/config/homepage";
import { Principles } from "./Principles";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Homepage accessibility", () => {
  it("uses distinct accessible names for registration and community CTAs", async () => {
    const page = await HomePage();
    render(page);

    const registerLinks = screen.getAllByRole("link", { name: /JOIN KIRAKITAH/i });
    for (const link of registerLinks) {
      expect(link).toHaveAttribute("href", "/register");
    }

    expect(
      screen.getByRole("link", { name: /JOIN THE COMMUNITY/i }),
    ).toHaveAttribute("href", "/community");
  });

  it("exposes brand intro focus areas to assistive tech", async () => {
    const page = await HomePage();
    render(page);

    const focusAreas = screen.getByLabelText("Focus areas");
    expect(focusAreas).toBeInTheDocument();
    expect(within(focusAreas).getByText("Technology")).toBeInTheDocument();
    expect(within(focusAreas).getByText("Community")).toBeInTheDocument();
  });
});

describe("Principles list semantics", () => {
  it("renders a valid ordered list with direct li children", () => {
    const { container } = render(<Principles />);
    const list = container.querySelector("ol");

    expect(list).not.toBeNull();
    const items = list?.querySelectorAll(":scope > li");
    expect(items?.length).toBe(homepagePrinciples.items.length);

    for (const item of items ?? []) {
      expect(item.querySelector("h3")).not.toBeNull();
    }
  });
});
