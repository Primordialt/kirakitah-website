"use client";

import { cn } from "@/lib/cn";
import { Menu, X } from "lucide-react";
import { forwardRef } from "react";

export interface MobileMenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isOpen: boolean;
}

export const MobileMenuButton = forwardRef<
  HTMLButtonElement,
  MobileMenuButtonProps
>(function MobileMenuButton({ isOpen, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-lg",
        "text-text-primary transition-standard transition-colors",
        "hover:bg-surface-muted active:bg-surface-elevated",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50",
        "lg:hidden",
        className,
      )}
      {...props}
      aria-expanded={isOpen}
      aria-controls="mobile-navigation"
      aria-label={isOpen ? "Close menu" : "Open menu"}
    >
      {isOpen ? (
        <X className="size-5" aria-hidden="true" />
      ) : (
        <Menu className="size-5" aria-hidden="true" />
      )}
    </button>
  );
});
