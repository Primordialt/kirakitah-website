import { describe, expect, it } from "vitest";
import {
  socialProviderFromSubject,
  usernameBaseFromEmail,
} from "@/server/participant/auth/social";

describe("social sign-in", () => {
  it("recognizes Google and Apple subjects", () => {
    expect(socialProviderFromSubject("google-oauth2|123")).toBe("google");
    expect(socialProviderFromSubject("apple|123")).toBe("apple");
    expect(socialProviderFromSubject("auth0|123")).toBeNull();
  });

  it("builds a usable username from an email", () => {
    expect(usernameBaseFromEmail("Ada.Lovelace@example.com")).toBe("AdaLovelace");
    expect(usernameBaseFromEmail("a@example.com").length).toBeGreaterThanOrEqual(3);
    expect(usernameBaseFromEmail("admin@example.com")).not.toBe("admin");
  });
});
