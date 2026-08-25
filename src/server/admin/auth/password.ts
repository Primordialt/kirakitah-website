import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";

/** scrypt parameters — Node-compatible, no native argon2 dependency. */
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

const WEAK_PASSWORDS = new Set([
  "password",
  "password123",
  "password1234",
  "admin",
  "admin123",
  "admin123456",
  "kirakitah",
  "kirakitah123",
  "letmein",
  "welcome",
  "qwerty123456",
  "123456789012",
]);

export const MIN_ADMIN_PASSWORD_LENGTH = 12;

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey as Buffer);
    });
  });
}

export function validateAdminPassword(password: string): string | undefined {
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`;
  }
  if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    return "Password is too common. Choose a stronger password.";
  }
  return undefined;
}

/**
 * Hash format: scrypt$N$r$p$salt$derived (base64url salt/key).
 */
export async function hashAdminPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scryptAsync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return [
    "scrypt",
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyAdminPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4]!, "base64url");
  const expected = Buffer.from(parts[5]!, "base64url");

  if (
    !Number.isFinite(N) ||
    !Number.isFinite(r) ||
    !Number.isFinite(p) ||
    salt.length === 0 ||
    expected.length === 0
  ) {
    return false;
  }

  const derived = await scryptAsync(password, salt, expected.length, {
    N,
    r,
    p,
  });

  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}
