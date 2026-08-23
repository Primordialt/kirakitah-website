import type { Event } from "@/domain/event";

export const mockEvents: Event[] = [
  {
    id: "event-kg2026",
    slug: "kirakitah-gaming-2026",
    initiativeId: "init-gaming",
    name: "KIRAKITAH Gaming 2026",
    description:
      "The inaugural KIRAKITAH eFootball Mobile competition.",
    status: "registration-open",
    startDate: "2026-06-01T00:00:00.000Z",
    endDate: "2026-08-31T23:59:59.000Z",
    location: "Online",
    registrationOpen: true,
    registrationDeadline: "2026-05-15T23:59:59.000Z",
    rulesUrl: "/esports/rules",
  },
];
