import { mockInitiatives } from "@/data/mocks/initiatives";
import type { Initiative } from "@/domain/initiative";
import type { IInitiativeService } from "./types";

export class MockInitiativeService implements IInitiativeService {
  async getAll(): Promise<Initiative[]> {
    return mockInitiatives;
  }

  async getBySlug(slug: string): Promise<Initiative | null> {
    return mockInitiatives.find((initiative) => initiative.slug === slug) ?? null;
  }
}
