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
    index("tournament_participants_tournament_status_idx").on(
      table.tournamentId,
      table.status,
    ),
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
