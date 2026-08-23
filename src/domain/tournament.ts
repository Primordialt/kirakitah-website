import type { Event } from "./event";

export type TournamentRegistrationState = "open" | "closed" | "coming-soon";

export interface Tournament extends Event {
  game: string;
  platform: string;
  format: string;
  minimumAge: number;
  targetPlayers: number;
  qualificationTarget: number;
  championCount: number;
  grandPrize: string;
  commencementDate: string;
  competitionTitle: string;
  registrationState: TournamentRegistrationState;
  maxParticipants?: number;
  prizeInfo?: string;
}
