"use client";

import { desktopNavigation } from "@/config/navigation";
import type { SiteHeaderAuthState } from "@/config/site-header-auth";
import { unauthenticatedSiteHeaderAuth } from "@/config/site-header-auth";
import { HeaderAuthActions } from "./HeaderAuthActions";
import { NavLink } from "./NavLink";

export interface DesktopNavigationProps {
  auth?: SiteHeaderAuthState;
}

export function DesktopNavigation({
  auth = unauthenticatedSiteHeaderAuth,
}: DesktopNavigationProps) {
  return (
    <nav
      aria-label="Primary"
      className="hidden min-w-0 items-center gap-4 lg:flex xl:gap-6"
    >
      <ul className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-1 xl:gap-x-6">
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
      <HeaderAuthActions auth={auth} layout="desktop" />
    </nav>
  );
}
