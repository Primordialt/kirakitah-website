/**
 * Admin roles and explicit permissions.
 * Authorization is always enforced server-side.
 */

import {
  ADMIN_ROLES,
  type AdminRole,
} from "@/lib/admin-roles";

export { ADMIN_ROLES, type AdminRole };

export const ADMIN_PERMISSIONS = [
  "dashboard:view",
  "applications:list",
  "applications:view",
  "applications:status",
  "identity:view_masked",
  "identity:reveal",
  "identity:review",
  "guardian:view",
  "photo:view",
  "audit:view",
  "admin:manage",
  "tournament:view",
  "tournament:eligibility",
  "tournament:participant_select",
  "tournament:participant_withdraw",
  "tournament:participant_disqualify",
  "tournament:phase_manage",
  "tournament:match_view",
  "tournament:match_manage",
  "tournament:result_record",
  "tournament:result_correct",
  "tournament:forfeit",
  "tournament:standings_view",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  SUPER_ADMIN: [
    "dashboard:view",
    "applications:list",
    "applications:view",
    "applications:status",
    "identity:view_masked",
    "identity:reveal",
    "identity:review",
    "guardian:view",
    "photo:view",
    "audit:view",
    "admin:manage",
    "tournament:view",
    "tournament:eligibility",
    "tournament:participant_select",
    "tournament:participant_withdraw",
    "tournament:participant_disqualify",
    "tournament:phase_manage",
    "tournament:match_view",
    "tournament:match_manage",
    "tournament:result_record",
    "tournament:result_correct",
    "tournament:forfeit",
    "tournament:standings_view",
  ],
  TOURNAMENT_ADMIN: [
    "dashboard:view",
    "applications:list",
    "applications:view",
    "applications:status",
    "identity:view_masked",
    "audit:view",
    "tournament:view",
    "tournament:eligibility",
    "tournament:participant_select",
    "tournament:participant_withdraw",
    "tournament:participant_disqualify",
    "tournament:phase_manage",
    "tournament:match_view",
    "tournament:match_manage",
    "tournament:result_record",
    "tournament:result_correct",
    "tournament:forfeit",
    "tournament:standings_view",
  ],
  REVIEWER: [
    "dashboard:view",
    "applications:list",
    "applications:view",
    "identity:view_masked",
    "identity:reveal",
    "identity:review",
    "guardian:view",
    "photo:view",
    "audit:view",
    "tournament:view",
    "tournament:eligibility",
    "tournament:match_view",
    "tournament:standings_view",
  ],
  SUPPORT: [
    "dashboard:view",
    "applications:list",
    "applications:view",
    "tournament:view",
    "tournament:standings_view",
  ],
};

export function permissionsForRole(role: AdminRole): readonly AdminPermission[] {
  return ROLE_PERMISSIONS[role];
}

export function roleHasPermission(
  role: AdminRole,
  permission: AdminPermission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function assertPermission(
  role: AdminRole,
  permission: AdminPermission,
): void {
  if (!roleHasPermission(role, permission)) {
    throw new AdminAuthorizationError(
      `Missing permission: ${permission}`,
    );
  }
}

export class AdminAuthorizationError extends Error {
  readonly status = 403;

  constructor(message = "Forbidden") {
    super(message);
    this.name = "AdminAuthorizationError";
  }
}

export class AdminAuthenticationError extends Error {
  readonly status = 401;

  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AdminAuthenticationError";
  }
}
