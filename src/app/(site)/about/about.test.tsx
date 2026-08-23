import AboutPage from "@/app/(site)/about/page";
import { aboutContent } from "@/config/about";
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

describe("About page", () => {
  it("renders h1 and main sections", () => {
    render(<AboutPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: aboutContent.hero.headline,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: aboutContent.whoWeAre.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: aboutContent.whyWeExist.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: aboutContent.principles.heading }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: aboutContent.whatWereBuilding.heading }),
    ).toBeInTheDocument();
  });

  it("renders explore initiatives CTA", () => {
    render(<AboutPage />);
    expect(
      screen.getAllByRole("link", { name: aboutContent.finalCta.cta.label }).length,
    ).toBeGreaterThan(0);
  });
});
