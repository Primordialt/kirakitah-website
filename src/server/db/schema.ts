import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const registrationApplicationStatusEnum = pgEnum(
  "registration_application_status",
  ["received", "under_review", "verified", "rejected", "withdrawn"],
);

export const identificationTypeEnum = pgEnum("identification_type", [
  "nin",
  "passport",
]);

export const identityVerificationStatusEnum = pgEnum("identity_verification_status", [
  "pending_review",
  "verified",
  "manual_review",
  "rejected",
  "mismatch",
  "not_found",
  "provider_unavailable",
]);

export const contactVerificationStatusEnum = pgEnum("contact_verification_status", [
  "pending",
  "verified",
  "skipped",
  "unavailable",
]);

export const verificationChallengeChannelEnum = pgEnum("verification_challenge_channel", [
  "email",
  "phone",
]);

export const registrationAuditEventTypeEnum = pgEnum("registration_audit_event_type", [
  "EMAIL_VERIFIED",
  "PHONE_VERIFIED",
  "IDENTITY_REVIEW_APPROVED",
  "IDENTITY_REVIEW_REJECTED",
  "APPLICATION_STATUS_CHANGED",
]);

export interface PlayerPhotoMeta {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface RegistrationConsentsRecord {
  rules: boolean;
  terms: boolean;
  privacy: boolean;
  codeOfConduct: boolean;
  mediaConsent: boolean;
  acceptedAt: string;
}

export interface IdentityVerificationMeta {
  provider: string;
  checkedAt: string;
  details?: string;
}

export const registrationApplications = pgTable(
  "registration_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referenceId: text("reference_id").notNull().unique(),
    eventId: text("event_id").notNull(),
    status: registrationApplicationStatusEnum("status")
      .notNull()
      .default("received"),
    fullName: text("full_name").notNull(),
    dateOfBirth: date("date_of_birth").notNull(),
    country: text("country").notNull(),
    city: text("city").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    identificationType: identificationTypeEnum("identification_type").notNull(),
    identificationNumberHash: text("identification_number_hash").notNull(),
    identificationNumberEncrypted: text("identification_number_encrypted").notNull(),
    gamerTag: text("gamer_tag").notNull(),
    game: text("game").notNull(),
    platform: text("platform").notNull(),
    gamingProfile: text("gaming_profile"),
    timezone: text("timezone").notNull(),
    availability: jsonb("availability").$type<string[]>().notNull(),
    socialHandles: jsonb("social_handles").$type<Record<string, string>>(),
    playerPhotoBlobKey: text("player_photo_blob_key").notNull(),
    playerPhotoMeta: jsonb("player_photo_meta").$type<PlayerPhotoMeta>().notNull(),
    consents: jsonb("consents").$type<RegistrationConsentsRecord>().notNull(),
    identityVerificationStatus: identityVerificationStatusEnum(
      "identity_verification_status",
    )
      .notNull()
      .default("pending_review"),
    identityVerificationMeta: jsonb("identity_verification_meta").$type<
      IdentityVerificationMeta
    >(),
    emailVerificationStatus: contactVerificationStatusEnum("email_verification_status")
      .notNull()
      .default("skipped"),
    phoneVerificationStatus: contactVerificationStatusEnum("phone_verification_status")
      .notNull()
      .default("skipped"),
    emailVerifiedAt: timestamp("email_verified_at", {
      withTimezone: true,
      mode: "string",
    }),
    phoneVerifiedAt: timestamp("phone_verified_at", {
      withTimezone: true,
      mode: "string",
    }),
    identityReviewedAt: timestamp("identity_reviewed_at", {
      withTimezone: true,
      mode: "string",
    }),
    identityReviewedBy: text("identity_reviewed_by"),
    identityReviewNotes: text("identity_review_notes"),
    submitIpHash: text("submit_ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("registration_event_email_active_idx")
      .on(table.eventId, sql`lower(${table.email})`)
      .where(sql`${table.status} NOT IN ('rejected', 'withdrawn')`),
    uniqueIndex("registration_event_id_hash_active_idx")
      .on(table.eventId, table.identificationType, table.identificationNumberHash)
      .where(sql`${table.status} NOT IN ('rejected', 'withdrawn')`),
  ],
);

export const registrationGuardians = pgTable("registration_guardians", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => registrationApplications.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  relationship: text("relationship").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  consentAt: timestamp("consent_at", { withTimezone: true, mode: "string" })
    .notNull(),
});

export const registrationVerificationChallenges = pgTable(
  "registration_verification_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => registrationApplications.id, { onDelete: "cascade" }),
    channel: verificationChallengeChannelEnum("channel").notNull(),
    destinationHash: text("destination_hash").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "string" }),
    supersededAt: timestamp("superseded_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
);

/**
 * Administrative audit trail — never store OTP, NIN, passport, email, phone,
 * or guardian contacts in metadata payloads.
 */
export const registrationAuditEvents = pgTable("registration_audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => registrationApplications.id, { onDelete: "cascade" }),
  eventType: registrationAuditEventTypeEnum("event_type").notNull(),
  actor: text("actor"),
  metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const adminRoleEnum = pgEnum("admin_role", [
  "SUPER_ADMIN",
  "TOURNAMENT_ADMIN",
  "REVIEWER",
  "SUPPORT",
]);

export const adminAuditEventTypeEnum = pgEnum("admin_audit_event_type", [
  "ADMIN_LOGIN",
  "IDENTITY_REVIEW_APPROVED",
  "IDENTITY_REVIEW_REJECTED",
  "APPLICATION_STATUS_CHANGED",
  "SENSITIVE_IDENTITY_VIEWED",
  "GUARDIAN_DATA_VIEWED",
  "PLAYER_PHOTO_VIEWED",
  "ELIGIBILITY_EVALUATED",
  "PARTICIPANT_SELECTED",
  "PARTICIPANT_WITHDRAWN",
  "PARTICIPANT_DISQUALIFIED",
  "PHASE_CREATED",
  "PHASE_STARTED",
  "PHASE_COMPLETED",
  "MATCH_CREATED",
  "MATCH_SCHEDULED",
  "MATCH_RESULT_RECORDED",
  "MATCH_RESULT_CORRECTED",
  "MATCH_DISPUTED",
  "MATCH_FORFEITED",
  "QUALIFIER_ADVANCED",
  "QUALIFICATION_POD_CREATED",
  "QUALIFICATION_PARTICIPANT_ASSIGNED",
  "QUALIFICATION_PARTICIPANT_REASSIGNED",
  "QUALIFICATION_MATCH_CREATED",
  "QUALIFICATION_MATCH_RESOLVED",
  "QUALIFICATION_AUTO_ADVANCED",
  "QUALIFICATION_POD_COMPLETED",
  "QUALIFICATION_TOP32_ADVANCED",
]);

export const tournamentPhaseTypeEnum = pgEnum("tournament_phase_type", [
  "qualification",
  "knockout",
  "final",
]);

export const tournamentPhaseStatusEnum = pgEnum("tournament_phase_status", [
  "draft",
  "scheduled",
  "active",
  "completed",
  "cancelled",
]);

export const phaseParticipantStatusEnum = pgEnum("phase_participant_status", [
  "active",
  "qualified",
  "eliminated",
  "withdrawn",
  "disqualified",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "ready",
  "live",
  "completed",
  "cancelled",
  "disputed",
  "forfeited",
  "requires_resolution",
]);

export const matchResultSourceEnum = pgEnum("match_result_source", [
  "admin",
  "player_report",
  "integration",
]);

export const knockoutRoundTypeEnum = pgEnum("knockout_round_type", [
  "round_of_32",
  "round_of_16",
  "quarterfinal",
  "semifinal",
  "grand_final",
]);

export const knockoutRoundStatusEnum = pgEnum("knockout_round_status", [
  "draft",
  "scheduled",
  "active",
  "completed",
  "cancelled",
]);

export const qualificationPodStatusEnum = pgEnum("qualification_pod_status", [
  "draft",
  "ready",
  "active",
  "completed",
  "cancelled",
]);

export const qualificationRoundTypeEnum = pgEnum("qualification_round_type", [
  "semifinal",
  "final",
]);

export const competitorSlotTypeEnum = pgEnum("competitor_slot_type", [
  "participant",
  "host",
  "match_winner",
]);

export const qualificationOutcomeTypeEnum = pgEnum("qualification_outcome_type", [
  "played",
  "auto_advance",
  "requires_resolution",
]);

export const tournamentStatusEnum = pgEnum("tournament_status", [
  "draft",
  "registration_open",
  "registration_closed",
  "qualification",
  "knockout",
  "completed",
  "cancelled",
]);

export const tournamentParticipantStatusEnum = pgEnum("tournament_participant_status", [
  "selected",
  "withdrawn",
  "disqualified",
]);

export const tournaments = pgTable("tournaments", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  game: text("game").notNull(),
  edition: text("edition").notNull(),
  description: text("description"),
  format: text("format"),
  status: tournamentStatusEnum("status").notNull().default("draft"),
  registrationStart: timestamp("registration_start", {
    withTimezone: true,
    mode: "string",
  }),
  registrationDeadline: timestamp("registration_deadline", {
    withTimezone: true,
    mode: "string",
  }),
  commencementDate: date("commencement_date"),
  targetParticipantCount: integer("target_participant_count"),
  qualificationTarget: integer("qualification_target"),
  prizeInfo: text("prize_info"),
  eligibilityRulesVersion: text("eligibility_rules_version").notNull(),
  eligibilityRules: jsonb("eligibility_rules")
    .$type<Record<string, unknown>>()
    .notNull(),
  competitionRules: jsonb("competition_rules").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const eligibilityEvaluations = pgTable(
  "eligibility_evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => registrationApplications.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id"),
    rulesVersion: text("rules_version").notNull(),
    eligible: boolean("eligible").notNull(),
    reasonCodes: jsonb("reason_codes").$type<string[]>().notNull(),
    evaluatedRequirements: jsonb("evaluated_requirements")
      .$type<Record<string, boolean | string | number | null>>()
      .notNull(),
    evaluatorType: text("evaluator_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("eligibility_evaluations_tournament_application_idx").on(
      table.tournamentId,
      table.applicationId,
      table.createdAt,
    ),
  ],
);

export const tournamentParticipants = pgTable(
  "tournament_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => registrationApplications.id, { onDelete: "cascade" }),
    status: tournamentParticipantStatusEnum("status").notNull().default("selected"),
    /** Safe public identifier — never expose DB UUID or application reference publicly. */
    publicCode: text("public_code"),
    eligibilityEvaluationId: uuid("eligibility_evaluation_id")
      .notNull()
      .references(() => eligibilityEvaluations.id, { onDelete: "restrict" }),
    selectedAt: timestamp("selected_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    withdrawnAt: timestamp("withdrawn_at", {
      withTimezone: true,
      mode: "string",
    }),
    disqualifiedAt: timestamp("disqualified_at", {
      withTimezone: true,
      mode: "string",
    }),
    disqualificationReason: text("disqualification_reason"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tournament_participants_tournament_application_unique").on(
      table.tournamentId,
      table.applicationId,
    ),
    uniqueIndex("tournament_participants_public_code_unique")
      .on(table.publicCode)
      .where(sql`${table.publicCode} IS NOT NULL`),
    index("tournament_participants_tournament_status_idx").on(
      table.tournamentId,
      table.status,
    ),
  ],
);

export const tournamentPhases = pgTable(
  "tournament_phases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    phaseType: tournamentPhaseTypeEnum("phase_type").notNull(),
    sequence: integer("sequence").notNull(),
    status: tournamentPhaseStatusEnum("status").notNull().default("draft"),
    participantLimit: integer("participant_limit"),
    qualificationTarget: integer("qualification_target"),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "string" }),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "string" }),
    rulesVersion: text("rules_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tournament_phases_tournament_slug_unique").on(
      table.tournamentId,
      table.slug,
    ),
    uniqueIndex("tournament_phases_tournament_sequence_unique").on(
      table.tournamentId,
      table.sequence,
    ),
    index("tournament_phases_tournament_status_idx").on(
      table.tournamentId,
      table.status,
    ),
  ],
);

export const tournamentPhaseParticipants = pgTable(
  "tournament_phase_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phaseId: uuid("phase_id")
      .notNull()
      .references(() => tournamentPhases.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => tournamentParticipants.id, { onDelete: "cascade" }),
    status: phaseParticipantStatusEnum("status").notNull().default("active"),
    seed: integer("seed"),
    rank: integer("rank"),
    qualificationPosition: integer("qualification_position"),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    eliminatedAt: timestamp("eliminated_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tournament_phase_participants_phase_participant_unique").on(
      table.phaseId,
      table.participantId,
    ),
    index("tournament_phase_participants_phase_status_idx").on(
      table.phaseId,
      table.status,
    ),
  ],
);

export const knockoutRounds = pgTable(
  "knockout_rounds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phaseId: uuid("phase_id")
      .notNull()
      .references(() => tournamentPhases.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    roundType: knockoutRoundTypeEnum("round_type").notNull(),
    sequence: integer("sequence").notNull(),
    participantCount: integer("participant_count").notNull(),
    status: knockoutRoundStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("knockout_rounds_phase_type_unique").on(
      table.phaseId,
      table.roundType,
    ),
    uniqueIndex("knockout_rounds_phase_sequence_unique").on(
      table.phaseId,
      table.sequence,
    ),
  ],
);

export const qualificationPods = pgTable(
  "qualification_pods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    phaseId: uuid("phase_id")
      .notNull()
      .references(() => tournamentPhases.id, { onDelete: "cascade" }),
    podNumber: integer("pod_number").notNull(),
    status: qualificationPodStatusEnum("status").notNull().default("draft"),
    capacity: integer("capacity").notNull().default(4),
    hostSemifinalIndex: integer("host_semifinal_index"),
    qualifierParticipantId: uuid("qualifier_participant_id").references(
      () => tournamentParticipants.id,
      { onDelete: "set null" },
    ),
    rulesVersion: text("rules_version").notNull().default("kg926-v1"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("qualification_pods_tournament_pod_number_unique").on(
      table.tournamentId,
      table.podNumber,
    ),
    index("qualification_pods_phase_status_idx").on(table.phaseId, table.status),
  ],
);

export const qualificationPodMembers = pgTable(
  "qualification_pod_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    podId: uuid("pod_id")
      .notNull()
      .references(() => qualificationPods.id, { onDelete: "cascade" }),
    phaseId: uuid("phase_id")
      .notNull()
      .references(() => tournamentPhases.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => tournamentParticipants.id, { onDelete: "cascade" }),
    positionNumber: integer("position_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("qualification_pod_members_pod_position_unique").on(
      table.podId,
      table.positionNumber,
    ),
    uniqueIndex("qualification_pod_members_pod_participant_unique").on(
      table.podId,
      table.participantId,
    ),
    uniqueIndex("qualification_pod_members_phase_participant_unique").on(
      table.phaseId,
      table.participantId,
    ),
  ],
);

export const qualificationAutoAdvancements = pgTable(
  "qualification_auto_advancements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    podId: uuid("pod_id")
      .notNull()
      .references(() => qualificationPods.id, { onDelete: "cascade" }),
    phaseId: uuid("phase_id")
      .notNull()
      .references(() => tournamentPhases.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => tournamentParticipants.id, { onDelete: "cascade" }),
    semifinalIndex: integer("semifinal_index").notNull(),
    reason: text("reason").notNull().default("HOST_POSITION"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("qualification_auto_advancements_pod_participant_unique").on(
      table.podId,
      table.participantId,
    ),
  ],
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    phaseId: uuid("phase_id")
      .notNull()
      .references(() => tournamentPhases.id, { onDelete: "cascade" }),
    knockoutRoundId: uuid("knockout_round_id").references(
      () => knockoutRounds.id,
      { onDelete: "set null" },
    ),
    qualificationPodId: uuid("qualification_pod_id").references(
      () => qualificationPods.id,
      { onDelete: "cascade" },
    ),
    qualificationRound: qualificationRoundTypeEnum("qualification_round"),
    semifinalIndex: integer("semifinal_index"),
    slotAType: competitorSlotTypeEnum("slot_a_type").default("participant"),
    slotBType: competitorSlotTypeEnum("slot_b_type").default("participant"),
    participantAId: uuid("participant_a_id").references(
      () => tournamentParticipants.id,
      { onDelete: "restrict" },
    ),
    participantBId: uuid("participant_b_id").references(
      () => tournamentParticipants.id,
      { onDelete: "restrict" },
    ),
    dependsOnMatchAId: uuid("depends_on_match_a_id"),
    dependsOnMatchBId: uuid("depends_on_match_b_id"),
    scheduledAt: timestamp("scheduled_at", {
      withTimezone: true,
      mode: "string",
    }),
    status: matchStatusEnum("status").notNull().default("scheduled"),
    authoritativeResultId: uuid("authoritative_result_id"),
    rulesVersion: text("rules_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("matches_tournament_phase_status_idx").on(
      table.tournamentId,
      table.phaseId,
      table.status,
    ),
    index("matches_qualification_pod_idx").on(
      table.qualificationPodId,
      table.qualificationRound,
    ),
  ],
);

export const matchResults = pgTable(
  "match_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    participantAScore: integer("participant_a_score").notNull(),
    participantBScore: integer("participant_b_score").notNull(),
    winnerParticipantId: uuid("winner_participant_id").references(
      () => tournamentParticipants.id,
      { onDelete: "set null" },
    ),
    isDraw: boolean("is_draw").notNull().default(false),
    isAuthoritative: boolean("is_authoritative").notNull().default(true),
    resultSource: matchResultSourceEnum("result_source")
      .notNull()
      .default("admin"),
    outcomeType: qualificationOutcomeTypeEnum("outcome_type")
      .default("played"),
    recordedBy: text("recorded_by"),
    recordedAt: timestamp("recorded_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    supersededAt: timestamp("superseded_at", {
      withTimezone: true,
      mode: "string",
    }),
    supersededByResultId: uuid("superseded_by_result_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("match_results_match_authoritative_idx").on(
      table.matchId,
      table.isAuthoritative,
    ),
  ],
);

export const matchResultCorrections = pgTable("match_result_corrections", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  originalResultId: uuid("original_result_id")
    .notNull()
    .references(() => matchResults.id, { onDelete: "restrict" }),
  correctedResultId: uuid("corrected_result_id")
    .notNull()
    .references(() => matchResults.id, { onDelete: "restrict" }),
  reason: text("reason").notNull(),
  actorId: text("actor_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const qualificationStandings = pgTable(
  "qualification_standings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phaseId: uuid("phase_id")
      .notNull()
      .references(() => tournamentPhases.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => tournamentParticipants.id, { onDelete: "cascade" }),
    played: integer("played").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    points: integer("points").notNull().default(0),
    goalsFor: integer("goals_for").notNull().default(0),
    goalsAgainst: integer("goals_against").notNull().default(0),
    goalDifference: integer("goal_difference").notNull().default(0),
    rank: integer("rank"),
    rebuiltAt: timestamp("rebuilt_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("qualification_standings_phase_participant_unique").on(
      table.phaseId,
      table.participantId,
    ),
    index("qualification_standings_phase_rank_idx").on(table.phaseId, table.rank),
  ],
);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: adminRoleEnum("role").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "string" }),
});

/**
 * Append-only administrative audit trail.
 * Never store NIN, passport, OTP, email, phone, or guardian contacts.
 */
export const adminAuditEvents = pgTable("admin_audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: adminAuditEventTypeEnum("event_type").notNull(),
  actorId: text("actor_id"),
  actorRole: adminRoleEnum("actor_role"),
  applicationId: uuid("application_id").references(
    () => registrationApplications.id,
    { onDelete: "set null" },
  ),
  applicationReference: text("application_reference"),
  requestId: text("request_id"),
  metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});
