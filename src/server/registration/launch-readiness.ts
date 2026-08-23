import { sql } from "drizzle-orm";
import { getDataSource } from "@/config/data-source";
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
  | "PENDING_PRODUCT_DECISION";

export interface ReadinessCheck {
  id: string;
  label: string;
  status: CheckStatus;
  requiredForLaunch: boolean;
  detail: string;
}

export type LaunchGateState = "REGISTRATION_READY" | "REGISTRATION_NOT_READY";

export interface LaunchReadinessReport {
  gate: LaunchGateState;
  identityVerificationMode: "manual";
  capacityPolicy: "CAPACITY_POLICY_PENDING";
  dataRetention: "PENDING_PRODUCT_LEGAL_POLICY";
  checks: ReadinessCheck[];
  blockers: string[];
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
  const configured =
    serverEnv.emailVerificationProvider === "http" &&
    Boolean(serverEnv.emailVerificationApiUrl) &&
    Boolean(serverEnv.emailVerificationApiKey);

  if (serverEnv.emailVerificationProvider === "none") {
    return {
      id: "EMAIL_PROVIDER",
      label: "EMAIL PROVIDER",
      status: "PENDING_PRODUCT_DECISION",
      requiredForLaunch: true,
      detail:
        "EMAIL_VERIFICATION_PROVIDER=none — Product Owner must decide whether email verification is mandatory before launch",
    };
  }

  return {
    id: "EMAIL_PROVIDER",
    label: "EMAIL PROVIDER",
    status: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    requiredForLaunch: true,
    detail: configured
      ? "HTTP email verification env configured (delivery still requires real-world smoke test)"
      : "PRODUCTION EMAIL PROVIDER REQUIRED — EMAIL DELIVERY = BLOCKED",
  };
}

function phoneProviderStatus(): ReadinessCheck {
  const configured =
    serverEnv.phoneVerificationProvider === "http" &&
    Boolean(serverEnv.phoneVerificationApiUrl) &&
    Boolean(serverEnv.phoneVerificationApiKey);

  if (serverEnv.phoneVerificationProvider === "none") {
    return {
      id: "SMS_PROVIDER",
      label: "SMS PROVIDER",
      status: "PENDING_PRODUCT_DECISION",
      requiredForLaunch: true,
      detail:
        "PHONE_VERIFICATION_PROVIDER=none — Product Owner must decide whether phone verification is mandatory before launch",
    };
  }

  return {
    id: "SMS_PROVIDER",
    label: "SMS PROVIDER",
    status: configured ? "CONFIGURED" : "NOT_CONFIGURED",
    requiredForLaunch: true,
    detail: configured
      ? "HTTP phone verification env configured (delivery still requires real-world smoke test)"
      : "PRODUCTION SMS PROVIDER REQUIRED — SMS DELIVERY = BLOCKED",
  };
}

function adminAuthStatus(): ReadinessCheck {
  if (!HTTP_ADMIN_AUTH_IMPLEMENTED) {
    return {
      id: "ADMIN_AUTH",
      label: "ADMIN AUTH",
      status: "NOT_CONFIGURED",
      requiredForLaunch: true,
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
    requiredForLaunch: true,
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
      requiredForLaunch: true,
      detail: "REGISTRATION_PII_ENCRYPTION_KEY is missing",
    };
  }
  if (!isValidPiiEncryptionKey(value)) {
    return {
      id: "ENCRYPTION",
      label: "ENCRYPTION",
      status: "ERROR",
      requiredForLaunch: true,
      detail:
        "REGISTRATION_PII_ENCRYPTION_KEY must be 64 hex characters (32 bytes)",
    };
  }
  return {
    id: "ENCRYPTION",
    label: "ENCRYPTION",
    status: "CONFIGURED",
    requiredForLaunch: true,
    detail: "REGISTRATION_PII_ENCRYPTION_KEY format is valid",
  };
}

async function migrationVersionStatus(): Promise<ReadinessCheck> {
  if (!serverEnv.databaseUrl) {
    return {
      id: "MIGRATION_VERSION",
      label: "MIGRATION VERSION",
      status: "NOT_CONFIGURED",
      requiredForLaunch: true,
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
        requiredForLaunch: true,
        detail: "Expected schema present through 0010_phone_uniqueness",
      };
    }

    return {
      id: "MIGRATION_VERSION",
      label: "MIGRATION VERSION",
      status: "NOT_CONFIGURED",
      requiredForLaunch: true,
      detail: "Apply migrations through 0010_phone_uniqueness.sql",
    };
  } catch {
    return {
      id: "MIGRATION_VERSION",
      label: "MIGRATION VERSION",
      status: "ERROR",
      requiredForLaunch: true,
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

/**
 * Structured production launch readiness.
 * Does not expose secrets. Fail closed for missing mandatory providers.
 * Never reports REGISTRATION_READY while required checks are incomplete.
 */
export async function evaluateLaunchReadiness(): Promise<LaunchReadinessReport> {
  const dataSource = getDataSource();
  const migrationCheck = await migrationVersionStatus();

  const checks: ReadinessCheck[] = [
    {
      id: "DATABASE",
      label: "DATABASE",
      status: serverEnv.databaseUrl ? "CONFIGURED" : "NOT_CONFIGURED",
      requiredForLaunch: true,
      detail: serverEnv.databaseUrl
        ? "DATABASE_URL is configured"
        : "DATABASE_URL is missing",
    },
    {
      id: "BLOB",
      label: "BLOB",
      status: serverEnv.blobReadWriteToken ? "CONFIGURED" : "NOT_CONFIGURED",
      requiredForLaunch: true,
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
      requiredForLaunch: true,
      detail: isRegistrationBackendConfigured()
        ? "Registration backend dependencies are present"
        : "Registration backend is incomplete",
    },
    {
      id: "DATA_SOURCE",
      label: "PRODUCTION DATA SOURCE",
      status: dataSource === "api" ? "CONFIGURED" : "NOT_CONFIGURED",
      requiredForLaunch: true,
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
      requiredForLaunch: true,
      detail: "Manual review only (no automated NIN/passport/POSSAP)",
    },
    {
      id: "CAPACITY_POLICY",
      label: "CAPACITY POLICY",
      status: "PENDING_PRODUCT_DECISION",
      requiredForLaunch: false,
      detail: "CAPACITY_POLICY_PENDING — 128 target not auto-enforced",
    },
    {
      id: "DATA_RETENTION",
      label: "DATA RETENTION",
      status: "PENDING_PRODUCT_DECISION",
      requiredForLaunch: false,
      detail: "PENDING_PRODUCT_LEGAL_POLICY",
    },
  ];

  const blockers = checks
    .filter(
      (check) =>
        check.requiredForLaunch && check.status !== "CONFIGURED",
    )
    .map((check) => `${check.label}: ${check.detail}`);

  return {
    gate:
      blockers.length === 0 ? "REGISTRATION_READY" : "REGISTRATION_NOT_READY",
    identityVerificationMode: "manual",
    capacityPolicy: "CAPACITY_POLICY_PENDING",
    dataRetention: "PENDING_PRODUCT_LEGAL_POLICY",
    checks,
    blockers,
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
    launchGateHint: "Use authenticated GET /api/admin/system/readiness for authoritative gate",
  };
}
