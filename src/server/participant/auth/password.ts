import {
  hashAdminPassword,
  validateAdminPassword,
  verifyAdminPassword,
  MIN_ADMIN_PASSWORD_LENGTH,
} from "@/server/admin/auth/password";

export const MIN_PARTICIPANT_PASSWORD_LENGTH = MIN_ADMIN_PASSWORD_LENGTH;

export function validateParticipantPassword(password: string): string | undefined {
  return validateAdminPassword(password);
}

/**
 * Hash format: scrypt$N$r$p$salt$derived (same as admin).
 */
export async function hashParticipantPassword(password: string): Promise<string> {
  return hashAdminPassword(password);
}

export async function verifyParticipantPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  return verifyAdminPassword(password, storedHash);
}
