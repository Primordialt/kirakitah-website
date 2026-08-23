import type { Story } from "@/domain/story";

export interface IStoryService {
  getAll(): Promise<Story[]>;
  getBySlug(slug: string): Promise<Story | null>;
  getFeatured(): Promise<Story[]>;
}
