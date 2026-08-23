import type { ImageAsset } from "./image-asset";

export interface Story {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image?: ImageAsset;
  publishedAt: string;
  category: string;
  author?: string;
  featured: boolean;
}
