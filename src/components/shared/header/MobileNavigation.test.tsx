import { MobileNavigation } from "@/components/shared/header/MobileNavigation";
import { MobileMenuButton } from "@/components/shared/header/MobileMenuButton";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/about",
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

describe("MobileNavigation", () => {
  it("opens and exposes navigation when isOpen is true", () => {
    render(<MobileNavigation isOpen onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Mobile navigation" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Mobile primary" })).toBeInTheDocument();
  });

  it("closes on Escape key", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MobileNavigation isOpen onClose={onClose} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("is hidden when closed", () => {
    render(<MobileNavigation isOpen={false} onClose={vi.fn()} />);
    expect(document.getElementById("mobile-navigation")).toHaveAttribute("hidden");
  });
});

describe("MobileMenuButton", () => {
  it("updates aria-expanded when open", () => {
    const { rerender } = render(<MobileMenuButton isOpen={false} />);
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    rerender(<MobileMenuButton isOpen />);
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});
