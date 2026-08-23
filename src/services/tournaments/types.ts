import type { Tournament } from "@/domain/tournament";

export interface ITournamentService {
  getFeatured(): Promise<Tournament | null>;
  getBySlug(slug: string): Promise<Tournament | null>;
  getAll(): Promise<Tournament[]>;
}
