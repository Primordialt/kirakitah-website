"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/features/participant/LogoutButton";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "My Profile" },
  { href: "/tournaments", label: "My Tournaments" },
  { href: "/matches", label: "My Matches" },
  { href: "/notifications", label: "Notifications" },
  { href: "/account", label: "Account" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ParticipantNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Participant portal"
      className="mb-8 border-b border-border pb-4"
    >
      <ul className="flex flex-wrap gap-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
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
        <li className="ml-auto flex items-center">
          <LogoutButton />
        </li>
      </ul>
    </nav>
  );
}
