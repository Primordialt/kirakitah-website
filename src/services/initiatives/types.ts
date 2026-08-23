import type { Initiative } from "@/domain/initiative";

export interface IInitiativeService {
  getAll(): Promise<Initiative[]>;
  getBySlug(slug: string): Promise<Initiative | null>;
}
