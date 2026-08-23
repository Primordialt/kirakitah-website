import type { Event } from "@/domain/event";

export interface IEventService {
  getAll(): Promise<Event[]>;
  getBySlug(slug: string): Promise<Event | null>;
  getByInitiativeId(initiativeId: string): Promise<Event[]>;
}
