import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  registrationApplications,
  tournamentParticipants,
  tournaments,
} from "@/server/db/schema";
import type { ApiErrorCode } from "@/server/errors";

export class ParticipantTournamentAccessError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, status = 403) {
    super(message);
    this.name = "ParticipantTournamentAccessError";
    this.code = code;
    this.status = status;
  }
}

export type ParticipantTournamentContext = {
  tournament: typeof tournaments.$inferSelect | null;
  application: typeof registrationApplications.$inferSelect | null;
  tournamentParticipant: typeof tournamentParticipants.$inferSelect | null;
  participantId: string | null;
  publicCode: string | null;
};

/**
 * Resolve tournament + owned application + selection for a participant account.
 * Never returns another account's application.
 */
export async function resolveParticipantTournamentContext(
  accountId: string,
  tournamentId: string,
): Promise<ParticipantTournamentContext> {
  const db = getDb();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  const [application] = await db
    .select()
    .from(registrationApplications)
    .where(
      and(
        eq(registrationApplications.eventId, tournamentId),
        eq(registrationApplications.participantAccountId, accountId),
      ),
    )
    .orderBy(desc(registrationApplications.createdAt))
    .limit(1);

  if (!application) {
    return {
      tournament: tournament ?? null,
      application: null,
      tournamentParticipant: null,
      participantId: null,
      publicCode: null,
    };
  }

  const [tournamentParticipant] = await db
    .select()
    .from(tournamentParticipants)
    .where(
      and(
        eq(tournamentParticipants.tournamentId, tournamentId),
        eq(tournamentParticipants.applicationId, application.id),
      ),
    )
    .limit(1);

  return {
    tournament: tournament ?? null,
    application,
    tournamentParticipant: tournamentParticipant ?? null,
    participantId: tournamentParticipant?.id ?? null,
    publicCode: tournamentParticipant?.publicCode ?? null,
  };
}

/** Assert the application reference belongs to this account. */
export async function assertApplicationOwnedByAccount(
  accountId: string,
  referenceId: string,
): Promise<typeof registrationApplications.$inferSelect> {
  const db = getDb();
  const [application] = await db
    .select()
    .from(registrationApplications)
    .where(eq(registrationApplications.referenceId, referenceId.toUpperCase()))
    .limit(1);

  if (!application) {
    throw new ParticipantTournamentAccessError(
      "NOT_FOUND",
      "Application not found.",
      404,
    );
  }

  if (application.participantAccountId !== accountId) {
    throw new ParticipantTournamentAccessError(
      "FORBIDDEN",
      "You do not have access to this application.",
    );
  }

  return application;
}
