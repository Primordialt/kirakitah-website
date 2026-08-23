import { describe, expect, it } from "vitest";
import { MockInitiativeService } from "@/services/initiatives/mock";

describe("MockInitiativeService", () => {
  it("returns typed initiative data", async () => {
    const service = new MockInitiativeService();
    const initiatives = await service.getAll();

    expect(initiatives).toHaveLength(1);
    expect(initiatives[0]?.slug).toBe("gaming");
  });
});
