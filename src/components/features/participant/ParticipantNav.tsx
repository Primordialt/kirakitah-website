"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatboxNavLink } from "@/components/features/chatbox/ChatboxNavLink";
import { LogoutButton } from "@/components/features/participant/LogoutButton";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";

export const PARTICIPANT_PORTAL_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/matches", label: "Fixtures" },
  { href: "/arena", label: "Arena" },
  { href: "/chatbox", label: "Chatbox" },
  { href: "/wallet", label: "Wallet" },
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
        if (item.href === "/chatbox") {
          return (
            <li key={item.href}>
              <ChatboxNavLink
                href={item.href}
                label={item.label}
                onNavigate={onNavigate}
                orientation={orientation}
              />
            </li>
          );
        }
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
  return (
    <header
      className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-md"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-caption font-semibold tracking-[0.18em] text-brand-primary">
            KIRAKITAH
          </p>
          <p className="hidden text-body-sm font-medium text-text-primary sm:block">
            Participant Portal
          </p>
        </div>

        {identity ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="max-w-28 truncate text-body-sm font-medium text-text-primary sm:max-w-none">
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
