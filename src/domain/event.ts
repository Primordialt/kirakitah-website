import type { ImageAsset } from "./image-asset";

export type EventStatus =
  | "draft"
  | "registration-open"
  | "in-progress"
  | "completed";

export interface Event {
  id: string;
  slug: string;
  initiativeId: string;
  name: string;
  description: string;
  status: EventStatus;
  startDate: string;
  endDate: string;
  location?: string;
  registrationOpen: boolean;
  registrationDeadline?: string;
  heroImage?: ImageAsset;
  rulesUrl?: string;
}
