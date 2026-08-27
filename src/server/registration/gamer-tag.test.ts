import { describe, expect, it } from "vitest";
import {
  APPROVED_EFOOTBALL_ACCOUNT_LOCKED_CODE,
  APPROVED_EFOOTBALL_ACCOUNT_LOCKED_MESSAGE,
  EFOOTBALL_ACCOUNT_ALREADY_REGISTERED_CODE,
  EFOOTBALL_ACCOUNT_ALREADY_REGISTERED_MESSAGE,
  isGamerTagIdentityChange,
  normalizeGamerTagForStorage,
  normalizeGamerTagForUniqueness,
} from "@/server/registration/gamer-tag";

describe("gamer tag uniqueness helpers", () => {
  it("normalizes with trim + lowercase for uniqueness", () => {
    expect(normalizeGamerTagForUniqueness("  QDP  ")).toBe("qdp");
    expect(normalizeGamerTagForUniqueness("qdp")).toBe("qdp");
    expect(normalizeGamerTagForUniqueness("QdP")).toBe("qdp");
  });

  it("preserves casing when storing", () => {
    expect(normalizeGamerTagForStorage("  QDP  ")).toBe("QDP");
  });

  it("uses controlled public copy without revealing owners", () => {
    expect(EFOOTBALL_ACCOUNT_ALREADY_REGISTERED_CODE).toBe(
      "EFOOTBALL_ACCOUNT_ALREADY_REGISTERED",
    );
    expect(EFOOTBALL_ACCOUNT_ALREADY_REGISTERED_MESSAGE).toBe(
      "This eFootball account is already registered for KIRAKITAH GAMING 926.",
    );
    expect(EFOOTBALL_ACCOUNT_ALREADY_REGISTERED_MESSAGE).not.toMatch(
      /another|participant|email|selected|qualified/i,
    );
  });

  it("locks approved identity using the same normalization", () => {
    expect(isGamerTagIdentityChange("QDP", "qdp")).toBe(false);
    expect(isGamerTagIdentityChange("QDP", " ABC ")).toBe(true);
    expect(APPROVED_EFOOTBALL_ACCOUNT_LOCKED_CODE).toBe(
      "APPROVED_EFOOTBALL_ACCOUNT_LOCKED",
    );
    expect(APPROVED_EFOOTBALL_ACCOUNT_LOCKED_MESSAGE).toContain(
      "KIRAKITAH GAMING 926",
    );
  });
});
