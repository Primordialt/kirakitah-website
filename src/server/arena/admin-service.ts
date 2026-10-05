import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { arenas } from "@/server/db/schema";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { ArenaError } from "@/server/arena/errors";
import { listAdminArenaDashboard } from "@/server/arena/engine";

export async function adminListArenas() {
  return listAdminArenaDashboard();
}

export async function adminUpdateArena(input: {
  slug: string;
  enabled?: boolean;
  paused?: boolean;
  entryFeeMilli?: number;
  prizeMilli?: number;
  minUniqueResponders?: number;
  minResponsesRequired?: number;
  roundDurationSeconds?: number;
  intermissionSeconds?: number;
  actorId: string;
  actorRole: AdminRole;
}) {
  const db = getDb();
  const [arena] = await db.select().from(arenas).where(eq(arenas.slug, input.slug)).limit(1);
  if (!arena) throw new ArenaError("Arena not found.", "NOT_FOUND", 404);

  const patch: Partial<typeof arenas.$inferInsert> = { updatedAt: new Date().toISOString() };
  if (typeof input.enabled === "boolean") patch.enabled = input.enabled;
  if (typeof input.paused === "boolean") patch.paused = input.paused;
  if (input.entryFeeMilli !== undefined) {
    if (input.entryFeeMilli < 100 || input.entryFeeMilli > 100_000) {
      throw new ArenaError("Entry fee out of allowed bounds.", "VALIDATION_ERROR", 400);
    }
    patch.entryFeeMilli = input.entryFeeMilli;
  }
  if (input.prizeMilli !== undefined) {
    if (input.prizeMilli < 1000 || input.prizeMilli > 1_000_000) {
      throw new ArenaError("Prize out of allowed bounds.", "VALIDATION_ERROR", 400);
    }
    patch.prizeMilli = input.prizeMilli;
  }
  const minResponses = input.minResponsesRequired ?? input.minUniqueResponders;
  if (minResponses !== undefined) {
    if (minResponses < 2 || minResponses > 100) {
      throw new ArenaError("Minimum responses out of bounds.", "VALIDATION_ERROR", 400);
    }
    patch.minUniqueResponders = minResponses;
  }
  if (input.roundDurationSeconds !== undefined) {
    patch.roundDurationSeconds = Math.min(120, Math.max(10, input.roundDurationSeconds));
  }
  if (input.intermissionSeconds !== undefined) {
    patch.intermissionSeconds = Math.min(60, Math.max(5, input.intermissionSeconds));
  }

  await db.update(arenas).set(patch).where(eq(arenas.id, arena.id));

  await recordAdminAuditEvent({
    eventType: "ARENA_CONFIG_CHANGED",
    actorId: input.actorId,
    actorRole: input.actorRole,
    metadata: {
      slug: input.slug,
      enabled: patch.enabled ?? arena.enabled,
      paused: patch.paused ?? arena.paused,
    },
  });
}
