import type { Event } from "@/domain/event";
import {
  COMPETITION_NAME,
  TOURNAMENT_EVENT_ID,
  TOURNAMENT_SLUG,
} from "@/config/competition";

export const mockEvents: Event[] = [
  {
    id: TOURNAMENT_EVENT_ID,
    slug: TOURNAMENT_SLUG,
    initiativeId: "init-gaming",
    name: COMPETITION_NAME,
    description:
      "The inaugural KIRAKITAH Gaming eFootball Mobile championship.",
    status: "registration-open",
    startDate: "2026-09-14T00:00:00.000Z",
    endDate: "2026-09-14T00:00:00.000Z",
    location: "Online",
    registrationOpen: true,
    rulesUrl: "/esports/rules",
  },
];
