"use client";

import { headerAuthLinks } from "@/config/navigation";
import type { SiteHeaderAuthState } from "@/config/site-header-auth";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui";
import { NavLink } from "./NavLink";

export interface HeaderAuthActionsProps {
  auth: SiteHeaderAuthState;
  layout: "desktop" | "mobile";
  onNavigate?: () => void;
}

export function HeaderAuthActions({
  auth,
  layout,
  onNavigate,
}: HeaderAuthActionsProps) {
  const isMobile = layout === "mobile";

  if (auth.isAuthenticated) {
    return (
      <div
        className={cn(
          "flex gap-3",
          isMobile ? "flex-col" : "shrink-0 items-center",
        )}
      >
        <NavLink
          href={headerAuthLinks.fixtures.href}
          onClick={onNavigate}
          className={cn(
            "text-label font-semibold",
            isMobile && "block rounded-lg px-3 py-3 text-h4",
          )}
          activeClassName={
            isMobile
              ? "bg-surface-muted text-text-primary no-underline border-l-2 border-brand-primary pl-[calc(0.75rem-2px)]"
              : undefined
          }
        >
          {headerAuthLinks.fixtures.label}
        </NavLink>
        <Button
          href={headerAuthLinks.account.href}
          size={isMobile ? "md" : "sm"}
          variant={isMobile ? "primary" : "secondary"}
          className={isMobile ? "w-full" : undefined}
          onClick={onNavigate}
        >
          {headerAuthLinks.account.label}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3",
        isMobile ? "flex-col" : "shrink-0 items-center",
      )}
    >
      <NavLink
        href={headerAuthLinks.login.href}
        onClick={onNavigate}
        className={cn(
          "text-label font-semibold whitespace-nowrap",
          isMobile && "block rounded-lg px-3 py-3 text-h4",
        )}
        activeClassName={
          isMobile
            ? "bg-surface-muted text-text-primary no-underline border-l-2 border-brand-primary pl-[calc(0.75rem-2px)]"
            : undefined
        }
      >
        {headerAuthLinks.login.label}
      </NavLink>
      <Button
        href={headerAuthLinks.register.href}
        size={isMobile ? "md" : "sm"}
        className={isMobile ? "w-full" : undefined}
        onClick={onNavigate}
      >
        {headerAuthLinks.register.label}
      </Button>
    </div>
  );
}
