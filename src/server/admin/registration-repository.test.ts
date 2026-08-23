import { describe, expect, it } from "vitest";
import { CHALLENGE_CLEANUP_STRATEGY } from "@/server/admin/registration-repository";

describe("admin registration repository foundation", () => {
  it("documents serverless-safe challenge cleanup strategy", () => {
    expect(CHALLENGE_CLEANUP_STRATEGY.approach).toContain("vercel-cron");
    expect(CHALLENGE_CLEANUP_STRATEGY.note).toMatch(/Do not use process-local/i);
  });
});
