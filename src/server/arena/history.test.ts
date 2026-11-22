import { describe, expect, it } from "vitest";
import { toArenaHistoryItem } from "@/server/arena/history";

describe("arena history", () => {
  it("describes a win without the answer or other players", () => {
    const item = toArenaHistoryItem({
      id: "response-1",
      receivedAt: "2026-11-22T20:00:00.000Z",
      arenaName: "KIRAKITAH QUICKFIRE",
      roundNumber: 4,
      entryMilli: -500,
      prizeMilli: 3000,
    });

    expect(item).toEqual({
      id: "response-1",
      at: "2026-11-22T20:00:00.000Z",
      arenaName: "KIRAKITAH QUICKFIRE",
      label: "Won",
      detail: "Round #4 · +3 KK",
    });
    expect(JSON.stringify(item)).not.toMatch(/payload|email|username|answer/i);
  });

  it("describes an entry that did not win", () => {
    expect(
      toArenaHistoryItem({
        id: "response-2",
        receivedAt: "2026-11-22T19:00:00.000Z",
        arenaName: "Type Rush",
        roundNumber: 9,
        entryMilli: 500,
        prizeMilli: null,
      }),
    ).toEqual({
      id: "response-2",
      at: "2026-11-22T19:00:00.000Z",
      arenaName: "Type Rush",
      label: "Entered",
      detail: "Round #9 · Entry 0.5 KK",
    });
  });
});
