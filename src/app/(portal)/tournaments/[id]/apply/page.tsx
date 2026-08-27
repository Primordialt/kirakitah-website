import { TournamentApplyForm } from "@/components/features/participant/TournamentApplyForm";
import { Button } from "@/components/ui";
import { resolveTournamentId } from "@/lib/tournament/resolve-id";
import { COMPETITION_NAME } from "@/config/competition";
import {
  getParticipantSessionFromCookies,
  requireParticipantSession,
  ParticipantAuthenticationError,
} from "@/server/participant";
import { getApplicationPreflight } from "@/server/participant/application-preflight";
import { isRegistrationBackendConfigured } from "@/server/env";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: `Apply — ${COMPETITION_NAME}`,
  robots: { index: false, follow: false },
};

export default async function TournamentApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournamentId = resolveTournamentId(id);
  if (!tournamentId) {
    notFound();
  }

  let session;
  try {
    session = requireParticipantSession(
      await getParticipantSessionFromCookies(),
    );
  } catch (error) {
    if (error instanceof ParticipantAuthenticationError) {
      redirect(`/login?next=/tournaments/${tournamentId}/apply`);
    }
    redirect(`/login?next=/tournaments/${tournamentId}/apply`);
  }

  if (!isRegistrationBackendConfigured()) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-h2">Application unavailable</h1>
        <p className="text-body text-text-secondary">
          Tournament applications are not configured for this environment.
        </p>
        <Button href="/dashboard">Back to dashboard</Button>
      </div>
    );
  }

  const preflight = await getApplicationPreflight(
    session.user.id,
    tournamentId,
  );

  return (
    <TournamentApplyForm tournamentId={tournamentId} preflight={preflight} />
  );
}
