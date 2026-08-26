import { describe, expect, it } from "vitest";
import { explainPodReadiness } from "@/server/tournament/qualification/pod-service";

describe("Qualification readiness copy", () => {
  it("keeps host language distinct from participants", () => {
    const message = explainPodReadiness({
      status: "draft",
      capacity: 4,
      memberCount: 4,
      hostSemifinalIndex: 1,
      matchesGenerated: 0,
      qualifierPublicCode: null,
    });
    expect(message.toLowerCase()).not.toContain("player host");
  });
});
