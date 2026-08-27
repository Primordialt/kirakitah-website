import { TournamentExperienceClient } from "@/components/features/participant/TournamentExperienceClient";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import { resolveTournamentId } from "@/lib/tournament/resolve-id";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "My Tournament — KIRAKITAH",
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

  return (
    <SectionShell className="py-12 md:py-16" containerClassName="max-w-3xl">
      <TournamentExperienceClient tournamentId={tournamentId} />
    </SectionShell>
  );
}
