import { describe, expect, it } from "vitest";
import { auth0LoginPath, safeAppPath } from "@/lib/auth0-paths";

describe("auth0 paths", () => {
  it("keeps in-app destinations", () => {
    expect(safeAppPath("/wallet")).toBe("/wallet");
    expect(safeAppPath("//evil.example")).toBe("/dashboard");
    expect(safeAppPath("https://evil.example")).toBe("/dashboard");
  });

  it("sends sign-in and sign-up through Auth0 and back to the app", () => {
    expect(auth0LoginPath("/wallet")).toBe(
      "/auth/login?returnTo=%2Flogin%2Fcontinue%3Fnext%3D%252Fwallet",
    );
    expect(auth0LoginPath("/wallet", "signup")).toBe(
      "/auth/login?screen_hint=signup&returnTo=%2Flogin%2Fcontinue%3Fnext%3D%252Fwallet",
    );
  });
});
