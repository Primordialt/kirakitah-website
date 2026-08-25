import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit CLI configuration (generate / migrate).
 *
 * Runtime application queries use `@neondatabase/serverless` + `drizzle-orm/neon-http`
 * in `src/server/db/index.ts` and are unchanged by this file.
 *
 * Migrations use the `pg` (node-postgres) driver when `pg` is installed.
 * That avoids the Neon serverless WebSocket path that `drizzle-kit migrate`
 * otherwise selects because `@neondatabase/serverless` is a runtime dependency.
 *
 * For `npm run db:migrate`, set `DATABASE_URL` in the shell (prefer Neon direct /
 * non-pooler). Do not commit the value.
 */
export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
