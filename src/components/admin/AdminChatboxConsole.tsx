"use client";

import { Button } from "@/components/ui";
import { useCallback, useEffect, useRef, useState } from "react";

type ChatMessageView = {
  id: string;
  messageType: "user" | "announcement" | "system";
  content: string;
  createdAt: string;
  editedAt: string | null;
  isDeleted: boolean;
  senderLabel: string;
  senderKind: "participant" | "admin" | "system";
  replyTo: {
    id: string;
    senderLabel: string;
    contentPreview: string;
  } | null;
  mentions: string[];
};

type ChatRoomStateView = {
  slug: string;
  name: string;
  memberCount: number;
  isLocked: boolean;
  pinnedMessage: ChatMessageView | null;
};

export type AdminChatboxPermissions = {
  canLock: boolean;
  canAnnounce: boolean;
  canModerate: boolean;
};

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

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

async function adminDelete(messageId: string) {
  const response = await fetch(`/api/admin/chatbox/messages/${messageId}`, {
    method: "DELETE",
    credentials: "include",
  });
  const payload = (await response.json()) as { error?: { message?: string } };
  return { ok: response.ok, message: payload.error?.message };
}

export function AdminChatboxConsole({
  permissions,
}: {
  permissions: AdminChatboxPermissions;
}) {
  const [room, setRoom] = useState<ChatRoomStateView | null>(null);
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [restrictUsername, setRestrictUsername] = useState("");
  const [filters, setFilters] = useState({
    q: "",
    type: "" as "" | "user" | "announcement" | "system",
    mentions: false,
    pinned: false,
    username: "",
  });
  const listRef = useRef<HTMLDivElement>(null);

  const buildQuery = useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      if (filters.q.trim()) params.set("q", filters.q.trim());
      if (filters.type) params.set("type", filters.type);
      if (filters.mentions) params.set("mentions", "1");
      if (filters.pinned) params.set("pinned", "1");
      if (filters.username.trim()) params.set("username", filters.username.trim());
      const query = params.toString();
      return query ? `/api/admin/chatbox?${query}` : "/api/admin/chatbox";
    },
    [filters],
  );

  const loadChat = useCallback(
    async (opts?: { silent?: boolean; cursor?: string | null; prepend?: boolean }) => {
      if (!opts?.silent && !opts?.prepend) setLoading(true);
      const url = buildQuery(opts?.cursor ?? null);
      const response = await fetch(url, { credentials: "include" });
      const payload = (await response.json()) as {
        room?: ChatRoomStateView;
        messages?: ChatMessageView[];
        nextCursor?: string | null;
        error?: { message?: string };
      };

      if (!opts?.silent && !opts?.prepend) setLoading(false);

      if (!response.ok || !payload.room) {
        setStatus(payload.error?.message ?? "Unable to load community chat.");
        return;
      }

      setRoom(payload.room);
      if (opts?.prepend) {
        setMessages((current) => [...(payload.messages ?? []), ...current]);
      } else {
        setMessages(payload.messages ?? []);
      }
      setNextCursor(payload.nextCursor ?? null);
    },
    [buildQuery],
  );

  useEffect(() => {
    void loadChat();
    const interval = window.setInterval(() => {
      void loadChat({ silent: true });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [loadChat]);

  const loadOlder = async () => {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    await loadChat({ silent: true, cursor: nextCursor, prepend: true });
    setLoadingOlder(false);
  };

  const pinMessage = async (messageId: string | null) => {
    const result = await adminPost("/api/admin/chatbox/pin", { messageId });
    setStatus(result.ok ? (messageId ? "Message pinned." : "Pin cleared.") : result.message ?? "Failed.");
    if (result.ok) void loadChat({ silent: true });
  };

  const deleteMessage = async (messageId: string) => {
    if (!window.confirm("Soft-delete this message for participants?")) return;
    const result = await adminDelete(messageId);
    setStatus(result.ok ? "Message deleted." : result.message ?? "Failed.");
    if (result.ok) void loadChat({ silent: true });
  };

  if (loading && !room) {
    return (
      <p className="text-body-sm text-text-muted" role="status">
        Loading community transcript…
      </p>
    );
  }

  if (!room) {
    return (
      <p className="text-body-sm text-error" role="alert">
        {status ?? "Chat unavailable."}
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
      <section
        aria-label="Community chat transcript"
        className="flex min-h-[70vh] min-w-0 flex-col rounded-xl border border-border bg-surface"
      >
        <header className="border-b border-border px-4 py-4 sm:px-6">
          <p className="text-caption font-semibold uppercase tracking-wide text-brand-primary">
            Live transcript
          </p>
          <h2 className="text-h3 text-text-primary">{room.name}</h2>
          <p className="mt-1 text-body-sm text-text-muted">
            {room.memberCount} member{room.memberCount === 1 ? "" : "s"}
            {room.isLocked ? " · Room locked" : ""}
          </p>
          {room.isLocked ? (
            <p
              className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-body-sm"
              role="status"
            >
              Locked — participants cannot send messages until unlocked.
            </p>
          ) : null}
          {room.pinnedMessage ? (
            <div className="mt-3 rounded-lg border border-brand-primary/30 bg-brand-primary/5 px-3 py-2">
              <p className="text-caption font-semibold text-brand-primary">Pinned</p>
              <p className="mt-1 break-words text-body-sm">{room.pinnedMessage.content}</p>
            </div>
          ) : null}
        </header>

        <form
          className="grid gap-2 border-b border-border px-4 py-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            void loadChat();
          }}
        >
          <label className="text-caption text-text-muted sm:col-span-2">
            Search messages
            <input
              value={filters.q}
              onChange={(event) => setFilters((f) => ({ ...f, q: event.target.value }))}
              className="mt-1 h-10 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-body-sm"
            />
          </label>
          <label className="text-caption text-text-muted">
            Type
            <select
              value={filters.type}
              onChange={(event) =>
                setFilters((f) => ({
                  ...f,
                  type: event.target.value as typeof filters.type,
                }))
              }
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-body-sm"
            >
              <option value="">All</option>
              <option value="user">User</option>
              <option value="announcement">Announcement</option>
              <option value="system">System</option>
            </select>
          </label>
          <label className="text-caption text-text-muted">
            Username
            <input
              value={filters.username}
              onChange={(event) =>
                setFilters((f) => ({ ...f, username: event.target.value }))
              }
              placeholder="@participant"
              className="mt-1 h-10 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-body-sm"
            />
          </label>
          <div className="flex flex-wrap items-end gap-3 sm:col-span-2 lg:col-span-4">
            <label className="inline-flex min-h-10 items-center gap-2 text-body-sm">
              <input
                type="checkbox"
                checked={filters.mentions}
                onChange={(event) =>
                  setFilters((f) => ({ ...f, mentions: event.target.checked }))
                }
              />
              Mentions only
            </label>
            <label className="inline-flex min-h-10 items-center gap-2 text-body-sm">
              <input
                type="checkbox"
                checked={filters.pinned}
                onChange={(event) =>
                  setFilters((f) => ({ ...f, pinned: event.target.checked }))
                }
              />
              Pinned only
            </label>
            <Button type="submit" variant="secondary" size="sm">
              Apply filters
            </Button>
          </div>
        </form>

        <div
          ref={listRef}
          className="min-w-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6"
          aria-live="polite"
        >
          {nextCursor ? (
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => void loadOlder()} loading={loadingOlder}>
                Load older
              </Button>
            </div>
          ) : null}

          {messages.length === 0 ? (
            <p className="text-body-sm text-text-muted">No messages match these filters.</p>
          ) : null}

          {messages.map((message) => (
            <article
              key={message.id}
              id={`admin-message-${message.id}`}
              className={`min-w-0 rounded-lg border px-3 py-2 ${
                message.isDeleted
                  ? "border-dashed border-border bg-surface-muted opacity-80"
                  : message.messageType === "announcement"
                    ? "border-brand-primary/40 bg-brand-primary/5"
                    : "border-border bg-surface-elevated"
              }`}
            >
              {message.isDeleted ? (
                <p className="text-caption font-semibold text-text-muted">Deleted message</p>
              ) : null}
              {message.messageType === "announcement" ? (
                <p className="text-caption font-semibold text-brand-primary">Announcement</p>
              ) : null}
              {message.replyTo ? (
                <p className="mb-1 break-words border-l-2 border-border pl-2 text-caption text-text-muted">
                  Reply to {message.replyTo.senderLabel}: {message.replyTo.contentPreview}
                </p>
              ) : null}
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-body-sm text-text-primary">
                  {message.senderLabel}
                </p>
                <time className="text-caption text-text-muted" dateTime={message.createdAt}>
                  {formatTime(message.createdAt)}
                </time>
              </div>
              <p className="mt-1 break-words whitespace-pre-wrap text-body-sm text-text-secondary">
                {message.content}
              </p>
              {message.mentions.length > 0 ? (
                <p className="mt-1 text-caption text-text-muted">
                  Mentions: {message.mentions.join(", ")}
                </p>
              ) : null}
              {permissions.canModerate && !message.isDeleted ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="min-h-9 rounded px-2 text-caption font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    onClick={() => void pinMessage(message.id)}
                  >
                    Pin
                  </button>
                  <button
                    type="button"
                    className="min-h-9 rounded px-2 text-caption font-medium text-error underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    onClick={() => void deleteMessage(message.id)}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <aside className="min-w-0 space-y-4" aria-label="Chat moderation controls">
        {permissions.canLock ? (
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-h4 text-text-primary">Lock controls</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  const result = await adminPost("/api/admin/chatbox/lock", { locked: true });
                  setStatus(result.ok ? "Chat locked." : result.message ?? "Failed.");
                  if (result.ok) void loadChat({ silent: true });
                }}
              >
                Lock chat
              </Button>
              <Button
                onClick={async () => {
                  const result = await adminPost("/api/admin/chatbox/lock", { locked: false });
                  setStatus(result.ok ? "Chat unlocked." : result.message ?? "Failed.");
                  if (result.ok) void loadChat({ silent: true });
                }}
              >
                Unlock chat
              </Button>
            </div>
          </section>
        ) : null}

        {permissions.canAnnounce ? (
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-h4 text-text-primary">Post announcement</h2>
            <textarea
              className="mt-3 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-body-sm"
              rows={4}
              value={announcement}
              onChange={(event) => setAnnouncement(event.target.value)}
              placeholder="Announcement for all participants…"
              aria-label="Announcement content"
            />
            <Button
              className="mt-3"
              onClick={async () => {
                const result = await adminPost("/api/admin/chatbox/announcement", {
                  content: announcement,
                });
                setStatus(result.ok ? "Announcement posted." : result.message ?? "Failed.");
                if (result.ok) {
                  setAnnouncement("");
                  void loadChat({ silent: true });
                }
              }}
            >
              Post announcement
            </Button>
          </section>
        ) : null}

        {permissions.canModerate ? (
          <>
            {room.pinnedMessage ? (
              <section className="rounded-xl border border-border bg-surface p-4">
                <h2 className="text-h4 text-text-primary">Pinned message</h2>
                <p className="mt-2 break-words text-body-sm text-text-secondary">
                  {room.pinnedMessage.content}
                </p>
                <Button
                  className="mt-3"
                  variant="ghost"
                  onClick={() => void pinMessage(null)}
                >
                  Unpin
                </Button>
              </section>
            ) : null}

            <section className="rounded-xl border border-border bg-surface p-4">
              <h2 className="text-h4 text-text-primary">Restrict member</h2>
              <input
                className="mt-3 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-body-sm"
                value={restrictUsername}
                onChange={(event) => setRestrictUsername(event.target.value)}
                placeholder="Participant username"
                aria-label="Username to restrict"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {(["muted", "restricted", "active"] as const).map((memberStatus) => (
                  <Button
                    key={memberStatus}
                    variant={memberStatus === "active" ? "primary" : "secondary"}
                    size="sm"
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
          </>
        ) : null}

        {status ? (
          <p className="text-body-sm text-text-secondary" role="status">
            {status}
          </p>
        ) : null}
      </aside>
    </div>
  );
}
