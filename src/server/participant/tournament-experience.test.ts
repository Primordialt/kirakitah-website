import { describe, expect, it } from "vitest";
import { ParticipantTournamentAccessError } from "@/server/participant/tournament-context";

describe("ParticipantTournamentAccessError", () => {
  it("uses forbidden for cross-account access", () => {
    const error = new ParticipantTournamentAccessError(
      "FORBIDDEN",
      "You do not have access to this application.",
    );
    expect(error.status).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
  });

  it("uses not found for missing applications", () => {
    const error = new ParticipantTournamentAccessError(
      "NOT_FOUND",
      "Application not found.",
      404,
    );
    expect(error.status).toBe(404);
  });
});

describe("participant tournament projections safety", () => {
  it("does not expose sensitive fields in application view shape", async () => {
    const { assertNoSensitivePublicFields } = await import(
      "@/server/tournament/competition/public-projections"
    );

    expect(() =>
      assertNoSensitivePublicFields({
        referenceId: "KG926-TEST",
        statusLabel: "APPLICATION RECEIVED",
        gamerTag: "PlayerOne",
      }),
    ).not.toThrow();

    expect(() =>
      assertNoSensitivePublicFields({
        email: "secret@example.com",
      }),
    ).toThrow(/sensitive field/i);
  });
});
