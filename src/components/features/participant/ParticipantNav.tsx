"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { LogoutButton } from "@/components/features/participant/LogoutButton";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

export const PARTICIPANT_PORTAL_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/matches", label: "Matches" },
  { href: "/notifications", label: "Notifications" },
  { href: "/account", label: "Account" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type PortalIdentity = {
  username: string;
  profileVerified: boolean;
};

export function ParticipantNavLinks({
  onNavigate,
  orientation = "horizontal",
}: {
  onNavigate?: () => void;
  orientation?: "horizontal" | "vertical";
}) {
  const pathname = usePathname();
  const vertical = orientation === "vertical";

  return (
    <ul
      className={
        vertical
          ? "flex flex-col gap-1"
          : "flex flex-wrap items-center gap-1"
      }
    >
      {PARTICIPANT_PORTAL_NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={`inline-flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                active
                  ? "bg-brand-primary text-white"
                  : "text-text-secondary hover:bg-surface-muted hover:text-text-primary"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.label.toUpperCase()}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ParticipantPortalHeader({
  identity,
}: {
  identity: PortalIdentity | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-caption font-semibold tracking-[0.18em] text-brand-primary">
            KIRAKITAH
          </p>
          <p className="text-body-sm font-medium text-text-primary">
            Participant Portal
          </p>
        </div>

        {identity ? (
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <span className="truncate text-body-sm font-medium text-text-primary">
              {identity.username}
            </span>
            <VerifiedBadge verified={identity.profileVerified} />
          </div>
        ) : null}

        <Link
          href="/notifications"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-body-sm font-medium text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          aria-label="Notifications"
        >
          Alerts
        </Link>

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border text-body-sm font-medium text-text-primary hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus md:hidden"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          Menu
        </button>
      </div>

      <nav
        aria-label="Participant portal"
        className="mx-auto hidden max-w-6xl px-4 pb-3 sm:px-6 md:block lg:hidden"
      >
        <div className="flex items-center gap-3">
          <ParticipantNavLinks />
          <div className="ml-auto">
            <LogoutButton />
          </div>
        </div>
      </nav>

      {menuOpen ? (
        <div
          id={menuId}
          className="border-t border-border bg-surface px-4 py-4 md:hidden"
        >
          {identity ? (
            <p className="mb-3 flex items-center gap-2 text-body-sm font-medium text-text-primary">
              <span className="truncate">{identity.username}</span>
              <VerifiedBadge verified={identity.profileVerified} />
            </p>
          ) : null}
          <nav aria-label="Participant portal mobile">
            <ParticipantNavLinks
              orientation="vertical"
              onNavigate={() => setMenuOpen(false)}
            />
            <div className="mt-3 border-t border-border pt-3">
              <LogoutButton />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

/** @deprecated Prefer ParticipantPortalShell; kept for pages still embedding nav alone. */
export function ParticipantNav() {
  return (
    <nav aria-label="Participant portal" className="mb-6 md:hidden">
      <ParticipantNavLinks />
    </nav>
  );
}
