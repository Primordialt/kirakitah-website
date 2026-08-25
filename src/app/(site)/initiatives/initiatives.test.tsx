import InitiativesPage from "@/app/(site)/initiatives/page";
import { InitiativeCard } from "@/components/shared/initiative/InitiativeCard";
import { mockInitiatives } from "@/data/mocks/initiatives";
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

describe("Initiatives page", () => {
  it("renders h1 and gaming initiative", async () => {
    const page = await InitiativesPage();
    render(page);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /WHAT WE'RE BUILDING/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "KIRAKITAH Gaming" })).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("In Development").length).toBeGreaterThan(0);
  });
});

describe("InitiativeCard", () => {
  it("renders active initiative with navigable CTA", () => {
    const gaming = mockInitiatives.find((i) => i.slug === "kirakitah-gaming")!;
    render(<InitiativeCard initiative={gaming} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/esports");
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders in-development initiative with navigable link", () => {
    const innovation = mockInitiatives.find((i) => i.slug === "innovation")!;
    render(<InitiativeCard initiative={innovation} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/initiatives/innovation");
    expect(screen.getAllByText("In Development").length).toBeGreaterThan(0);
  });
});
