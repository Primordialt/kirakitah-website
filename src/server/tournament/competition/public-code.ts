import { count, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { tournamentParticipants } from "@/server/db/schema";

/**
 * Generates a safe public participant identifier.
 * Format: KG926-P0001 — does not reveal DB UUID or application reference.
 */
export async function allocatePublicParticipantCode(
  tournamentId: string,
): Promise<string> {
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(tournamentParticipants)
    .where(eq(tournamentParticipants.tournamentId, tournamentId));

  const next = Number(row?.value ?? 0) + 1;
  const padded = String(next).padStart(4, "0");
  return `KG926-P${padded}`;
}
