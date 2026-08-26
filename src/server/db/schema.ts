import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
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

export const socialPlatformEnum = pgEnum("social_platform", [
  "instagram",
  "tiktok",
  "youtube",
  "x",
]);

export const socialPlatformVerificationStatusEnum = pgEnum(
  "social_platform_verification_status",
  ["pending", "verified", "rejected"],
);

export const socialFollowStatusEnum = pgEnum("social_follow_status", [
  "pending_review",
  "verified",
  "rejected",
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
    /** Digits-only form of phone for duplicate protection. Original `phone` is preserved. */
    phoneNormalized: text("phone_normalized").notNull(),
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
    socialFollowStatus: socialFollowStatusEnum("social_follow_status")
      .notNull()
      .default("pending_review"),
    socialFollowAttestation: boolean("social_follow_attestation")
      .notNull()
      .default(false),
    socialFollowAttestationAt: timestamp("social_follow_attestation_at", {
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
    /** Optional link to a participant account (nullable; not backfilled). */
    participantAccountId: uuid("participant_account_id").references(
      (): AnyPgColumn => participantAccounts.id,
      { onDelete: "set null" },
    ),
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
    uniqueIndex("registration_event_phone_active_idx")
      .on(table.eventId, table.phoneNormalized)
      .where(sql`${table.status} NOT IN ('rejected', 'withdrawn')`),
    uniqueIndex("registration_event_id_hash_active_idx")
      .on(table.eventId, table.identificationType, table.identificationNumberHash)
      .where(sql`${table.status} NOT IN ('rejected', 'withdrawn')`),
    index("registration_applications_social_follow_status_idx").on(
      table.socialFollowStatus,
    ),
    index("registration_applications_participant_account_id_idx").on(
      table.participantAccountId,
    ),
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

export const registrationSocialFollows = pgTable(
  "registration_social_follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => registrationApplications.id, { onDelete: "cascade" }),
    platform: socialPlatformEnum("platform").notNull(),
    applicantHandle: text("applicant_handle").notNull(),
    verificationStatus: socialPlatformVerificationStatusEnum("verification_status")
      .notNull()
      .default("pending"),
    verificationNotes: text("verification_notes"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", {
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
    uniqueIndex("registration_social_follows_application_platform_uidx").on(
      table.applicationId,
      table.platform,
    ),
    index("registration_social_follows_status_idx").on(
      table.verificationStatus,
      table.updatedAt,
    ),
  ],
);

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
 * Pre-registration email OTP + short-lived verification proof.
 * Does not create an application. Does not reserve email for duplicates
 * until a successful application is inserted.
 */
export const preRegistrationEmailChallenges = pgTable(
  "pre_registration_email_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    emailNormalized: text("email_normalized").notNull(),
    emailHash: text("email_hash").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "string" }),
    verificationTokenHash: text("verification_token_hash"),
    verificationExpiresAt: timestamp("verification_expires_at", {
      withTimezone: true,
      mode: "string",
    }),
    supersededAt: timestamp("superseded_at", { withTimezone: true, mode: "string" }),
    consumedAt: timestamp("consumed_at", { withTimezone: true, mode: "string" }),
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
  "ADMIN_LOGIN_SUCCESS",
  "ADMIN_LOGIN_FAILURE",
  "ADMIN_LOGOUT",
  "ADMIN_CREATED",
  "ADMIN_ROLE_CHANGED",
  "ADMIN_ACTIVATED",
  "ADMIN_DEACTIVATED",
  "IDENTITY_REVIEW_APPROVED",
  "IDENTITY_REVIEW_REJECTED",
  "APPLICATION_STATUS_CHANGED",
  "SENSITIVE_IDENTITY_VIEWED",
  "GUARDIAN_DATA_VIEWED",
  "PLAYER_PHOTO_VIEWED",
  "SOCIAL_FOLLOW_REVIEWED",
  "SOCIAL_FOLLOW_APPROVED",
  "SOCIAL_FOLLOW_REJECTED",
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
  "KNOCKOUT_PAIRINGS_CONFIGURED",
  "KNOCKOUT_PAIRINGS_REVISED",
  "KNOCKOUT_BRACKET_GENERATED",
  "KNOCKOUT_MATCH_CREATED",
  "KNOCKOUT_RESULT_RECORDED",
  "KNOCKOUT_MATCH_RESOLVED",
  "KNOCKOUT_RESULT_CORRECTED",
  "KNOCKOUT_MATCH_DISPUTED",
  "KNOCKOUT_FORFEIT_RECORDED",
  "KNOCKOUT_ROUND_COMPLETED",
  "TOURNAMENT_COMPLETED",
  "CHAMPION_RECORDED",
  "MATCH_RESCHEDULED",
  "MATCH_SCHEDULE_CANCELLED",
  "MATCH_ACTIVATED",
  "MATCH_RULES_VIEWED",
  "COMPETITION_POLICY_VIEWED",
  "COMPETITION_POLICY_CHANGED",
  "NO_SHOW_RECORDED",
  "DISCONNECT_RESOLVED",
  "DISPUTE_RESOLVED",
  "MATCH_NOTIFICATION_CREATED",
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

export const matchSchedulingStatusEnum = pgEnum("match_scheduling_status", [
  "unscheduled",
  "scheduled",
  "reschedule_requested",
  "cancelled",
]);

export const matchScheduleHistoryActionEnum = pgEnum(
  "match_schedule_history_action",
  ["scheduled", "rescheduled", "cancelled"],
);

export const matchNotificationEventTypeEnum = pgEnum(
  "match_notification_event_type",
  ["MATCH_SCHEDULED", "MATCH_RESCHEDULED", "MATCH_REMINDER", "MATCH_CANCELLED"],
);

export const matchNotificationDeliveryStatusEnum = pgEnum(
  "match_notification_delivery_status",
  ["pending", "recorded", "delivered", "failed"],
);

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

export const knockoutPairingSetStatusEnum = pgEnum("knockout_pairing_set_status", [
  "draft",
  "confirmed",
  "superseded",
]);

export const knockoutBracketStatusEnum = pgEnum("knockout_bracket_status", [
  "not_generated",
  "generated",
  "active",
  "completed",
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
  championParticipantId: uuid("champion_participant_id").references(
    (): AnyPgColumn => tournamentParticipants.id,
    { onDelete: "set null" },
  ),
  knockoutBracketStatus: knockoutBracketStatusEnum("knockout_bracket_status")
    .notNull()
    .default("not_generated"),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
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

export const knockoutPairingSets = pgTable(
  "knockout_pairing_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    phaseId: uuid("phase_id")
      .notNull()
      .references(() => tournamentPhases.id, { onDelete: "cascade" }),
    status: knockoutPairingSetStatusEnum("status").notNull().default("draft"),
    rulesVersion: text("rules_version").notNull().default("kg926-v1"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: "string" }),
    confirmedBy: text("confirmed_by"),
    changeReason: text("change_reason"),
    supersededAt: timestamp("superseded_at", {
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
    index("knockout_pairing_sets_tournament_status_idx").on(
      table.tournamentId,
      table.status,
    ),
  ],
);

export const knockoutPairings = pgTable(
  "knockout_pairings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pairingSetId: uuid("pairing_set_id")
      .notNull()
      .references(() => knockoutPairingSets.id, { onDelete: "cascade" }),
    slotIndex: integer("slot_index").notNull(),
    participantAId: uuid("participant_a_id")
      .notNull()
      .references(() => tournamentParticipants.id, { onDelete: "restrict" }),
    participantBId: uuid("participant_b_id")
      .notNull()
      .references(() => tournamentParticipants.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("knockout_pairings_set_slot_unique").on(
      table.pairingSetId,
      table.slotIndex,
    ),
  ],
);

export const knockoutPairingParticipants = pgTable(
  "knockout_pairing_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pairingSetId: uuid("pairing_set_id")
      .notNull()
      .references(() => knockoutPairingSets.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => tournamentParticipants.id, { onDelete: "restrict" }),
    slotIndex: integer("slot_index").notNull(),
    side: text("side").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("knockout_pairing_participants_set_participant_unique").on(
      table.pairingSetId,
      table.participantId,
    ),
    uniqueIndex("knockout_pairing_participants_set_slot_side_unique").on(
      table.pairingSetId,
      table.slotIndex,
      table.side,
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
    bracketSlotIndex: integer("bracket_slot_index"),
    scheduledAt: timestamp("scheduled_at", {
      withTimezone: true,
      mode: "string",
    }),
    timezone: text("timezone"),
    scheduledWindowStart: timestamp("scheduled_window_start", {
      withTimezone: true,
      mode: "string",
    }),
    scheduledWindowEnd: timestamp("scheduled_window_end", {
      withTimezone: true,
      mode: "string",
    }),
    schedulingStatus: matchSchedulingStatusEnum("scheduling_status")
      .notNull()
      .default("unscheduled"),
    scheduledBy: text("scheduled_by"),
    scheduleUpdatedAt: timestamp("schedule_updated_at", {
      withTimezone: true,
      mode: "string",
    }),
    scheduleCancelReason: text("schedule_cancel_reason"),
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
    index("matches_knockout_round_slot_idx").on(
      table.knockoutRoundId,
      table.bracketSlotIndex,
    ),
    index("matches_participant_a_scheduled_idx").on(
      table.participantAId,
      table.scheduledAt,
    ),
    index("matches_participant_b_scheduled_idx").on(
      table.participantBId,
      table.scheduledAt,
    ),
  ],
);

export const matchScheduleHistory = pgTable(
  "match_schedule_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    action: matchScheduleHistoryActionEnum("action").notNull(),
    previousScheduledAt: timestamp("previous_scheduled_at", {
      withTimezone: true,
      mode: "string",
    }),
    previousWindowStart: timestamp("previous_window_start", {
      withTimezone: true,
      mode: "string",
    }),
    previousWindowEnd: timestamp("previous_window_end", {
      withTimezone: true,
      mode: "string",
    }),
    previousTimezone: text("previous_timezone"),
    scheduledAt: timestamp("scheduled_at", {
      withTimezone: true,
      mode: "string",
    }),
    scheduledWindowStart: timestamp("scheduled_window_start", {
      withTimezone: true,
      mode: "string",
    }),
    scheduledWindowEnd: timestamp("scheduled_window_end", {
      withTimezone: true,
      mode: "string",
    }),
    timezone: text("timezone"),
    reason: text("reason"),
    actorId: text("actor_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("match_schedule_history_match_idx").on(table.matchId, table.createdAt),
  ],
);

export const matchNotificationEvents = pgTable(
  "match_notification_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: matchNotificationEventTypeEnum("event_type").notNull(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    recipientParticipantId: uuid("recipient_participant_id").references(
      () => tournamentParticipants.id,
      { onDelete: "set null" },
    ),
    deliveryStatus: matchNotificationDeliveryStatusEnum("delivery_status")
      .notNull()
      .default("recorded"),
    channel: text("channel").notNull().default("internal"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", {
      withTimezone: true,
      mode: "string",
    }),
  },
  (table) => [
    index("match_notification_events_match_idx").on(table.matchId, table.createdAt),
    index("match_notification_events_participant_idx").on(
      table.recipientParticipantId,
      table.createdAt,
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

/**
 * Append-only competition policy configuration history.
 * Never overwrite — each change creates a new snapshot.
 */
export const competitionPolicyHistory = pgTable(
  "competition_policy_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: text("tournament_id")
      .notNull()
      .references(() => tournaments.id, { onDelete: "cascade" }),
    rulesVersion: text("rules_version").notNull(),
    configuration: jsonb("configuration")
      .$type<Record<string, unknown>>()
      .notNull(),
    changeReason: text("change_reason").notNull(),
    changedBy: text("changed_by").notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("competition_policy_history_tournament_idx").on(
      table.tournamentId,
      table.effectiveAt,
    ),
  ],
);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: adminRoleEnum("role").notNull(),
  active: boolean("active").notNull().default(true),
  passwordHash: text("password_hash"),
  passwordUpdatedAt: timestamp("password_updated_at", {
    withTimezone: true,
    mode: "string",
  }),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", {
    withTimezone: true,
    mode: "string",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "string" }),
});

/**
 * DB-backed admin login rate-limit attempts (IP / email hashes only).
 * Never store plaintext emails, passwords, or raw IPs.
 */
export const adminLoginAttempts = pgTable(
  "admin_login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptKey: text("attempt_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("admin_login_attempts_key_created_idx").on(
      table.attemptKey,
      table.createdAt,
    ),
  ],
);

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

export const participantProfileStatusEnum = pgEnum("participant_profile_status", [
  "incomplete",
  "submitted_for_review",
  "needs_correction",
  "verified",
]);

export interface ParticipantGuardianRecord {
  fullName: string;
  relationship: string;
  email: string;
  phone: string;
  consentAt: string;
}

export const participantAccounts = pgTable(
  "participant_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    emailNormalized: text("email_normalized").notNull(),
    username: text("username").notNull(),
    usernameNormalized: text("username_normalized").notNull(),
    passwordHash: text("password_hash").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", {
      withTimezone: true,
      mode: "string",
    }),
    active: boolean("active").notNull().default(true),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", {
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
    uniqueIndex("participant_accounts_email_normalized_uidx").on(
      table.emailNormalized,
    ),
    uniqueIndex("participant_accounts_username_normalized_uidx").on(
      table.usernameNormalized,
    ),
  ],
);

export const participantProfiles = pgTable(
  "participant_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => participantAccounts.id, { onDelete: "cascade" }),
    status: participantProfileStatusEnum("status")
      .notNull()
      .default("incomplete"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    dateOfBirth: date("date_of_birth"),
    country: text("country"),
    city: text("city"),
    phone: text("phone"),
    phoneNormalized: text("phone_normalized"),
    identificationType: identificationTypeEnum("identification_type"),
    identificationNumberHash: text("identification_number_hash"),
    identificationNumberEncrypted: text("identification_number_encrypted"),
    gamerTag: text("gamer_tag"),
    playerPhotoBlobKey: text("player_photo_blob_key"),
    playerPhotoMeta: jsonb("player_photo_meta").$type<PlayerPhotoMeta>(),
    guardian: jsonb("guardian").$type<ParticipantGuardianRecord | null>(),
    completionPercent: integer("completion_percent").notNull().default(0),
    submittedAt: timestamp("submitted_at", {
      withTimezone: true,
      mode: "string",
    }),
    verifiedAt: timestamp("verified_at", {
      withTimezone: true,
      mode: "string",
    }),
    verifiedBy: text("verified_by"),
    correctionReason: text("correction_reason"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("participant_profiles_account_id_uidx").on(table.accountId),
    index("participant_profiles_status_idx").on(table.status),
  ],
);

export const participantSessions = pgTable(
  "participant_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => participantAccounts.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    revokedAt: timestamp("revoked_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("participant_sessions_token_hash_uidx").on(table.tokenHash),
    index("participant_sessions_account_id_idx").on(table.accountId),
    index("participant_sessions_expires_at_idx")
      .on(table.expiresAt)
      .where(sql`${table.revokedAt} IS NULL`),
  ],
);

/**
 * DB-backed participant login rate-limit attempts (identifier / IP hashes only).
 * Never store plaintext emails, usernames, passwords, or raw IPs.
 */
export const participantLoginAttempts = pgTable(
  "participant_login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    keyHash: text("key_hash").notNull(),
    attemptedAt: timestamp("attempted_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("participant_login_attempts_key_attempted_idx").on(
      table.keyHash,
      table.attemptedAt,
    ),
  ],
);

/**
 * Append-only participant audit trail.
 * Never store passwords, OTP, NIN, passport, email, phone, or guardian contacts.
 */
export const participantAuditEvents = pgTable(
  "participant_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").references(() => participantAccounts.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(),
    actor: text("actor"),
    metadata: jsonb("metadata").$type<
      Record<string, string | number | boolean | null>
    >(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("participant_audit_events_account_created_idx").on(
      table.accountId,
      table.createdAt,
    ),
    index("participant_audit_events_type_created_idx").on(
      table.eventType,
      table.createdAt,
    ),
  ],
);
