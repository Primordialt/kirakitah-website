"use client";

import { Button } from "@/components/ui";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  eventType: string;
  href?: string | null;
};

type NotificationGroup = {
  label: string;
  items: NotificationItem[];
};

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function groupNotifications(items: NotificationItem[]): NotificationGroup[] {
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  const today: NotificationItem[] = [];
  const yesterday: NotificationItem[] = [];
  const older: NotificationItem[] = [];

  for (const item of items) {
    const created = startOfLocalDay(new Date(item.createdAt));
    if (created >= todayStart) today.push(item);
    else if (created >= yesterdayStart) yesterday.push(item);
    else older.push(item);
  }

  const groups: NotificationGroup[] = [];
  if (today.length > 0) groups.push({ label: "Today", items: today });
  if (yesterday.length > 0) groups.push({ label: "Yesterday", items: yesterday });
  if (older.length > 0) groups.push({ label: "Older", items: older });
  return groups;
}

function formatWat(iso: string): string {
  return `${new Date(iso).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
  })} WAT`;
}

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { response, payload } = await participantFetch<{
        notifications?: NotificationItem[];
      }>("/api/participant/notifications");

      if (cancelled) return;
      setLoading(false);

      if (!response.ok) {
        setError(apiErrorMessage(payload, "Unable to load notifications."));
        return;
      }

      setNotifications(payload.notifications ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(
    () => groupNotifications(notifications),
    [notifications],
  );

  if (loading) {
    return (
      <p className="text-body-sm text-text-muted" aria-live="polite">
        Loading notifications…
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <header>
        <h1 className="text-h2 text-text-primary">NOTIFICATIONS</h1>
        <p className="mt-2 text-body text-text-secondary">
          Updates about your profile, application, and tournament activity.
        </p>
      </header>

      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}

      {notifications.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-body text-text-secondary">
            You&apos;re all caught up.
          </p>
          <Button href="/dashboard" variant="secondary" className="mt-4">
            Back to dashboard
          </Button>
        </section>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label} aria-labelledby={`group-${group.label}`}>
              <h2
                id={`group-${group.label}`}
                className="text-caption font-semibold uppercase tracking-wide text-text-muted"
              >
                {group.label}
              </h2>
              <ul className="mt-3 space-y-3">
                {group.items.map((item) => {
                  const href =
                    item.href && item.href.startsWith("/") ? item.href : null;
                  const body = (
                    <>
                      <p className="text-body font-semibold text-text-primary">
                        {item.title}
                      </p>
                      <p className="mt-1 text-body-sm text-text-secondary">
                        {item.description}
                      </p>
                      <p className="mt-2 text-body-sm text-text-muted">
                        <time dateTime={item.createdAt}>
                          {formatWat(item.createdAt)}
                        </time>
                      </p>
                      {href ? (
                        <p className="mt-2 text-body-sm font-medium text-accent">
                          View details
                        </p>
                      ) : null}
                    </>
                  );

                  return (
                    <li key={item.id}>
                      {href ? (
                        <Link
                          href={href}
                          className="block rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className="rounded-xl border border-border bg-surface p-5">
                          {body}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
