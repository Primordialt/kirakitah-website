import type { ImageAsset } from "./image-asset";

export type InitiativeStatus = "active" | "upcoming" | "archived";

export type InitiativeCategory =
  | "technology"
  | "culture"
  | "competition"
  | "creativity"
  | "community"
  | "experiences";

export interface InitiativeCta {
  label: string;
  href: string;
}

export interface Initiative {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  status: InitiativeStatus;
  category: InitiativeCategory;
  featuredImage: ImageAsset;
  heroImage?: ImageAsset;
  cta?: InitiativeCta;
  sortOrder: number;
}
