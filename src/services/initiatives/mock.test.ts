import { describe, expect, it } from "vitest";
import { MockInitiativeService } from "@/services/initiatives/mock";

describe("MockInitiativeService", () => {
  it("returns typed initiative data", async () => {
    const service = new MockInitiativeService();
    const initiatives = await service.getAll();

    expect(initiatives.length).toBeGreaterThanOrEqual(5);
    expect(initiatives[0]?.slug).toBe("kirakitah-gaming");
  });

  it("retrieves initiative by slug", async () => {
    const service = new MockInitiativeService();
    const gaming = await service.getBySlug("kirakitah-gaming");

    expect(gaming).not.toBeNull();
    expect(gaming?.status).toBe("active");
    expect(gaming?.name).toBe("KIRAKITAH Gaming");
  });
});
