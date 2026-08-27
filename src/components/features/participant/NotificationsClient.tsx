"use client";

import { Button } from "@/components/ui";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import { useEffect, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  eventType: string;
};

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
          Tournament updates recorded for your account.
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
        <ul className="space-y-3">
          {notifications.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <p className="text-body font-semibold text-text-primary">
                {item.title}
              </p>
              <p className="mt-1 text-body-sm text-text-secondary">
                {item.description}
              </p>
              <p className="mt-2 text-body-sm text-text-muted">
                {new Date(item.createdAt).toLocaleString("en-NG", {
                  timeZone: "Africa/Lagos",
                })}{" "}
                WAT
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
