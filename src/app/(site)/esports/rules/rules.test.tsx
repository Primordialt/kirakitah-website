import EsportsRulesPage from "@/app/(site)/esports/rules/page";
import { esportsRulesSections } from "@/config/esports";
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

describe("EsportsRulesPage", () => {
  it("loads and renders rule sections", () => {
    render(<EsportsRulesPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /TOURNAMENT RULES/i }),
    ).toBeInTheDocument();

    for (const section of esportsRulesSections) {
      expect(screen.getByRole("heading", { name: section.title })).toBeInTheDocument();
    }
  });

  it("renders navigation jump links", () => {
    render(<EsportsRulesPage />);

    const nav = screen.getByRole("navigation", { name: "Rules sections" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Eligibility" })).toHaveAttribute(
      "href",
      "#eligibility",
    );
  });
});
