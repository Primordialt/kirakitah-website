import { ParticipantNav } from "./ParticipantNav";
import { render, screen } from "@testing-library/react";
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

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("@/components/features/participant/LogoutButton", () => ({
  LogoutButton: () => <button type="button">Log out</button>,
}));

describe("ParticipantNav", () => {
  it("renders semantic navigation with keyboard-reachable links", () => {
    render(<ParticipantNav />);

    const nav = screen.getByRole("navigation", { name: "Participant portal" });
    expect(nav).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(6);

    for (const link of links) {
      expect(link).toHaveAttribute("href");
    }

    expect(screen.getByRole("link", { name: /DASHBOARD/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
