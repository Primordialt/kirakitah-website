import { PortalMobileTabBar } from "@/components/features/participant/portal/PortalMobileTabBar";
import { fireEvent, render, screen } from "@testing-library/react";
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
  usePathname: () => "/arena",
}));

vi.mock("@/lib/participant/api", () => ({
  participantFetch: vi.fn(async () => ({
    response: { ok: true } as Response,
    payload: { unreadCount: 0 },
  })),
}));

describe("PortalMobileTabBar", () => {
  it("keeps the main sections in a bottom bar and the rest behind More", () => {
    render(<PortalMobileTabBar identity={{ username: "ada", profileVerified: false }} />);

    expect(screen.getByRole("navigation", { name: "App sections" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Arena" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("link", { name: "Tournaments" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "More" }));

    expect(screen.getByRole("link", { name: "Tournaments" })).toHaveAttribute(
      "href",
      "/tournaments",
    );
    expect(screen.getByRole("link", { name: "Fixtures" })).toHaveAttribute("href", "/matches");
  });
});
