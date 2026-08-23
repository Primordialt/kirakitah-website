import { mockTournaments } from "@/data/mocks/tournaments";
import type { Tournament } from "@/domain/tournament";
import type { ITournamentService } from "./types";

export class MockTournamentService implements ITournamentService {
  async getFeatured(): Promise<Tournament | null> {
    return mockTournaments[0] ?? null;
  }

  async getBySlug(slug: string): Promise<Tournament | null> {
    return mockTournaments.find((t) => t.slug === slug) ?? null;
  }

  async getAll(): Promise<Tournament[]> {
    return mockTournaments;
  }
}
