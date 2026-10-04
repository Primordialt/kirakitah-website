import type { Tournament } from "@/domain/tournament";
import {
  COMPETITION_NAME,
  KG926_EDITION_START_DATE,
  KG926_EDITION_START_ISO,
  TOURNAMENT_EVENT_ID,
  TOURNAMENT_SLUG,
} from "@/config/competition";

export const mockTournaments: Tournament[] = [
  {
    id: TOURNAMENT_EVENT_ID,
    slug: TOURNAMENT_SLUG,
    initiativeId: "init-gaming",
    name: COMPETITION_NAME,
    competitionTitle: "eFootball Mobile Championship",
    description:
      "The inaugural KIRAKITAH eFootball Mobile competition — an online 1v1 championship.",
    status: "registration-open",
    registrationState: "open",
    startDate: KG926_EDITION_START_ISO,
    endDate: KG926_EDITION_START_ISO,
    location: "Online",
    registrationOpen: true,
    rulesUrl: "/esports/rules",
    game: "eFootball Mobile",
    platform: "Mobile",
    format: "Online 1v1",
    minimumAge: 10,
    targetPlayers: 128,
    qualificationTarget: 32,
    championCount: 1,
    grandPrize: "US$100",
    commencementDate: KG926_EDITION_START_DATE,
    prizeInfo: "US$100 Grand Prize",
  },
];

export { TOURNAMENT_EVENT_ID };
