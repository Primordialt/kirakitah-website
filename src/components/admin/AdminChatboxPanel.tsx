"use client";

import { Button } from "@/components/ui";
import { useState } from "react";

async function adminPost(path: string, body: object) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { error?: { message?: string } };
  return { ok: response.ok, message: payload.error?.message };
}

export function AdminChatboxPanel() {
  const [announcement, setAnnouncement] = useState("");
  const [restrictUsername, setRestrictUsername] = useState("");
  const [pinMessageId, setPinMessageId] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-h4 text-text-primary">Lock controls</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              const result = await adminPost("/api/admin/chatbox/lock", { locked: true });
              setStatus(result.ok ? "Chat locked." : result.message ?? "Failed.");
            }}
          >
            Lock chat
          </Button>
          <Button
            onClick={async () => {
              const result = await adminPost("/api/admin/chatbox/lock", { locked: false });
              setStatus(result.ok ? "Chat unlocked." : result.message ?? "Failed.");
            }}
          >
            Unlock chat
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-h4 text-text-primary">Post announcement</h2>
        <textarea
          className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm"
          rows={4}
          value={announcement}
          onChange={(event) => setAnnouncement(event.target.value)}
          placeholder="Announcement for all participants…"
        />
        <Button
          className="mt-3"
          onClick={async () => {
            const result = await adminPost("/api/admin/chatbox/announcement", {
              content: announcement,
            });
            setStatus(result.ok ? "Announcement posted." : result.message ?? "Failed.");
          }}
        >
          Post announcement
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-h4 text-text-primary">Pin message</h2>
        <input
          className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm"
          value={pinMessageId}
          onChange={(event) => setPinMessageId(event.target.value)}
          placeholder="Message ID"
        />
        <div className="mt-3 flex gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              const result = await adminPost("/api/admin/chatbox/pin", {
                messageId: pinMessageId || null,
              });
              setStatus(result.ok ? "Pin updated." : result.message ?? "Failed.");
            }}
          >
            Pin message
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              const result = await adminPost("/api/admin/chatbox/pin", { messageId: null });
              setStatus(result.ok ? "Pin cleared." : result.message ?? "Failed.");
            }}
          >
            Unpin
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-h4 text-text-primary">Restrict member</h2>
        <input
          className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-body-sm"
          value={restrictUsername}
          onChange={(event) => setRestrictUsername(event.target.value)}
          placeholder="Participant username"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {(["muted", "restricted", "active"] as const).map((memberStatus) => (
            <Button
              key={memberStatus}
              variant={memberStatus === "active" ? "primary" : "secondary"}
              onClick={async () => {
                const result = await adminPost("/api/admin/chatbox/members/restrict", {
                  username: restrictUsername,
                  status: memberStatus,
                });
                setStatus(
                  result.ok
                    ? `Member set to ${memberStatus}.`
                    : result.message ?? "Failed.",
                );
              }}
            >
              {memberStatus}
            </Button>
          ))}
        </div>
      </section>

      {status ? (
        <p className="text-body-sm text-text-secondary" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
