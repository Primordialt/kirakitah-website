import { describe, expect, it } from "vitest";
import { auth0SocialLoginPath, safeAppPath } from "@/lib/auth0-paths";

describe("auth0 paths", () => {
  it("keeps in-app destinations", () => {
    expect(safeAppPath("/wallet")).toBe("/wallet");
    expect(safeAppPath("//evil.example")).toBe("/dashboard");
    expect(safeAppPath("https://evil.example")).toBe("/dashboard");
    expect(safeAppPath("/\\evil.example")).toBe("/dashboard");
    expect(safeAppPath("/wallet\nSet-Cookie:a")).toBe("/dashboard");
  });

  it("sends Google and Apple sign-in through Auth0 and back to the app", () => {
    expect(auth0SocialLoginPath("google", "/wallet")).toBe(
      "/auth/login?connection=google-oauth2&returnTo=%2Flogin%2Fcontinue%3Fnext%3D%252Fwallet",
    );
    expect(auth0SocialLoginPath("apple", "/wallet")).toBe(
      "/auth/login?connection=apple&returnTo=%2Flogin%2Fcontinue%3Fnext%3D%252Fwallet",
    );
  });
});
