import { mockEvents } from "@/data/mocks/events";
import type { Event } from "@/domain/event";
import type { IEventService } from "./types";

export class MockEventService implements IEventService {
  async getAll(): Promise<Event[]> {
    return mockEvents;
  }

  async getBySlug(slug: string): Promise<Event | null> {
    return mockEvents.find((event) => event.slug === slug) ?? null;
  }

  async getByInitiativeId(initiativeId: string): Promise<Event[]> {
    return mockEvents.filter((event) => event.initiativeId === initiativeId);
  }
}
