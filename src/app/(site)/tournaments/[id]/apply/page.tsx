import { TournamentApplyForm } from "@/components/features/participant/TournamentApplyForm";
import { Button } from "@/components/ui";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import { resolveTournamentId } from "@/lib/tournament/resolve-id";
import {
  COMPETITION_NAME,
} from "@/config/competition";
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

function resolveTournamentIdParam(id: string): string | null {
  return resolveTournamentId(id);
}

export default async function TournamentApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournamentId = resolveTournamentIdParam(id);
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
      <SectionShell className="py-12 md:py-16" containerClassName="max-w-2xl">
        <h1 className="text-h2">Application unavailable</h1>
        <p className="mt-3 text-body text-text-secondary">
          Tournament applications are not configured for this environment.
        </p>
        <div className="mt-6">
          <Button href="/dashboard">Back to dashboard</Button>
        </div>
      </SectionShell>
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
      <SectionShell className="py-12 md:py-16" containerClassName="max-w-2xl">
        <h1 className="text-h2 text-text-primary">
          APPLY — {COMPETITION_NAME}
        </h1>
        <p className="mt-4 text-body text-text-secondary" role="alert">
          {message}
        </p>
        {code ? (
          <p className="mt-2 text-body-sm text-text-muted">Code: {code}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href={getApplyGateAction(code).href}>
            {getApplyGateAction(code).buttonLabel}
          </Button>
          <Button href="/dashboard" variant="secondary">
            Dashboard
          </Button>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell className="py-12 md:py-16" containerClassName="max-w-3xl">
      <TournamentApplyForm tournamentId={tournamentId} />
    </SectionShell>
  );
}
