import { TournamentExperienceClient } from "@/components/features/participant/TournamentExperienceClient";
import { resolveTournamentId } from "@/lib/tournament/resolve-id";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Tournament — KIRAKITAH Participant Portal",
  robots: { index: false, follow: false },
};

export default async function ParticipantTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournamentId = resolveTournamentId(id);
  if (!tournamentId) {
    notFound();
  }

  return <TournamentExperienceClient tournamentId={tournamentId} />;
}
