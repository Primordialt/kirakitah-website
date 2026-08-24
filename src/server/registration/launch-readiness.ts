import { sql } from "drizzle-orm";
import { getDataSource } from "@/config/data-source";
import { registrationPolicy } from "@/config/registration-policy";
import { getDb } from "@/server/db";
import {
  isRegistrationBackendConfigured,
  serverEnv,
} from "@/server/env";

/**
 * Operational readiness statuses.
 * Do not collapse these into bare booleans in admin diagnostics.
 */
export type CheckStatus =
  | "CONFIGURED"
  | "NOT_CONFIGURED"
  | "ERROR"
  | "PENDING_PRODUCT_DECISION"
  | "DEFERRED";

export interface ReadinessCheck {
  id: string;
  label: string;
  status: CheckStatus;
  /** Required for FULL_PRODUCTION REGISTRATION_READY */
  requiredForFullProduction: boolean;
  /** Required for MVP_MANUAL_REVIEW MVP_REGISTRATION_READY */
  requiredForMvp: boolean;
  detail: string;
}

export type LaunchGateState =
  | "MVP_REGISTRATION_READY"
  | "REGISTRATION_READY"
  | "REGISTRATION_NOT_READY";

export interface LaunchReadinessReport {
  gate: LaunchGateState;
  operatingMode: typeof registrationPolicy.mode;
  identityVerificationMode: "manual";
  contactVerification: typeof registrationPolicy.contactVerification;
  capacityPolicy: "CAPACITY_POLICY_PENDING";
  dataRetention: "PENDING_PRODUCT_LEGAL_POLICY";
  checks: ReadinessCheck[];
  blockers: string[];
  /** Distinguishes “applications can be received” vs full provider stack. */
  applicationsReceivable: boolean;
  fullProductionVerificationOperational: boolean;
}

/**
 * HTTP admin auth stub still throws "not yet enabled" even when env vars exist.
 * Credentials alone must not report CONFIGURED / REGISTRATION_READY.
 * Flip only after a real provider authenticate() path is implemented and tested.
 */
export const HTTP_ADMIN_AUTH_IMPLEMENTED = false;

function isValidPiiEncryptionKey(value: string | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-fA-F]{64}$/.test(value);
}

function emailProviderStatus(): ReadinessCheck {
  if (registrationPolicy.contactVerification === "DEFERRED") {
    return {
      id: "EMAIL_PROVIDER",
      label: "EMAIL PROVIDER",
      status: "DEFERRED",
      requiredForFullProduction: true,
      requiredForMvp: false,
      detail:
        "EMAIL VERIFICATION DEFERRED (MVP_MANUAL_REVIEW) — architecture intact; not required to accept applications",
    };
  }

  const configured =
    serverEnv.emailVerificationProvider === "http" &&
    Boolean(serverEnv.emailVerificationApiUrl) &&
    Boolean(serverEnv.emailVerificationApiKey);

  return {
    id: "EMAIL_PROVIDER",
    label: "EMAIL PROVIDER",
    status: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    requiredForFullProduction: true,
    requiredForMvp: false,
    detail: configured
      ? "HTTP email verification env configured (delivery still requires real-world smoke test)"
      : "PRODUCTION EMAIL PROVIDER REQUIRED — EMAIL DELIVERY = BLOCKED",
  };
}

function phoneProviderStatus(): ReadinessCheck {
  if (registrationPolicy.contactVerification === "DEFERRED") {
    return {
      id: "SMS_PROVIDER",
      label: "SMS PROVIDER",
      status: "DEFERRED",
      requiredForFullProduction: true,
      requiredForMvp: false,
      detail:
        "PHONE VERIFICATION DEFERRED (MVP_MANUAL_REVIEW) — architecture intact; not required to accept applications",
    };
  }

  const configured =
    serverEnv.phoneVerificationProvider === "http" &&
    Boolean(serverEnv.phoneVerificationApiUrl) &&
    Boolean(serverEnv.phoneVerificationApiKey);

  return {
    id: "SMS_PROVIDER",
    label: "SMS PROVIDER",
    status: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    requiredForFullProduction: true,
    requiredForMvp: false,
    detail: configured
      ? "HTTP phone verification env configured (delivery still requires real-world smoke test)"
      : "PRODUCTION SMS PROVIDER REQUIRED — SMS DELIVERY = BLOCKED",
  };
}

function adminAuthStatus(): ReadinessCheck {
  if (registrationPolicy.adminWorkflow === "MANUAL_DEFERRED_AUTH") {
    return {
      id: "ADMIN_AUTH",
      label: "ADMIN AUTH",
      status: "DEFERRED",
      requiredForFullProduction: true,
      requiredForMvp: false,
      detail:
        "ADMIN AUTH DEFERRED (MVP_MANUAL_REVIEW) — do not use insecure workarounds; secure ops process until provider enabled",
    };
  }

  if (!HTTP_ADMIN_AUTH_IMPLEMENTED) {
    return {
      id: "ADMIN_AUTH",
      label: "ADMIN AUTH",
      status: "NOT_CONFIGURED",
      requiredForFullProduction: true,
      requiredForMvp: false,
      detail:
        "PRODUCTION ADMIN AUTH PROVIDER REQUIRED — HTTP stub is not enabled (ADMIN AUTH = BLOCKED)",
    };
  }

  const configured =
    serverEnv.adminAuthProvider === "http" &&
    Boolean(serverEnv.adminSessionSecret) &&
    Boolean(serverEnv.adminAuthApiUrl) &&
    Boolean(serverEnv.adminAuthApiKey);

  return {
    id: "ADMIN_AUTH",
    label: "ADMIN AUTH",
    status: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    requiredForFullProduction: true,
    requiredForMvp: false,
    detail: configured
      ? "HTTP admin auth provider configured"
      : "PRODUCTION ADMIN AUTH PROVIDER REQUIRED",
  };
}

function encryptionStatus(): ReadinessCheck {
  const value = serverEnv.registrationPiiEncryptionKey;
  if (!value) {
    return {
      id: "ENCRYPTION",
      label: "ENCRYPTION",
      status: "NOT_CONFIGURED",
      requiredForFullProduction: true,
      requiredForMvp: true,
      detail: "REGISTRATION_PII_ENCRYPTION_KEY is missing",
    };
  }
  if (!isValidPiiEncryptionKey(value)) {
    return {
      id: "ENCRYPTION",
      label: "ENCRYPTION",
      status: "ERROR",
      requiredForFullProduction: true,
      requiredForMvp: true,
      detail:
        "REGISTRATION_PII_ENCRYPTION_KEY must be 64 hex characters (32 bytes)",
    };
  }
  return {
    id: "ENCRYPTION",
    label: "ENCRYPTION",
    status: "CONFIGURED",
    requiredForFullProduction: true,
    requiredForMvp: true,
    detail: "REGISTRATION_PII_ENCRYPTION_KEY format is valid",
  };
}

async function migrationVersionStatus(): Promise<ReadinessCheck> {
  if (!serverEnv.databaseUrl) {
    return {
      id: "MIGRATION_VERSION",
      label: "MIGRATION VERSION",
      status: "NOT_CONFIGURED",
      requiredForFullProduction: true,
      requiredForMvp: true,
      detail: "DATABASE_URL missing — cannot verify migrations",
    };
  }

  try {
    const db = getDb();
    const result = await db.execute(sql`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'registration_applications'
        AND column_name = 'phone_normalized'
      LIMIT 1
    `);
    const rows = Array.isArray(result)
      ? result
      : ((result as { rows?: unknown[] }).rows ?? []);

    if (rows.length > 0) {
      return {
        id: "MIGRATION_VERSION",
        label: "MIGRATION VERSION",
        status: "CONFIGURED",
        requiredForFullProduction: true,
        requiredForMvp: true,
        detail: "Expected schema present through 0010_phone_uniqueness",
      };
    }

    return {
      id: "MIGRATION_VERSION",
      label: "MIGRATION VERSION",
      status: "NOT_CONFIGURED",
      requiredForFullProduction: true,
      requiredForMvp: true,
      detail: "Apply migrations through 0010_phone_uniqueness.sql",
    };
  } catch {
    return {
      id: "MIGRATION_VERSION",
      label: "MIGRATION VERSION",
      status: "ERROR",
      requiredForFullProduction: true,
      requiredForMvp: true,
      detail: "Unable to query database schema for migration verification",
    };
  }
}

function emailProviderReady(): boolean {
  return (
    serverEnv.emailVerificationProvider === "http" &&
    Boolean(serverEnv.emailVerificationApiUrl) &&
    Boolean(serverEnv.emailVerificationApiKey)
  );
}

function phoneProviderReady(): boolean {
  return (
    serverEnv.phoneVerificationProvider === "http" &&
    Boolean(serverEnv.phoneVerificationApiUrl) &&
    Boolean(serverEnv.phoneVerificationApiKey)
  );
}

function adminAuthReady(): boolean {
  return (
    HTTP_ADMIN_AUTH_IMPLEMENTED &&
    serverEnv.adminAuthProvider === "http" &&
    Boolean(serverEnv.adminSessionSecret) &&
    Boolean(serverEnv.adminAuthApiUrl) &&
    Boolean(serverEnv.adminAuthApiKey)
  );
}

function isCheckSatisfied(check: ReadinessCheck): boolean {
  return check.status === "CONFIGURED" || check.status === "DEFERRED";
}

/**
 * Structured production launch readiness.
 *
 * Distinguishes:
 * - MVP_REGISTRATION_READY — applications can be received (infra + encryption + migrations)
 * - REGISTRATION_READY — full email/SMS/admin verification stack operational
 * - REGISTRATION_NOT_READY — mandatory MVP infra missing
 */
export async function evaluateLaunchReadiness(): Promise<LaunchReadinessReport> {
  const dataSource = getDataSource();
  const migrationCheck = await migrationVersionStatus();

  const checks: ReadinessCheck[] = [
    {
      id: "OPERATING_MODE",
      label: "OPERATING MODE",
      status: "CONFIGURED",
      requiredForFullProduction: true,
      requiredForMvp: true,
      detail: `Registration mode = ${registrationPolicy.mode}`,
    },
    {
      id: "DATABASE",
      label: "DATABASE",
      status: serverEnv.databaseUrl ? "CONFIGURED" : "NOT_CONFIGURED",
      requiredForFullProduction: true,
      requiredForMvp: true,
      detail: serverEnv.databaseUrl
        ? "DATABASE_URL is configured"
        : "DATABASE_URL is missing",
    },
    {
      id: "BLOB",
      label: "BLOB",
      status: serverEnv.blobReadWriteToken ? "CONFIGURED" : "NOT_CONFIGURED",
      requiredForFullProduction: true,
      requiredForMvp: true,
      detail: serverEnv.blobReadWriteToken
        ? "BLOB_READ_WRITE_TOKEN is configured"
        : "BLOB_READ_WRITE_TOKEN is missing",
    },
    encryptionStatus(),
    {
      id: "REGISTRATION_API",
      label: "REGISTRATION API",
      status: isRegistrationBackendConfigured()
        ? "CONFIGURED"
        : "NOT_CONFIGURED",
      requiredForFullProduction: true,
      requiredForMvp: true,
      detail: isRegistrationBackendConfigured()
        ? "Registration backend dependencies are present"
        : "Registration backend is incomplete",
    },
    {
      id: "DATA_SOURCE",
      label: "PRODUCTION DATA SOURCE",
      status: dataSource === "api" ? "CONFIGURED" : "NOT_CONFIGURED",
      requiredForFullProduction: true,
      requiredForMvp: true,
      detail:
        dataSource === "api"
          ? "NEXT_PUBLIC_DATA_SOURCE resolves to api"
          : "NEXT_PUBLIC_DATA_SOURCE must be api in production",
    },
    emailProviderStatus(),
    phoneProviderStatus(),
    adminAuthStatus(),
    migrationCheck,
    {
      id: "IDENTITY_MODE",
      label: "IDENTITY VERIFICATION MODE",
      status: "CONFIGURED",
      requiredForFullProduction: true,
      requiredForMvp: true,
      detail: "Manual review only (no automated NIN/passport/POSSAP)",
    },
    {
      id: "CAPACITY_POLICY",
      label: "CAPACITY POLICY",
      status: "PENDING_PRODUCT_DECISION",
      requiredForFullProduction: false,
      requiredForMvp: false,
      detail: "CAPACITY_POLICY_PENDING — 128 target not auto-enforced",
    },
    {
      id: "DATA_RETENTION",
      label: "DATA RETENTION",
      status: "PENDING_PRODUCT_DECISION",
      requiredForFullProduction: false,
      requiredForMvp: false,
      detail: "PENDING_PRODUCT_LEGAL_POLICY",
    },
  ];

  const mvpBlockers = checks
    .filter(
      (check) =>
        check.requiredForMvp &&
        check.status !== "CONFIGURED" &&
        check.status !== "DEFERRED",
    )
    .map((check) => `${check.label}: ${check.detail}`);

  const fullBlockers = checks
    .filter(
      (check) =>
        check.requiredForFullProduction && !isCheckSatisfied(check),
    )
    .map((check) => `${check.label}: ${check.detail}`);

  // DEFERRED providers satisfy MVP but not FULL_PRODUCTION.
  const fullProductionReady =
    fullBlockers.length === 0 &&
    emailProviderReady() &&
    phoneProviderReady() &&
    adminAuthReady() &&
    registrationPolicy.isFullProduction;

  const mvpReady = mvpBlockers.length === 0;

  let gate: LaunchGateState = "REGISTRATION_NOT_READY";
  if (fullProductionReady) {
    gate = "REGISTRATION_READY";
  } else if (mvpReady && registrationPolicy.isMvpManualReview) {
    gate = "MVP_REGISTRATION_READY";
  }

  return {
    gate,
    operatingMode: registrationPolicy.mode,
    identityVerificationMode: "manual",
    contactVerification: registrationPolicy.contactVerification,
    capacityPolicy: "CAPACITY_POLICY_PENDING",
    dataRetention: "PENDING_PRODUCT_LEGAL_POLICY",
    checks,
    blockers: gate === "REGISTRATION_READY" ? [] : mvpReady ? fullBlockers : mvpBlockers,
    applicationsReceivable: mvpReady,
    fullProductionVerificationOperational: fullProductionReady,
  };
}

export function getPublicHealthSnapshot() {
  return {
    databaseConfigured: Boolean(serverEnv.databaseUrl),
    blobConfigured: Boolean(serverEnv.blobReadWriteToken),
    registrationConfigured: isRegistrationBackendConfigured(),
    emailConfigured: emailProviderReady(),
    phoneConfigured: phoneProviderReady(),
    adminConfigured: adminAuthReady(),
    identityVerificationMode: "manual" as const,
    dataSource: getDataSource(),
    registrationMode: registrationPolicy.mode,
    contactVerification: registrationPolicy.contactVerification,
    launchGateHint:
      "Use authenticated GET /api/admin/system/readiness for authoritative gate (MVP_REGISTRATION_READY vs REGISTRATION_READY)",
  };
}
