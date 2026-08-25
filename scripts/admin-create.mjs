#!/usr/bin/env node
/**
 * Provision an admin user with a scrypt password hash.
 *
 * Usage (secure shell with DATABASE_URL set — never commit the URL):
 *   npm run admin:create -- --email admin@example.com --name "Ops Admin" --role SUPER_ADMIN
 *
 * Password is read from ADMIN_BOOTSTRAP_PASSWORD env or prompted via stdin.
 * Never logs the password or hash.
 */
import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
import pg from "pg";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const ROLES = ["SUPER_ADMIN", "TOURNAMENT_ADMIN", "REVIEWER", "SUPPORT"];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--email") out.email = argv[++i];
    else if (arg === "--name") out.name = argv[++i];
    else if (arg === "--role") out.role = argv[++i];
    else if (arg === "--help" || arg === "-h") out.help = true;
  }
  return out;
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return [
    "scrypt",
    "16384",
    "8",
    "1",
    salt.toString("base64url"),
    Buffer.from(derived).toString("base64url"),
  ].join("$");
}

function validatePassword(password) {
  if (password.length < 12) {
    return "Password must be at least 12 characters.";
  }
  const weak = new Set([
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
  if (weak.has(password.toLowerCase())) {
    return "Password is too common.";
  }
  return undefined;
}

async function readPassword() {
  if (process.env.ADMIN_BOOTSTRAP_PASSWORD) {
    return process.env.ADMIN_BOOTSTRAP_PASSWORD;
  }
  const rl = createInterface({ input, output });
  const password = await rl.question("Password (min 12 chars, input visible): ");
  rl.close();
  return password;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.email || !args.name || !args.role) {
    console.log(
      "Usage: npm run admin:create -- --email <email> --name <display name> --role <ROLE>",
    );
    console.log(`Roles: ${ROLES.join(", ")}`);
    process.exit(args.help ? 0 : 1);
  }

  if (!ROLES.includes(args.role)) {
    console.error(`Invalid role. Use one of: ${ROLES.join(", ")}`);
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const email = String(args.email).trim().toLowerCase();
  if (!email.includes("@")) {
    console.error("Invalid email.");
    process.exit(1);
  }

  const password = await readPassword();
  const passwordError = validatePassword(password);
  if (passwordError) {
    console.error(passwordError);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const existing = await client.query(
      `SELECT id FROM admin_users WHERE lower(email) = $1 LIMIT 1`,
      [email],
    );
    if (existing.rowCount > 0) {
      console.error("An admin with that email already exists.");
      process.exit(1);
    }

    const inserted = await client.query(
      `INSERT INTO admin_users (
         email, display_name, role, active, password_hash, password_updated_at, failed_login_attempts
       ) VALUES ($1, $2, $3, true, $4, now(), 0)
       RETURNING id, email, role`,
      [email, args.name, args.role, passwordHash],
    );

    const row = inserted.rows[0];
    console.log(
      JSON.stringify({
        success: true,
        id: row.id,
        email: row.email,
        role: row.role,
      }),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Provisioning failed.");
  process.exit(1);
});
