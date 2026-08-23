import { Footer } from "@/components/shared/footer/Footer";
import { footerColumns } from "@/config/navigation";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Footer", () => {
  it("renders brand statement and tagline", () => {
    render(<Footer />);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByText("PLAY. COMPETE. CREATE.")).toBeInTheDocument();
    expect(screen.getByText(/An Initiative of Zurfte Zolutions/i)).toBeInTheDocument();
  });

  it("renders link group headings", () => {
    render(<Footer />);
    for (const column of footerColumns) {
      expect(screen.getByRole("heading", { name: column.title })).toBeInTheDocument();
    }
  });

  it("renders explore links with valid hrefs only", () => {
    render(<Footer />);
    const exploreLinks = footerColumns.find((col) => col.title === "Explore")!.links;
    for (const link of exploreLinks) {
      if (link.href) {
        expect(screen.getByRole("link", { name: link.label })).toHaveAttribute("href", link.href);
      }
    }
  });

  it("does not emit broken links for placeholder items", () => {
    render(<Footer />);
    const anchors = screen.getAllByRole("link");
    for (const anchor of anchors) {
      const href = anchor.getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).not.toBe("#");
      expect(href).not.toBe("null");
    }

    expect(screen.queryByRole("link", { name: "Register" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Instagram" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Privacy Policy" })).not.toBeInTheDocument();
  });
});
