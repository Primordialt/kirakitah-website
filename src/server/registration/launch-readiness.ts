import { sql } from "drizzle-orm";
import { getDataSource } from "@/config/data-source";
import { getDb } from "@/server/db";
import {
  isRegistrationBackendConfigured,
  serverEnv,
} from "@/server/env";

export type CheckStatus = "PASS" | "FAIL" | "PENDING";

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
    serverEnv.adminAuthProvider === "http" &&
    Boolean(serverEnv.adminSessionSecret) &&
    Boolean(serverEnv.adminAuthApiUrl) &&
    Boolean(serverEnv.adminAuthApiKey)
  );
}

async function migrationVersionReady(): Promise<CheckStatus> {
  if (!serverEnv.databaseUrl) {
    return "FAIL";
  }

  try {
    const db = getDb();
    // Latest hardening migration introduces phone_normalized.
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
    return rows.length > 0 ? "PASS" : "FAIL";
  } catch {
    return "FAIL";
  }
}

/**
 * Structured production launch readiness.
 * Does not expose secrets. Fail closed for missing mandatory providers.
 */
export async function evaluateLaunchReadiness(): Promise<LaunchReadinessReport> {
  const dataSource = getDataSource();
  const migrationStatus = await migrationVersionReady();

  const checks: ReadinessCheck[] = [
    {
      id: "DATABASE",
      label: "DATABASE",
      status: serverEnv.databaseUrl ? "PASS" : "FAIL",
      requiredForLaunch: true,
      detail: serverEnv.databaseUrl
        ? "DATABASE_URL is configured"
        : "DATABASE_URL is missing",
    },
    {
      id: "BLOB",
      label: "BLOB",
      status: serverEnv.blobReadWriteToken ? "PASS" : "FAIL",
      requiredForLaunch: true,
      detail: serverEnv.blobReadWriteToken
        ? "BLOB_READ_WRITE_TOKEN is configured"
        : "BLOB_READ_WRITE_TOKEN is missing",
    },
    {
      id: "ENCRYPTION",
      label: "ENCRYPTION",
      status: serverEnv.registrationPiiEncryptionKey ? "PASS" : "FAIL",
      requiredForLaunch: true,
      detail: serverEnv.registrationPiiEncryptionKey
        ? "REGISTRATION_PII_ENCRYPTION_KEY is configured"
        : "REGISTRATION_PII_ENCRYPTION_KEY is missing",
    },
    {
      id: "REGISTRATION_API",
      label: "REGISTRATION API",
      status: isRegistrationBackendConfigured() ? "PASS" : "FAIL",
      requiredForLaunch: true,
      detail: isRegistrationBackendConfigured()
        ? "Registration backend dependencies are present"
        : "Registration backend is incomplete",
    },
    {
      id: "DATA_SOURCE",
      label: "PRODUCTION DATA SOURCE",
      status: dataSource === "api" ? "PASS" : "FAIL",
      requiredForLaunch: true,
      detail:
        dataSource === "api"
          ? "NEXT_PUBLIC_DATA_SOURCE=api (or production force)"
          : "NEXT_PUBLIC_DATA_SOURCE must be api in production",
    },
    {
      id: "EMAIL_PROVIDER",
      label: "EMAIL PROVIDER",
      status: emailProviderReady() ? "PASS" : "FAIL",
      requiredForLaunch: true,
      detail: emailProviderReady()
        ? "HTTP email verification provider configured"
        : "PRODUCTION EMAIL PROVIDER REQUIRED",
    },
    {
      id: "SMS_PROVIDER",
      label: "SMS PROVIDER",
      status: phoneProviderReady() ? "PASS" : "FAIL",
      requiredForLaunch: true,
      detail: phoneProviderReady()
        ? "HTTP phone verification provider configured"
        : "PRODUCTION SMS PROVIDER REQUIRED",
    },
    {
      id: "ADMIN_AUTH",
      label: "ADMIN AUTH",
      status: adminAuthReady() ? "PASS" : "FAIL",
      requiredForLaunch: true,
      detail: adminAuthReady()
        ? "HTTP admin auth provider configured"
        : "PRODUCTION ADMIN AUTH PROVIDER REQUIRED",
    },
    {
      id: "MIGRATION_VERSION",
      label: "MIGRATION VERSION",
      status: migrationStatus,
      requiredForLaunch: true,
      detail:
        migrationStatus === "PASS"
          ? "Expected registration schema columns present"
          : "Apply migrations through 0010_phone_uniqueness.sql",
    },
    {
      id: "IDENTITY_MODE",
      label: "IDENTITY VERIFICATION MODE",
      status: "PASS",
      requiredForLaunch: true,
      detail: "Manual review only (no automated NIN/passport/POSSAP)",
    },
    {
      id: "CAPACITY_POLICY",
      label: "CAPACITY POLICY",
      status: "PENDING",
      requiredForLaunch: false,
      detail: "CAPACITY_POLICY_PENDING — 128 target not auto-enforced",
    },
  ];

  const blockers = checks
    .filter((check) => check.requiredForLaunch && check.status !== "PASS")
    .map((check) => `${check.label}: ${check.detail}`);

  return {
    gate: blockers.length === 0 ? "REGISTRATION_READY" : "REGISTRATION_NOT_READY",
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
    emailVerificationConfigured: emailProviderReady(),
    phoneVerificationConfigured: phoneProviderReady(),
    identityVerificationMode: "manual" as const,
    adminAuthConfigured: adminAuthReady(),
    dataSource: getDataSource(),
    launchGate:
      // Lightweight sync approximation — full gate needs DB for migrations.
      isRegistrationBackendConfigured() &&
      getDataSource() === "api" &&
      emailProviderReady() &&
      phoneProviderReady() &&
      adminAuthReady()
        ? ("REGISTRATION_READY_PENDING_MIGRATION_CHECK" as const)
        : ("REGISTRATION_NOT_READY" as const),
  };
}
