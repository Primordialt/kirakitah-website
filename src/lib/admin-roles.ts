export const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "TOURNAMENT_ADMIN",
  "REVIEWER",
  "SUPPORT",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
