"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { participantFetch } from "@/lib/participant/api";

export function ChatboxNavLink({
  href,
  label,
  onNavigate,
  orientation = "horizontal",
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
  orientation?: "horizontal" | "vertical";
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const vertical = orientation === "vertical";
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { response, payload } = await participantFetch<{ unreadCount?: number }>(
        "/api/participant/chatbox/unread",
      );
      if (!cancelled && response.ok) {
        setUnreadCount(payload.unreadCount ?? 0);
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pathname]);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        vertical ? "w-full" : ""
      } ${
        active
          ? "bg-brand-primary text-white"
          : "text-text-secondary hover:bg-surface-muted hover:text-text-primary"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span>{label.toUpperCase()}</span>
      {unreadCount > 0 ? (
        <span
          className="inline-flex min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-caption font-semibold text-white"
          aria-label={`${unreadCount} unread messages`}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
