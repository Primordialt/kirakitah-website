import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { serverEnv } from "@/server/env";

let dbInstance: ReturnType<typeof createDb> | null = null;

function createDb() {
  const url = serverEnv.databaseUrl;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }

  const sql = neon(url);
  return drizzle(sql, { schema });
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = createDb();
  }
  return dbInstance;
}

export type Db = ReturnType<typeof getDb>;
