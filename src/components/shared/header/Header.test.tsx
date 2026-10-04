import { Header } from "@/components/shared/header/Header";
import { desktopNavigation, headerAuthLinks } from "@/config/navigation";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

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

describe("Header", () => {
  it("renders the KIRAKITAH wordmark", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /KIRAKITAH home/i })).toBeInTheDocument();
  });

  it("renders primary navigation links", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /KIRAKITAH home/i })).toBeInTheDocument();
    for (const item of desktopNavigation) {
      expect(screen.getAllByRole("link", { name: item.label }).length).toBeGreaterThan(0);
    }
  });

  it("renders prominent login and sign up actions", () => {
    render(<Header />);
    expect(
      screen.getAllByRole("link", { name: headerAuthLinks.login.label }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: headerAuthLinks.register.label }).length,
    ).toBeGreaterThan(0);
  });

  it("marks the current route as active", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /KIRAKITAH home/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("exposes menu button with aria-expanded", () => {
    render(<Header />);
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
