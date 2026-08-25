import type { ImageAsset } from "./image-asset";

export type InitiativeStatus =
  | "active"
  | "in-development"
  | "exploring"
  | "coming-next"
  | "upcoming"
  | "archived";

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
  body?: string[];
  status: InitiativeStatus;
  category: InitiativeCategory;
  featuredImage: ImageAsset;
  heroImage?: ImageAsset;
  cta?: InitiativeCta;
  featured?: boolean;
  sortOrder: number;
}
