import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  registrationApplications,
  tournamentParticipants,
} from "@/server/db/schema";
import { TOURNAMENT_EVENT_ID } from "@/config/competition";

export async function getParticipantForApplicationReference(referenceId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      participantId: tournamentParticipants.id,
      status: tournamentParticipants.status,
      selectedAt: tournamentParticipants.selectedAt,
    })
    .from(tournamentParticipants)
    .innerJoin(
      registrationApplications,
      eq(tournamentParticipants.applicationId, registrationApplications.id),
    )
    .where(
      and(
        eq(tournamentParticipants.tournamentId, TOURNAMENT_EVENT_ID),
        eq(registrationApplications.referenceId, referenceId),
      ),
    )
    .limit(1);

  return row ?? null;
}
