import type { Event } from "@/domain/event";
import {
  COMPETITION_NAME,
  KG926_EDITION_START_ISO,
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
    startDate: KG926_EDITION_START_ISO,
    endDate: KG926_EDITION_START_ISO,
    location: "Online",
    registrationOpen: true,
    rulesUrl: "/esports/rules",
  },
];
