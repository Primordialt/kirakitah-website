"use client";

import { Button } from "@/components/ui";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const raw = window.atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function GetTheAppActions() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const standaloneQuery = window.matchMedia?.("(display-mode: standalone)");
    const standalone =
      Boolean(standaloneQuery?.matches) ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  };

  const enableAlerts = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setError("This phone cannot show KIRAKITAH alerts yet. Add the icon to your home screen, then open it from there.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Alerts stay off until you tap Allow.");
        return;
      }
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setError("Phone alerts are not switched on for this site yet. You can still add KIRAKITAH to your home screen.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
      const saved = await participantFetch("/api/participant/push/subscribe", {
        method: "POST",
        body: JSON.stringify(subscription.toJSON()),
      });
      if (saved.response.status === 401) {
        window.location.assign("/login?next=%2Fget-the-app");
        return;
      }
      if (!saved.response.ok) {
        setError(apiErrorMessage(saved.payload, "KIRAKITAH could not save this phone."));
        return;
      }
      const test = await participantFetch("/api/participant/push/test", {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!test.response.ok) {
        setError(apiErrorMessage(test.payload, "This phone is saved. The test alert did not arrive."));
        return;
      }
      setMessage("Alerts are on. A test message was sent to this phone.");
    } catch {
      setError("This phone could not turn on alerts. Add KIRAKITAH to your home screen, open the icon, and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 flex flex-col gap-3">
      {installEvent ? (
        <Button type="button" size="lg" className="w-full" onClick={() => void install()}>
          Install App
        </Button>
      ) : null}
      <Button
        type="button"
        size="lg"
        variant={installEvent ? "outline" : "primary"}
        className="w-full"
        loading={loading}
        onClick={() => void enableAlerts()}
      >
        Turn on phone alerts
      </Button>
      {installed ? (
        <p className="text-body-sm text-text-secondary" role="status">
          You are using the KIRAKITAH icon. You can turn on alerts from here.
        </p>
      ) : null}
      {message ? (
        <p className="text-body-sm text-text-primary" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-body-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
