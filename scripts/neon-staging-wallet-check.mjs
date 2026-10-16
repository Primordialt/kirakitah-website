#!/usr/bin/env node
/**
 * Integrity and WebSocket-driver check for a dedicated Neon staging branch.
 *
 * Never point this at Production. The script prints counts only.
 *
 *   KK_STAGING_DATABASE_CONFIRM=dedicated-neon-branch
 *   DATABASE_URL=<Neon branch direct connection string>
 *   node scripts/neon-staging-wallet-check.mjs
 *   node scripts/neon-staging-wallet-check.mjs --migrate
 */
import { spawnSync } from "node:child_process";
import pg from "pg";
import { Pool, neonConfig } from "@neondatabase/serverless";

const confirm = process.env.KK_STAGING_DATABASE_CONFIRM;
const databaseUrl = process.env.DATABASE_URL;

if (confirm !== "dedicated-neon-branch") {
  console.error("Refusing to run. Set KK_STAGING_DATABASE_CONFIRM=dedicated-neon-branch for a non-production Neon branch.");
  process.exit(1);
}
if (!databaseUrl) {
  console.error("DATABASE_URL is not set in this shell.");
  process.exit(1);
}
if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_TARGET_ENV === "production") {
  console.error("Refusing to run while VERCEL_ENV or VERCEL_TARGET_ENV is production.");
  process.exit(1);
}

let hostname = "";
try {
  hostname = new URL(databaseUrl).hostname;
} catch {
  console.error("DATABASE_URL could not be parsed.");
  process.exit(1);
}
if (!hostname.endsWith(".neon.tech")) {
  console.error("Refusing to run. The host is not a Neon host.");
  process.exit(1);
}

console.log(JSON.stringify({
  neonHost: true,
  pooler: hostname.includes("-pooler"),
  migrate: process.argv.includes("--migrate"),
}));

async function snapshot(client) {
  const wallets = await client.query(
    "SELECT COUNT(*)::text AS row_count, COALESCE(SUM(balance_milli), 0)::text AS balance_sum FROM kk_wallets",
  );
  const ledger = await client.query(`
    SELECT COUNT(*)::text AS row_count,
           COALESCE(SUM(amount_milli), 0)::text AS amount_sum,
           COUNT(*) FILTER (
             WHERE balance_after_milli - balance_before_milli <> amount_milli
           )::text AS broken_rows
    FROM kk_wallet_ledger
  `);
  const tournaments = await client.query("SELECT COUNT(*)::text AS row_count FROM tournaments");
  const arenaRounds = await client.query("SELECT COUNT(*)::text AS row_count FROM arena_rounds");
  const reservedColumn = await client.query(
    `SELECT COUNT(*)::text AS present
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'kk_wallets' AND column_name = 'reserved_milli'`,
  );
  let reserved = { sum: null, nonzero: null };
  if (reservedColumn.rows[0]?.present === "1") {
    const reservedRows = await client.query(
      "SELECT COALESCE(SUM(reserved_milli), 0)::text AS sum, COUNT(*) FILTER (WHERE reserved_milli <> 0)::text AS nonzero FROM kk_wallets",
    );
    reserved = { sum: reservedRows.rows[0].sum, nonzero: reservedRows.rows[0].nonzero };
  }
  const constraints = await client.query(
    `SELECT conname
     FROM pg_constraint
     WHERE conname IN ('kk_wallets_reserved_nonneg', 'kk_wallets_reserved_lte_balance')
     ORDER BY conname`,
  );
  const indexes = await client.query(
    `SELECT indexname
     FROM pg_indexes
     WHERE indexname IN (
       'kk_wallet_deposits_order_uidx',
       'kk_wallet_deposits_provider_payment_uidx',
       'kk_wallet_withdrawals_idempotency_uidx',
       'kk_wallet_withdrawals_provider_payout_uidx',
       'kk_payment_events_provider_key_uidx'
     )
     ORDER BY indexname`,
  );
  return {
    wallets: wallets.rows[0],
    ledger: ledger.rows[0],
    tournaments: tournaments.rows[0],
    arenaRounds: arenaRounds.rows[0],
    reserved,
    constraints: constraints.rows.map((row) => row.conname),
    indexes: indexes.rows.map((row) => row.indexname),
  };
}

function unchanged(before, after) {
  return (
    before.wallets.row_count === after.wallets.row_count &&
    before.wallets.balance_sum === after.wallets.balance_sum &&
    before.ledger.row_count === after.ledger.row_count &&
    before.ledger.amount_sum === after.ledger.amount_sum &&
    before.ledger.broken_rows === after.ledger.broken_rows &&
    before.tournaments.row_count === after.tournaments.row_count &&
    before.arenaRounds.row_count === after.arenaRounds.row_count &&
    after.reserved.sum === "0" &&
    after.reserved.nonzero === "0" &&
    after.constraints.length === 2 &&
    after.indexes.length === 5
  );
}

async function probeDriver() {
  if (typeof WebSocket !== "undefined") {
    neonConfig.webSocketConstructor = WebSocket;
  }
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("CREATE TEMP TABLE kk_driver_probe (id int) ON COMMIT PRESERVE ROWS");
    await client.query("INSERT INTO kk_driver_probe (id) VALUES (1)");
    await client.query("COMMIT");
    await client.query("BEGIN");
    await client.query("INSERT INTO kk_driver_probe (id) VALUES (2)");
    await client.query("ROLLBACK");
    const probe = await client.query("SELECT COUNT(*)::text AS n FROM kk_driver_probe");
    const before = await client.query("SELECT COALESCE(SUM(balance_milli), 0)::text AS balance_sum FROM kk_wallets");
    await client.query("BEGIN");
    await client.query("SELECT balance_milli FROM kk_wallets FOR UPDATE");
    await client.query("ROLLBACK");
    const after = await client.query("SELECT COALESCE(SUM(balance_milli), 0)::text AS balance_sum FROM kk_wallets");
    return {
      committedProbeRows: probe.rows[0]?.n ?? null,
      rollbackKeptCommittedRow: probe.rows[0]?.n === "1",
      walletBalanceUnchanged: before.rows[0]?.balance_sum === after.rows[0]?.balance_sum,
    };
  } finally {
    client.release();
    await pool.end();
  }
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  const before = await snapshot(client);
  console.log(JSON.stringify({ phase: "before", ...before }));
  if (process.argv.includes("--migrate")) {
    const migrated = spawnSync("npm", ["run", "db:migrate"], {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });
    if (migrated.status !== 0) process.exit(migrated.status ?? 1);
    const after = await snapshot(client);
    console.log(JSON.stringify({ phase: "after", ...after, unchanged: unchanged(before, after) }));
    if (!unchanged(before, after)) process.exit(1);
  }
  const driver = await probeDriver();
  console.log(JSON.stringify({ phase: "websocket-driver", ...driver }));
  if (!driver.rollbackKeptCommittedRow || !driver.walletBalanceUnchanged) process.exit(1);
} finally {
  await client.end();
}
