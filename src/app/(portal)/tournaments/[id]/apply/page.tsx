import { TournamentApplyForm } from "@/components/features/participant/TournamentApplyForm";
import { Button } from "@/components/ui";
import { resolveTournamentId } from "@/lib/tournament/resolve-id";
import { COMPETITION_NAME } from "@/config/competition";
import {
  ApplicationGateError,
  getProfileApplicationBlock,
  getParticipantSessionFromCookies,
  requireParticipantSession,
  ParticipantAuthenticationError,
} from "@/server/participant";
import { assertCanApplyToTournament } from "@/server/participant/application-gate";
import { getParticipantProfile } from "@/server/participant/profile/service";
import { getApplyGateAction } from "@/lib/participant/profile-presentation";
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

  try {
    await assertCanApplyToTournament(session.user.id, tournamentId);
  } catch (error) {
    let message = "You cannot apply to this tournament yet.";
    let code: string | null = null;

    if (error instanceof ApplicationGateError) {
      message = error.message;
      code = error.code;
    } else {
      try {
        const profile = await getParticipantProfile(session.user.id);
        const block = getProfileApplicationBlock(
          profile.status,
          profile.correctionReason,
        );
        if (block) {
          message = block.message;
          code = block.code;
        }
      } catch {
        // keep default message
      }
    }

    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-h2 text-text-primary">APPLY — {COMPETITION_NAME}</h1>
        <p className="text-body text-text-secondary" role="alert">
          {message}
        </p>
        {code ? (
          <p className="text-body-sm text-text-muted">Code: {code}</p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button href={getApplyGateAction(code).href}>
            {getApplyGateAction(code).buttonLabel}
          </Button>
          <Button href="/dashboard" variant="secondary">
            Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <TournamentApplyForm tournamentId={tournamentId} />;
}
