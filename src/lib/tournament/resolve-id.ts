import { TOURNAMENT_EVENT_ID, TOURNAMENT_SLUG } from "@/config/competition";

/** Resolve route param to canonical tournament id (KG926 today). */
export function resolveTournamentId(id: string): string | null {
  if (id === TOURNAMENT_EVENT_ID || id === TOURNAMENT_SLUG) {
    return TOURNAMENT_EVENT_ID;
  }
  return null;
}
