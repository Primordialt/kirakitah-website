import { mockStories } from "@/data/mocks/stories";
import type { Story } from "@/domain/story";
import type { IStoryService } from "./types";

export class MockStoryService implements IStoryService {
  async getAll(): Promise<Story[]> {
    return mockStories;
  }

  async getBySlug(slug: string): Promise<Story | null> {
    return mockStories.find((story) => story.slug === slug) ?? null;
  }

  async getFeatured(): Promise<Story[]> {
    return mockStories.filter((story) => story.featured);
  }
}
