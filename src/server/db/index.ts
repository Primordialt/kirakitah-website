import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import { serverEnv } from "@/server/env";

if (typeof WebSocket !== "undefined") {
  neonConfig.webSocketConstructor = WebSocket;
}

let dbInstance: ReturnType<typeof createDb> | null = null;
let testOverride: ReturnType<typeof createDb> | null = null;

function createDb() {
  const url = serverEnv.databaseUrl;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }

  // neon-http cannot run interactive transactions or row locks. Wallet credits,
  // withdrawal holds, and Arena entry debits depend on both.
  const pool = new Pool({ connectionString: url, max: 1 });
  return drizzle(pool, { schema });
}

/** Test-only. Production calls throw. The override is never read from the client. */
export function useDatabaseForTests(db: ReturnType<typeof createDb> | null) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Test database override is unavailable in production");
  }
  testOverride = db;
}

export function getDb() {
  if (testOverride) return testOverride;
  if (!dbInstance) {
    dbInstance = createDb();
  }
  return dbInstance;
}

export type Db = ReturnType<typeof getDb>;
