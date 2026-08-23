import type { Event } from "./event";

export interface Tournament extends Event {
  game: string;
  platform: string;
  format: string;
  maxParticipants?: number;
  prizeInfo?: string;
}
