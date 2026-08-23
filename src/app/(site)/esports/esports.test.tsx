import EsportsPage from "@/app/(site)/esports/page";
import { esportsStats, esportsJourneySteps } from "@/config/esports";
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

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

describe("EsportsPage", () => {
  it("loads and renders tournament name and stats", async () => {
    const page = await EsportsPage();
    render(page);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /YOUR GAME\. YOUR SKILL\. YOUR SHOT\./i,
      }),
    ).toBeInTheDocument();

    expect(screen.getAllByText("KIRAKITAH GAMING 926").length).toBeGreaterThan(0);

    const statsRegion = screen.getByLabelText("Tournament statistics");
    for (const stat of esportsStats) {
      expect(within(statsRegion).getByText(stat.value)).toBeInTheDocument();
      expect(within(statsRegion).getByText(stat.label)).toBeInTheDocument();
    }
  });

  it("renders tournament journey steps", async () => {
    const page = await EsportsPage();
    render(page);

    expect(screen.getByRole("heading", { name: /TOURNAMENT JOURNEY/i })).toBeInTheDocument();
    for (const step of esportsJourneySteps) {
      expect(
        screen.getByRole("heading", { name: step.title, level: 3 }),
      ).toBeInTheDocument();
    }
  });

  it("renders rules CTA linking to /esports/rules", async () => {
    const page = await EsportsPage();
    render(page);

    const rulesLinks = screen.getAllByRole("link", {
      name: /READ THE TOURNAMENT RULES/i,
    });
    expect(rulesLinks.some((link) => link.getAttribute("href") === "/esports/rules")).toBe(
      true,
    );
  });

  it("renders FAQ preview and view all link", async () => {
    const page = await EsportsPage();
    render(page);

    expect(screen.getByText("Who can participate?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /VIEW ALL FAQ/i })).toHaveAttribute(
      "href",
      "/esports/faq",
    );
  });
});
