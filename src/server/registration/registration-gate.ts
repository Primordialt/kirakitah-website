import { eq } from "drizzle-orm";
import { TOURNAMENT_EVENT_ID } from "@/config/competition";
import { getDb } from "@/server/db";
import { tournaments } from "@/server/db/schema";

export type RegistrationOpenState = "OPEN" | "CLOSED" | "NOT_YET_OPEN";

export class RegistrationGateError extends Error {
  readonly code: "REGISTRATION_CLOSED" | "REGISTRATION_NOT_YET_OPEN";
  readonly status = 403;

  constructor(
    code: "REGISTRATION_CLOSED" | "REGISTRATION_NOT_YET_OPEN",
    message: string,
  ) {
    super(message);
    this.name = "RegistrationGateError";
    this.code = code;
  }
}

/**
 * Server-side registration open/closed gate from tournament configuration.
 * Does not invent opening dates — uses existing tournament status and optional windows.
 */
export async function resolveRegistrationOpenState(
  eventId: string,
): Promise<RegistrationOpenState> {
  if (eventId !== TOURNAMENT_EVENT_ID) {
    return "CLOSED";
  }

  const db = getDb();
  const [tournament] = await db
    .select({
      status: tournaments.status,
      registrationStart: tournaments.registrationStart,
      registrationDeadline: tournaments.registrationDeadline,
    })
    .from(tournaments)
    .where(eq(tournaments.id, eventId))
    .limit(1);

  if (!tournament) {
    return "NOT_YET_OPEN";
  }

  if (tournament.status === "registration_open") {
    const now = Date.now();
    if (tournament.registrationStart) {
      const start = Date.parse(tournament.registrationStart);
      if (!Number.isNaN(start) && now < start) {
        return "NOT_YET_OPEN";
      }
    }
    if (tournament.registrationDeadline) {
      const deadline = Date.parse(tournament.registrationDeadline);
      if (!Number.isNaN(deadline) && now > deadline) {
        return "CLOSED";
      }
    }
    return "OPEN";
  }

  if (tournament.status === "draft") {
    return "NOT_YET_OPEN";
  }

  return "CLOSED";
}

export async function assertRegistrationOpen(eventId: string): Promise<void> {
  const state = await resolveRegistrationOpenState(eventId);

  if (state === "OPEN") {
    return;
  }

  if (state === "NOT_YET_OPEN") {
    throw new RegistrationGateError(
      "REGISTRATION_NOT_YET_OPEN",
      "Registration is not yet open for KIRAKITAH GAMING 926.",
    );
  }

  throw new RegistrationGateError(
    "REGISTRATION_CLOSED",
    "Registration is closed for KIRAKITAH GAMING 926.",
  );
}
