"use client";

import { Button } from "@/components/ui";
import { useEffect, useState } from "react";

type ArenaRow = {
  slug: string;
  name: string;
  enabled: boolean;
  paused: boolean;
  entryFeeKk: string;
  prizeKk: string;
  playersPresent: number;
  roundState: string | null;
};

export function AdminArenaPanel() {
  const [arenas, setArenas] = useState<ArenaRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch("/api/admin/arena", { credentials: "include" });
    const payload = (await response.json()) as { arenas?: ArenaRow[] };
    if (response.ok) setArenas(payload.arenas ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const patch = async (slug: string, body: object) => {
    const response = await fetch("/api/admin/arena", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, ...body }),
    });
    setStatus(response.ok ? "Arena updated." : "Update failed.");
    if (response.ok) void load();
  };

  return (
    <div className="space-y-4">
      {arenas.map((arena) => (
        <section
          key={arena.slug}
          className="rounded-xl border border-border bg-surface p-4"
        >
          <h2 className="text-h4">{arena.name}</h2>
          <p className="mt-1 text-body-sm text-text-muted">
            {arena.playersPresent} present · round {arena.roundState ?? "—"} · entry{" "}
            {arena.entryFeeKk} KK · prize {arena.prizeKk} KK
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant={arena.enabled ? "secondary" : "primary"}
              onClick={() => void patch(arena.slug, { enabled: !arena.enabled })}
            >
              {arena.enabled ? "Disable" : "Enable"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void patch(arena.slug, { paused: !arena.paused })}
            >
              {arena.paused ? "Resume" : "Pause"}
            </Button>
          </div>
        </section>
      ))}
      {status ? (
        <p className="text-body-sm text-text-secondary" role="status">
          {status}
        </p>
      ) : null}
      <p className="text-caption text-text-muted">
        Question/challenge CRUD and wallet review UIs can extend this panel. Arenas stay disabled in
        Production until compliance and payment integration are approved.
      </p>
    </div>
  );
}
