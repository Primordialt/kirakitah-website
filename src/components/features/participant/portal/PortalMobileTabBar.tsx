"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import {
  House,
  MessageCircle,
  MoreHorizontal,
  Swords,
  Wallet,
} from "lucide-react";
import { LogoutButton } from "@/components/features/participant/LogoutButton";
import { participantFetch } from "@/lib/participant/api";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import type { PortalIdentity } from "@/components/features/participant/ParticipantNav";

const TABS = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/arena", label: "Arena", icon: Swords },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/chatbox", label: "Chat", icon: MessageCircle },
] as const;

const MORE_LINKS = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/matches", label: "Fixtures" },
  { href: "/profile", label: "Profile" },
  { href: "/notifications", label: "Notifications" },
  { href: "/get-the-app", label: "Install App" },
  { href: "/account", label: "Account" },
  { href: "/esports", label: "Competition info" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalMobileTabBar({
  identity,
}: {
  identity: PortalIdentity | null;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const moreId = useId();
  const moreActive = MORE_LINKS.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { response, payload } = await participantFetch<{ unreadCount?: number }>(
        "/api/participant/chatbox/unread",
      );
      if (!cancelled && response.ok) setUnreadCount(payload.unreadCount ?? 0);
    };
    void load();
    const interval = window.setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pathname]);

  return (
    <>
      {moreOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-background/70"
            aria-label="Close more sections"
            onClick={() => setMoreOpen(false)}
          />
          <div
            id={moreId}
            role="dialog"
            aria-modal="true"
            aria-label="More sections"
            className="absolute inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] rounded-t-2xl border border-border bg-surface-elevated px-4 pt-3 pb-4 shadow-lg"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong" />
            {identity ? (
              <p className="mb-3 flex items-center gap-2 text-body-sm font-medium text-text-primary">
                <span className="truncate">{identity.username}</span>
                <VerifiedBadge verified={identity.profileVerified} />
              </p>
            ) : null}
            <ul className="grid gap-1">
              {MORE_LINKS.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex min-h-12 items-center rounded-xl px-3 text-body-sm font-medium ${
                        active
                          ? "bg-brand-primary text-white"
                          : "text-text-primary active:bg-surface-muted"
                      }`}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 border-t border-border pt-3">
              <LogoutButton />
            </div>
          </div>
        </div>
      ) : null}

      <nav
        aria-label="App sections"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid h-[4.25rem] grid-cols-5">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            const Icon = tab.icon;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                    active ? "text-accent" : "text-text-muted"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="relative">
                    <Icon className="size-5" aria-hidden="true" strokeWidth={active ? 2.4 : 1.8} />
                    {tab.href === "/chatbox" && unreadCount > 0 ? (
                      <span className="absolute -top-1 -right-2 min-w-4 rounded-full bg-error px-1 text-center text-[10px] leading-4 font-semibold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    ) : null}
                  </span>
                  {tab.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              className={`flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                moreOpen || moreActive ? "text-accent" : "text-text-muted"
              }`}
              aria-expanded={moreOpen}
              aria-controls={moreId}
              onClick={() => setMoreOpen((open) => !open)}
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
