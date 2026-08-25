import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { ADMIN_ROLES, type AdminRole } from "@/lib/admin-roles";
import { getDb } from "@/server/db";
import { adminUsers } from "@/server/db/schema";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import {
  hashAdminPassword,
  validateAdminPassword,
} from "@/server/admin/auth/password";

export class AdminUserManagementError extends Error {
  readonly status: number;
  readonly code: "VALIDATION_ERROR" | "CONFLICT" | "NOT_FOUND" | "FORBIDDEN";

  constructor(
    message: string,
    code: AdminUserManagementError["code"] = "VALIDATION_ERROR",
    status = 400,
  ) {
    super(message);
    this.name = "AdminUserManagementError";
    this.code = code;
    this.status = status;
  }
}

/** Safe admin projection — never includes password hash or secrets. */
export interface AdminUserRecord {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
  lastLoginAt: string | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function isAdminRole(value: string): value is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(value);
}

function toRecord(row: {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
  updatedAt?: string | null;
  lastLoginAt: string | null;
}): AdminUserRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? null,
    lastLoginAt: row.lastLoginAt,
  };
}

async function countActiveSuperAdmins(excludeId?: string): Promise<number> {
  const db = getDb();
  const conditions = [
    eq(adminUsers.role, "SUPER_ADMIN"),
    eq(adminUsers.active, true),
  ];
  if (excludeId) {
    conditions.push(sql`${adminUsers.id} <> ${excludeId}`);
  }
  const [row] = await db
    .select({ value: count() })
    .from(adminUsers)
    .where(and(...conditions));
  return Number(row?.value ?? 0);
}

export async function listAdminUsers(input: {
  query?: string;
  role?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{
  items: AdminUserRecord[];
  page: number;
  pageSize: number;
  total: number;
}> {
  const db = getDb();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  const filters = [];
  if (input.role && isAdminRole(input.role)) {
    filters.push(eq(adminUsers.role, input.role));
  }
  if (typeof input.active === "boolean") {
    filters.push(eq(adminUsers.active, input.active));
  }
  const q = input.query?.trim();
  if (q) {
    const pattern = `%${q}%`;
    filters.push(
      or(
        ilike(adminUsers.email, pattern),
        ilike(adminUsers.displayName, pattern),
      )!,
    );
  }

  const where = filters.length > 0 ? and(...filters) : undefined;

  const [totalRow] = await db
    .select({ value: count() })
    .from(adminUsers)
    .where(where);

  const rows = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      displayName: adminUsers.displayName,
      role: adminUsers.role,
      active: adminUsers.active,
      createdAt: adminUsers.createdAt,
      updatedAt: adminUsers.updatedAt,
      lastLoginAt: adminUsers.lastLoginAt,
    })
    .from(adminUsers)
    .where(where)
    .orderBy(desc(adminUsers.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    items: rows.map(toRecord),
    page,
    pageSize,
    total: Number(totalRow?.value ?? 0),
  };
}

export async function getAdminUserById(
  id: string,
): Promise<AdminUserRecord | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      displayName: adminUsers.displayName,
      role: adminUsers.role,
      active: adminUsers.active,
      createdAt: adminUsers.createdAt,
      updatedAt: adminUsers.updatedAt,
      lastLoginAt: adminUsers.lastLoginAt,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  return row ? toRecord(row) : null;
}

/** Live session check — returns false when the account is missing or inactive. */
export async function isAdminUserActive(id: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ active: adminUsers.active })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);
  return Boolean(row?.active);
}

export async function createAdminUser(input: {
  actorId: string;
  actorRole: AdminRole;
  displayName: string;
  email: string;
  role: string;
  password: string;
  requestId?: string;
}): Promise<AdminUserRecord> {
  const displayName = normalizeDisplayName(input.displayName);
  const email = normalizeEmail(input.email);

  if (displayName.length < 2) {
    throw new AdminUserManagementError("Full name is required.");
  }
  if (!email.includes("@") || email.length < 5) {
    throw new AdminUserManagementError("A valid email is required.");
  }
  if (!isAdminRole(input.role)) {
    throw new AdminUserManagementError("Invalid administrator role.");
  }

  const passwordError = validateAdminPassword(input.password);
  if (passwordError) {
    throw new AdminUserManagementError(passwordError);
  }

  const passwordHash = await hashAdminPassword(input.password);
  const db = getDb();

  try {
    const [row] = await db
      .insert(adminUsers)
      .values({
        email,
        displayName,
        role: input.role,
        active: true,
        passwordHash,
        passwordUpdatedAt: new Date().toISOString(),
        failedLoginAttempts: 0,
        updatedAt: new Date().toISOString(),
      })
      .returning({
        id: adminUsers.id,
        email: adminUsers.email,
        displayName: adminUsers.displayName,
        role: adminUsers.role,
        active: adminUsers.active,
        createdAt: adminUsers.createdAt,
        updatedAt: adminUsers.updatedAt,
        lastLoginAt: adminUsers.lastLoginAt,
      });

    await recordAdminAuditEvent({
      eventType: "ADMIN_CREATED",
      actorId: input.actorId,
      actorRole: input.actorRole,
      requestId: input.requestId,
      metadata: {
        targetAdminId: row.id,
        role: row.role,
      },
    });

    return toRecord(row);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("unique") ||
      message.includes("duplicate") ||
      message.includes("admin_users_email")
    ) {
      throw new AdminUserManagementError(
        "An administrator with this email already exists.",
        "CONFLICT",
        409,
      );
    }
    throw error;
  }
}

export async function updateAdminUserRole(input: {
  actorId: string;
  actorRole: AdminRole;
  targetId: string;
  role: string;
  requestId?: string;
}): Promise<AdminUserRecord> {
  if (!isAdminRole(input.role)) {
    throw new AdminUserManagementError("Invalid administrator role.");
  }

  const existing = await getAdminUserById(input.targetId);
  if (!existing) {
    throw new AdminUserManagementError(
      "Administrator not found.",
      "NOT_FOUND",
      404,
    );
  }

  if (existing.role === input.role) {
    return existing;
  }

  if (
    existing.role === "SUPER_ADMIN" &&
    existing.active &&
    input.role !== "SUPER_ADMIN"
  ) {
    const remaining = await countActiveSuperAdmins(existing.id);
    if (remaining < 1) {
      throw new AdminUserManagementError(
        "Cannot downgrade the last active SUPER_ADMIN.",
        "CONFLICT",
        409,
      );
    }
  }

  const db = getDb();
  const [row] = await db
    .update(adminUsers)
    .set({
      role: input.role,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(adminUsers.id, input.targetId))
    .returning({
      id: adminUsers.id,
      email: adminUsers.email,
      displayName: adminUsers.displayName,
      role: adminUsers.role,
      active: adminUsers.active,
      createdAt: adminUsers.createdAt,
      updatedAt: adminUsers.updatedAt,
      lastLoginAt: adminUsers.lastLoginAt,
    });

  await recordAdminAuditEvent({
    eventType: "ADMIN_ROLE_CHANGED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      targetAdminId: row.id,
      previousRole: existing.role,
      newRole: row.role,
    },
  });

  return toRecord(row);
}

export async function setAdminUserActive(input: {
  actorId: string;
  actorRole: AdminRole;
  targetId: string;
  active: boolean;
  requestId?: string;
}): Promise<AdminUserRecord> {
  const existing = await getAdminUserById(input.targetId);
  if (!existing) {
    throw new AdminUserManagementError(
      "Administrator not found.",
      "NOT_FOUND",
      404,
    );
  }

  if (existing.active === input.active) {
    return existing;
  }

  if (
    !input.active &&
    existing.role === "SUPER_ADMIN" &&
    existing.active
  ) {
    const remaining = await countActiveSuperAdmins(existing.id);
    if (remaining < 1) {
      throw new AdminUserManagementError(
        "Cannot deactivate the last active SUPER_ADMIN.",
        "CONFLICT",
        409,
      );
    }
  }

  const db = getDb();
  const [row] = await db
    .update(adminUsers)
    .set({
      active: input.active,
      updatedAt: new Date().toISOString(),
      ...(input.active
        ? {}
        : {
            failedLoginAttempts: 0,
            lockedUntil: null,
          }),
    })
    .where(eq(adminUsers.id, input.targetId))
    .returning({
      id: adminUsers.id,
      email: adminUsers.email,
      displayName: adminUsers.displayName,
      role: adminUsers.role,
      active: adminUsers.active,
      createdAt: adminUsers.createdAt,
      updatedAt: adminUsers.updatedAt,
      lastLoginAt: adminUsers.lastLoginAt,
    });

  await recordAdminAuditEvent({
    eventType: input.active ? "ADMIN_ACTIVATED" : "ADMIN_DEACTIVATED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    requestId: input.requestId,
    metadata: {
      targetAdminId: row.id,
      role: row.role,
    },
  });

  return toRecord(row);
}
