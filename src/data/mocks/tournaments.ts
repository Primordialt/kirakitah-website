import type { Tournament } from "@/domain/tournament";

export const mockTournaments: Tournament[] = [
  {
    id: "event-kg2026",
    slug: "kirakitah-gaming-2026",
    initiativeId: "init-gaming",
    name: "KIRAKITAH Gaming 2026",
    competitionTitle: "eFootball Mobile Championship",
    description:
      "The inaugural KIRAKITAH eFootball Mobile competition — an online 1v1 championship.",
    status: "registration-open",
    registrationState: "open",
    startDate: "2026-09-14T00:00:00.000Z",
    endDate: "2026-09-14T00:00:00.000Z",
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
    commencementDate: "2026-09-14",
    prizeInfo: "US$100 Grand Prize",
  },
];

export const TOURNAMENT_EVENT_ID = "event-kg2026";
