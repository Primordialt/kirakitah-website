"use client";

import { cn } from "@/lib/cn";
import { headerCta, primaryNavigation } from "@/config/navigation";
import { Button } from "@/components/ui";
import { NavLink } from "./NavLink";
import { useEffect, useRef } from "react";

export interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const firstLink = panelRef.current?.querySelector("a, button");
      if (firstLink instanceof HTMLElement) {
        firstLink.focus();
      }
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-x-0 top-[var(--header-height)] bottom-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden",
          "transition-standard transition-opacity",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        id="mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        hidden={!isOpen}
        className={cn(
          "fixed inset-x-0 top-[var(--header-height)] z-50 lg:hidden",
          "border-b border-border bg-surface-elevated shadow-lg",
          "motion-safe:transition-transform motion-safe:duration-[var(--duration-standard)] motion-safe:ease-[var(--ease-out)]",
          isOpen ? "translate-y-0" : "-translate-y-2 pointer-events-none opacity-0",
        )}
      >
        <nav aria-label="Mobile primary" className="container-content py-6">
          <ul className="flex flex-col gap-1">
            {primaryNavigation.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  external={item.external}
                  onClick={onClose}
                  className="block rounded-lg px-3 py-3 text-h4"
                  activeClassName="bg-surface-muted text-text-primary no-underline border-l-2 border-brand-primary pl-[calc(0.75rem-2px)]"
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t border-border pt-6">
            <Button
              href={headerCta.href}
              className="w-full"
              onClick={onClose}
            >
              {headerCta.label}
            </Button>
          </div>
        </nav>
      </div>
    </>
  );
}
