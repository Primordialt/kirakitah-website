"use client";

import { desktopNavigation, headerCta } from "@/config/navigation";
import { NavLink } from "./NavLink";
import { Button } from "@/components/ui";

export function DesktopNavigation() {
  return (
    <nav
      aria-label="Primary"
      className="hidden items-center gap-8 lg:flex"
    >
      <ul className="flex items-center gap-6">
        {desktopNavigation.map((item) => (
          <li key={item.href}>
            <NavLink
              href={item.href}
              external={item.external}
              className="text-label whitespace-nowrap"
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <Button href={headerCta.href} size="sm">
        {headerCta.label}
      </Button>
    </nav>
  );
}
