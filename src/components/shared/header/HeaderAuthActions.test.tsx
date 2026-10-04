import { HeaderAuthActions } from "@/components/shared/header/HeaderAuthActions";
import { headerAuthLinks } from "@/config/navigation";
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

describe("HeaderAuthActions", () => {
  it("shows login and sign up when unauthenticated", () => {
    render(
      <HeaderAuthActions auth={{ isAuthenticated: false }} layout="desktop" />,
    );
    expect(
      screen.getByRole("link", { name: headerAuthLinks.login.label }),
    ).toHaveAttribute("href", "/login");
    expect(
      screen.getByRole("link", { name: headerAuthLinks.register.label }),
    ).toHaveAttribute("href", "/register");
  });

  it("shows fixtures and my account when authenticated", () => {
    render(
      <HeaderAuthActions
        auth={{ isAuthenticated: true, username: "ace_player" }}
        layout="desktop"
      />,
    );
    expect(
      screen.getByRole("link", { name: headerAuthLinks.fixtures.label }),
    ).toHaveAttribute("href", "/matches");
    expect(
      screen.getByRole("link", { name: headerAuthLinks.account.label }),
    ).toHaveAttribute("href", "/dashboard");
  });
});
