export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: import("@/server/admin/authorization/permissions").AdminRole;
  active: boolean;
}

export interface AdminSession {
  user: AdminUser;
  issuedAt: string;
  expiresAt: string;
}

export interface AdminLoginCredentials {
  email: string;
  password?: string;
  /** Optional client IP for DB-backed login rate limiting. */
  clientIp?: string | null;
  /** Development mock only — never used as production password auth. */
  role?: import("@/server/admin/authorization/permissions").AdminRole;
}

export interface AdminAuthProvider {
  readonly providerId: string;
  /**
   * Authenticates an admin and returns a session user.
   * Must fail closed when not configured for the current environment.
   */
  authenticate(credentials: AdminLoginCredentials): Promise<AdminUser>;
}
