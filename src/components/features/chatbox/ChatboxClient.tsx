"use client";

import { Button } from "@/components/ui";
import {
  apiErrorMessage,
  participantFetch,
} from "@/lib/participant/api";
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
  canSend: boolean;
  sendBlockedReason: string | null;
};

type MentionCandidate = { username: string };

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

export function ChatboxClient() {
  const [room, setRoom] = useState<ChatRoomStateView | null>(null);
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessageView | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionCandidates, setMentionCandidates] = useState<MentionCandidate[]>(
    [],
  );
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const loadChat = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError(null);
    const { response, payload } = await participantFetch<{
      room?: ChatRoomStateView;
      messages?: ChatMessageView[];
      nextCursor?: string | null;
    }>("/api/participant/chatbox");

    if (!opts?.silent) setLoading(false);

    if (!response.ok || !payload.room) {
      setError(apiErrorMessage(payload, "Unable to load Chatbox."));
      return;
    }

    setRoom(payload.room);
    setMessages(payload.messages ?? []);
    setNextCursor(payload.nextCursor ?? null);

    const last = payload.messages?.[payload.messages.length - 1];
    if (last) {
      void participantFetch("/api/participant/chatbox/read", {
        method: "POST",
        body: JSON.stringify({ lastReadMessageId: last.id }),
      });
    }
  }, []);

  useEffect(() => {
    void loadChat();
    const interval = window.setInterval(() => {
      void loadChat({ silent: true });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [loadChat]);

  useEffect(() => {
    if (!mentionQuery) {
      setMentionCandidates([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      const { response, payload } = await participantFetch<{
        candidates?: MentionCandidate[];
      }>(`/api/participant/chatbox/mentions?q=${encodeURIComponent(mentionQuery)}`);
      if (response.ok) {
        setMentionCandidates(payload.candidates ?? []);
      }
    }, 200);
    return () => window.clearTimeout(handle);
  }, [mentionQuery]);

  const loadOlder = async () => {
    if (!nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    const { response, payload } = await participantFetch<{
      messages?: ChatMessageView[];
      nextCursor?: string | null;
    }>(`/api/participant/chatbox?cursor=${encodeURIComponent(nextCursor)}`);
    setLoadingOlder(false);
    if (response.ok) {
      setMessages((current) => [...(payload.messages ?? []), ...current]);
      setNextCursor(payload.nextCursor ?? null);
    }
  };

  const onDraftChange = (value: string) => {
    setDraft(value);
    const atIndex = value.lastIndexOf("@");
    if (atIndex >= 0) {
      const fragment = value.slice(atIndex + 1);
      if (!fragment.includes(" ") && fragment.length <= 32) {
        setMentionQuery(fragment);
        return;
      }
    }
    setMentionQuery(null);
  };

  const insertMention = (username: string) => {
    const atIndex = draft.lastIndexOf("@");
    if (atIndex < 0) return;
    const next = `${draft.slice(0, atIndex)}@${username} `;
    setDraft(next);
    setMentionQuery(null);
    composerRef.current?.focus();
  };

  const sendMessage = async () => {
    if (!room?.canSend || sending) return;
    setSending(true);
    const { response, payload } = await participantFetch<{ message?: ChatMessageView }>(
      "/api/participant/chatbox/messages",
      {
        method: "POST",
        body: JSON.stringify({
          content: draft,
          replyToMessageId: replyTo?.id ?? null,
        }),
      },
    );
    setSending(false);
    if (!response.ok || !payload.message) {
      setError(apiErrorMessage(payload, "Unable to send message."));
      return;
    }
    setDraft("");
    setReplyTo(null);
    setError(null);
    await loadChat({ silent: true });
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  if (loading && !room) {
    return (
      <p className="text-body-sm text-text-muted" role="status">
        Loading Chatbox…
      </p>
    );
  }

  if (error && !room) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="text-body-sm text-error" role="alert">
          {error}
        </p>
        <Button className="mt-4" onClick={() => void loadChat()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="flex min-h-[70vh] flex-col rounded-xl border border-border bg-surface">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <p className="text-caption font-semibold uppercase tracking-wide text-brand-primary">
          Chatbox
        </p>
        <h1 className="text-h3 text-text-primary">{room.name}</h1>
        <p className="mt-1 text-body-sm text-text-muted">
          {room.memberCount} member{room.memberCount === 1 ? "" : "s"}
        </p>
        {room.isLocked ? (
          <p
            className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-body-sm text-text-primary"
            role="status"
          >
            🔒 Chat locked — only admins can send messages right now.
          </p>
        ) : null}
        {room.pinnedMessage ? (
          <div className="mt-3 rounded-lg border border-brand-primary/30 bg-brand-primary/5 px-3 py-2">
            <p className="text-caption font-semibold text-brand-primary">📌 Pinned</p>
            <p className="mt-1 text-body-sm text-text-primary">
              {room.pinnedMessage.content}
            </p>
          </div>
        ) : null}
      </header>

      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6"
        aria-live="polite"
        aria-relevant="additions"
      >
        {nextCursor ? (
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => void loadOlder()} loading={loadingOlder}>
              Load older messages
            </Button>
          </div>
        ) : null}

        {messages.length === 0 ? (
          <p className="text-body-sm text-text-secondary">
            Welcome to the KIRAKITAH Chatbox. Important announcements and community
            conversations will appear here.
          </p>
        ) : null}

        {messages.map((message) => (
          <article
            key={message.id}
            id={`message-${message.id}`}
            className={`rounded-lg border px-3 py-2 ${
              message.messageType === "announcement"
                ? "border-brand-primary/40 bg-brand-primary/5"
                : message.senderKind === "admin"
                  ? "border-accent/30 bg-surface-muted"
                  : "border-border bg-surface-elevated"
            }`}
          >
            {message.messageType === "announcement" ? (
              <p className="text-caption font-semibold text-brand-primary">
                📢 Admin announcement
              </p>
            ) : null}
            {message.messageType === "system" ? (
              <p className="text-caption font-semibold text-text-muted">System</p>
            ) : null}
            {message.replyTo ? (
              <p className="mb-1 border-l-2 border-border pl-2 text-caption text-text-muted">
                Replying to {message.replyTo.senderLabel}: {message.replyTo.contentPreview}
              </p>
            ) : null}
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-body-sm font-semibold text-text-primary">
                {message.senderLabel}
              </p>
              <time className="text-caption text-text-muted" dateTime={message.createdAt}>
                {formatTime(message.createdAt)}
              </time>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-body-sm text-text-secondary">
              {message.content}
            </p>
            {room.canSend && !message.isDeleted ? (
              <button
                type="button"
                className="mt-2 text-caption font-medium text-accent underline-offset-2 hover:underline"
                onClick={() => setReplyTo(message)}
              >
                Reply
              </button>
            ) : null}
          </article>
        ))}
      </div>

      <footer className="border-t border-border px-4 py-4 sm:px-6">
        {error ? (
          <p className="mb-2 text-body-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        {replyTo ? (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-body-sm">
            <span>
              Replying to {replyTo.senderLabel}
            </span>
            <button type="button" className="text-accent" onClick={() => setReplyTo(null)}>
              Cancel
            </button>
          </div>
        ) : null}

        {room.canSend ? (
          <div className="relative">
            <label htmlFor="chatbox-composer" className="sr-only">
              Type a message
            </label>
            <textarea
              id="chatbox-composer"
              ref={composerRef}
              rows={3}
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder="Type a message… Use @username to mention someone."
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-body-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            />
            {mentionCandidates.length > 0 && mentionQuery !== null ? (
              <ul
                className="absolute bottom-full left-0 z-10 mb-1 max-h-40 w-full overflow-y-auto rounded-lg border border-border bg-surface-elevated shadow-lg"
                role="listbox"
              >
                {mentionCandidates.map((candidate) => (
                  <li key={candidate.username}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-body-sm hover:bg-surface-muted"
                      onClick={() => insertMention(candidate.username)}
                    >
                      @{candidate.username}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 flex justify-end">
              <Button onClick={() => void sendMessage()} loading={sending}>
                Send
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-body-sm text-text-muted" role="status">
            {room.sendBlockedReason ??
              "You can read messages here, but sending is unavailable right now."}
          </p>
        )}
      </footer>
    </div>
  );
}
