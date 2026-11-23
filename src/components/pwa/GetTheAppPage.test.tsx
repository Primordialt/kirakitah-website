import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GetTheAppPage from "@/app/(site)/get-the-app/page";

describe("Add KIRAKITAH to your phone", () => {
  it("explains the home-screen steps in plain language", () => {
    render(<GetTheAppPage />);
    expect(screen.getByRole("heading", { name: "Add KIRAKITAH to your phone" })).toBeInTheDocument();
    expect(screen.getByText(/Tap the Share button/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Turn on phone alerts" })).toBeInTheDocument();
    expect(screen.queryByText(/service worker/i)).toBeNull();
    expect(screen.queryByText(/VAPID/i)).toBeNull();
  });
});
