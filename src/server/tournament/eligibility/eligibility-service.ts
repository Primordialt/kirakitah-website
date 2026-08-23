import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  registrationApplications,
  registrationGuardians,
  tournamentParticipants,
  tournaments,
} from "@/server/db/schema";
import { calculateAge, requiresGuardian } from "@/domain/registration";
import { parseEligibilityRules } from "@/server/tournament/eligibility/eligibility-rules";
import type {
  EligibilityEvaluationResult,
  RegistrationWindowState,
  TournamentEligibilityRulesConfig,
} from "@/server/tournament/eligibility/eligibility-types";
import type { EligibilityReasonCode } from "@/server/tournament/eligibility/eligibility-reasons";

export function resolveRegistrationWindow(input: {
  status: string;
  registrationStart: string | null;
  registrationDeadline: string | null;
  now?: Date;
}): RegistrationWindowState {
  const now = input.now ?? new Date();

  if (input.status !== "registration_open") {
    return "closed";
  }

  if (input.registrationStart) {
    const start = new Date(input.registrationStart);
    if (now < start) return "not_yet_open";
  }

  if (input.registrationDeadline) {
    const deadline = new Date(input.registrationDeadline);
    if (now > deadline) return "closed";
  }

  return "open";
}

export async function loadApplicationForEligibility(
  tournamentId: string,
  referenceId: string,
) {
  const db = getDb();

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);

  if (!tournament) {
    return { tournament: null, application: null, guardian: null, participant: null };
  }

  const [application] = await db
    .select()
    .from(registrationApplications)
    .where(
      and(
        eq(registrationApplications.referenceId, referenceId),
        eq(registrationApplications.eventId, tournamentId),
      ),
    )
    .limit(1);

  if (!application) {
    return { tournament, application: null, guardian: null, participant: null };
  }

  const [guardian] = await db
    .select()
    .from(registrationGuardians)
    .where(eq(registrationGuardians.applicationId, application.id))
    .limit(1);

  const [participant] = await db
    .select()
    .from(tournamentParticipants)
    .where(
      and(
        eq(tournamentParticipants.tournamentId, tournamentId),
        eq(tournamentParticipants.applicationId, application.id),
      ),
    )
    .limit(1);

  return { tournament, application, guardian: guardian ?? null, participant: participant ?? null };
}

export function evaluateRegistrationEligibility(input: {
  tournament: {
    id: string;
    status: string;
    registrationStart: string | null;
    registrationDeadline: string | null;
    eligibilityRulesVersion: string;
    eligibilityRules: unknown;
  };
  application: {
    id: string;
    referenceId: string;
    dateOfBirth: string;
    status: string;
    identityVerificationStatus: string;
    emailVerificationStatus: string;
    phoneVerificationStatus: string;
  };
  guardian: { consentAt: string } | null;
  existingParticipant: { status: string } | null;
  now?: Date;
}): EligibilityEvaluationResult {
  const { config } = parseEligibilityRules(
    input.tournament.eligibilityRules,
    input.tournament.eligibilityRulesVersion,
  );

  return evaluateWithConfig({
    tournamentId: input.tournament.id,
    application: input.application,
    guardian: input.guardian,
    existingParticipant: input.existingParticipant,
    config,
    rulesVersion: input.tournament.eligibilityRulesVersion,
    registrationWindow: resolveRegistrationWindow({
      status: input.tournament.status,
      registrationStart: input.tournament.registrationStart,
      registrationDeadline: input.tournament.registrationDeadline,
      now: input.now,
    }),
  });
}

export function evaluateWithConfig(input: {
  tournamentId: string;
  application: {
    id: string;
    referenceId: string;
    dateOfBirth: string;
    status: string;
    identityVerificationStatus: string;
    emailVerificationStatus: string;
    phoneVerificationStatus: string;
  };
  guardian: { consentAt: string } | null;
  existingParticipant: { status: string } | null;
  config: TournamentEligibilityRulesConfig;
  rulesVersion: string;
  registrationWindow: RegistrationWindowState;
}): EligibilityEvaluationResult {
  const reasons: EligibilityReasonCode[] = [];
  const age = calculateAge(input.application.dateOfBirth);
  const needsGuardian = requiresGuardian(input.application.dateOfBirth);

  const evaluatedRequirements: Record<string, boolean | string | number | null> = {
    minimumAgeMet: age >= input.config.minimumAge,
    age,
    applicationStatus: input.application.status,
    identityStatus: input.application.identityVerificationStatus,
    emailVerificationStatus: input.application.emailVerificationStatus,
    phoneVerificationStatus: input.application.phoneVerificationStatus,
    guardianRequired: needsGuardian,
    guardianPresent: Boolean(input.guardian),
    guardianConsentPresent: Boolean(input.guardian?.consentAt),
    registrationWindow: input.registrationWindow,
    emailVerificationRequired: input.config.emailVerificationRequired,
    phoneVerificationRequired: input.config.phoneVerificationRequired,
    applicationApprovedRequired: input.config.applicationApprovedRequired,
  };

  if (age < input.config.minimumAge) {
    reasons.push("AGE_BELOW_MINIMUM");
  }

  if (input.application.status === "rejected") {
    reasons.push("APPLICATION_REJECTED");
  } else if (input.application.status === "withdrawn") {
    reasons.push("APPLICATION_WITHDRAWN");
  } else if (
    input.config.applicationApprovedRequired &&
    input.application.status !== input.config.approvedApplicationStatus
  ) {
    reasons.push("APPLICATION_NOT_APPROVED");
  }

  if (input.config.identityVerifiedRequired) {
    if (input.application.identityVerificationStatus === "pending_review") {
      reasons.push("IDENTITY_PENDING");
    } else if (input.application.identityVerificationStatus === "rejected") {
      reasons.push("IDENTITY_REJECTED");
    } else if (input.application.identityVerificationStatus !== "verified") {
      reasons.push("IDENTITY_PENDING");
    }
  }

  if (
    input.config.emailVerificationRequired &&
    input.application.emailVerificationStatus !== "verified"
  ) {
    reasons.push("EMAIL_NOT_VERIFIED");
  }

  if (
    input.config.phoneVerificationRequired &&
    input.application.phoneVerificationStatus !== "verified"
  ) {
    reasons.push("PHONE_NOT_VERIFIED");
  }

  if (input.config.requireGuardianForMinors && needsGuardian) {
    if (!input.guardian) {
      reasons.push("GUARDIAN_INFORMATION_MISSING");
    } else if (!input.guardian.consentAt) {
      reasons.push("GUARDIAN_CONSENT_MISSING");
    }
  }

  if (input.registrationWindow === "closed") {
    reasons.push("TOURNAMENT_REGISTRATION_CLOSED");
  } else if (input.registrationWindow === "not_yet_open") {
    reasons.push("TOURNAMENT_REGISTRATION_NOT_OPEN");
  }

  if (
    input.existingParticipant &&
    input.existingParticipant.status === "selected"
  ) {
    reasons.push("ALREADY_SELECTED");
  }

  const uniqueReasons = [...new Set(reasons)];

  return {
    eligible: uniqueReasons.length === 0,
    reasons: uniqueReasons,
    rulesVersion: input.rulesVersion,
    evaluatedRequirements,
    tournamentId: input.tournamentId,
    applicationId: input.application.id,
    applicationReference: input.application.referenceId,
  };
}

export async function evaluateRegistrationEligibilityByReference(
  tournamentId: string,
  referenceId: string,
  options?: { now?: Date },
): Promise<EligibilityEvaluationResult | null> {
  const loaded = await loadApplicationForEligibility(tournamentId, referenceId);

  if (!loaded.tournament) {
    return {
      eligible: false,
      reasons: ["TOURNAMENT_NOT_FOUND"],
      rulesVersion: "unknown",
      evaluatedRequirements: {},
      tournamentId,
      applicationId: "",
      applicationReference: referenceId,
    };
  }

  if (!loaded.application) {
    return {
      eligible: false,
      reasons: ["APPLICATION_NOT_FOUND"],
      rulesVersion: loaded.tournament.eligibilityRulesVersion,
      evaluatedRequirements: {},
      tournamentId,
      applicationId: "",
      applicationReference: referenceId,
    };
  }

  return evaluateRegistrationEligibility({
    tournament: loaded.tournament,
    application: loaded.application,
    guardian: loaded.guardian,
    existingParticipant: loaded.participant,
    now: options?.now,
  });
}
