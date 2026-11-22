import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  arenaResponses,
  arenaRounds,
  arenaWinners,
  arenas,
  kkWalletLedger,
} from "@/server/db/schema";
import { milliToKkDisplay } from "@/server/wallet/money";

const HISTORY_LIMIT = 40;

export type ArenaHistoryItem = {
  id: string;
  at: string;
  arenaName: string;
  label: "Won" | "Entered";
  detail: string;
};

export type ArenaHistorySource = {
  id: string;
  receivedAt: string;
  arenaName: string;
  roundNumber: number;
  entryMilli: number | null;
  prizeMilli: number | null;
};

/** Public view of one player's own arena entry. Omits answers, accounts, and other players. */
export function toArenaHistoryItem(source: ArenaHistorySource): ArenaHistoryItem {
  const round = `Round #${source.roundNumber}`;
  if (source.prizeMilli !== null && source.prizeMilli > 0) {
    return {
      id: source.id,
      at: source.receivedAt,
      arenaName: source.arenaName,
      label: "Won",
      detail: `${round} · +${milliToKkDisplay(source.prizeMilli)} KK`,
    };
  }

  const entry =
    source.entryMilli !== null && source.entryMilli !== 0
      ? ` · Entry ${milliToKkDisplay(Math.abs(source.entryMilli))} KK`
      : "";
  return {
    id: source.id,
    at: source.receivedAt,
    arenaName: source.arenaName,
    label: "Entered",
    detail: `${round}${entry}`,
  };
}

export async function listParticipantArenaHistory(
  participantAccountId: string,
): Promise<ArenaHistoryItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: arenaResponses.id,
      receivedAt: arenaResponses.receivedAt,
      arenaName: arenas.name,
      roundNumber: arenaRounds.roundNumber,
      entryMilli: kkWalletLedger.amountMilli,
      prizeMilli: arenaWinners.prizeMilli,
    })
    .from(arenaResponses)
    .innerJoin(arenaRounds, eq(arenaResponses.roundId, arenaRounds.id))
    .innerJoin(arenas, eq(arenaRounds.arenaId, arenas.id))
    .innerJoin(kkWalletLedger, eq(arenaResponses.ledgerEntryId, kkWalletLedger.id))
    .leftJoin(arenaWinners, eq(arenaWinners.responseId, arenaResponses.id))
    .where(eq(arenaResponses.participantAccountId, participantAccountId))
    .orderBy(desc(arenaResponses.receivedAt))
    .limit(HISTORY_LIMIT);

  return rows.map((row) =>
    toArenaHistoryItem({
      id: row.id,
      receivedAt: row.receivedAt,
      arenaName: row.arenaName,
      roundNumber: row.roundNumber,
      entryMilli: row.entryMilli,
      prizeMilli: row.prizeMilli ?? null,
    }),
  );
}
