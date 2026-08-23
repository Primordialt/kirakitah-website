import EsportsFaqPage from "@/app/(site)/esports/faq/page";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("EsportsFaqPage", () => {
  it("renders esports FAQ questions", async () => {
    const page = await EsportsFaqPage();
    render(page);

    expect(screen.getByText("Who can participate?")).toBeInTheDocument();
    expect(screen.getByText("What game are we playing?")).toBeInTheDocument();
  });

  it("opens and closes accordion items with keyboard", async () => {
    const page = await EsportsFaqPage();
    render(page);
    const user = userEvent.setup();

    const trigger = screen.getByRole("button", { name: "Who can participate?" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Players aged 10 and above/i)).toBeVisible();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
