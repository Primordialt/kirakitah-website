import HomePage from "@/app/(site)/page";
import { homepageFeaturedInitiative, homepageEcosystem } from "@/config/homepage";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Ecosystem } from "./Ecosystem";
import { FeaturedInitiative } from "./FeaturedInitiative";
import { Stories } from "./Stories";
import { mockStories } from "@/data/mocks/stories";

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

describe("HomePage", () => {
  it("renders primary h1 and main sections", async () => {
    const page = await HomePage();
    render(page);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /THE FUTURE IS YOURS TO CREATE/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /MORE THAN ONE THING/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /BUILT FOR WHAT'S NEXT/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: homepageFeaturedInitiative.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /BUILT DIFFERENT/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /YOU DON'T HAVE TO DO IT ALONE/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /WHAT'S HAPPENING/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /READY TO ENTER THE KIRAKITAH/i })).toBeInTheDocument();
  });

  it("renders primary CTAs with valid hrefs only", async () => {
    const page = await HomePage();
    render(page);

    const exploreLinks = screen.getAllByRole("link", { name: /EXPLORE KIRAKITAH/i });
    for (const link of exploreLinks) {
      expect(link).toHaveAttribute("href", "/initiatives");
    }

    expect(screen.getByRole("link", { name: /EXPLORE THE TOURNAMENT/i })).toHaveAttribute(
      "href",
      "/esports",
    );

    expect(screen.getByRole("link", { name: /REGISTER TO COMPETE/i })).toHaveAttribute(
      "href",
      "/esports/register",
    );
  });

  it("renders featured initiative statistics", async () => {
    const page = await HomePage();
    render(page);

    const statsRegion = screen.getByLabelText("Tournament statistics");
    for (const stat of homepageFeaturedInitiative.stats) {
      expect(within(statsRegion).getByText(stat.value)).toBeInTheDocument();
      expect(within(statsRegion).getByText(stat.label)).toBeInTheDocument();
    }
  });
});

describe("Ecosystem", () => {
  it("renders all ecosystem items", () => {
    render(<Ecosystem />);
    for (const item of homepageEcosystem.items) {
      expect(screen.getByRole("heading", { name: item.title })).toBeInTheDocument();
      expect(screen.getByText(item.description)).toBeInTheDocument();
    }
  });
});

describe("Stories section", () => {
  it("renders story cards from data", () => {
    render(<Stories stories={mockStories.filter((s) => s.featured)} />);
    expect(screen.getByText("Meet KIRAKITAH")).toBeInTheDocument();
    expect(
      screen.getByText("KIRAKITAH GAMING 926 Registration Is Coming"),
    ).toBeInTheDocument();
  });
});

describe("FeaturedInitiative", () => {
  it("renders tournament information from data", () => {
    render(<FeaturedInitiative />);
    expect(screen.getByText(homepageFeaturedInitiative.subtitle)).toBeInTheDocument();
    expect(screen.getByText("$100")).toBeInTheDocument();
  });
});
