"use client";

import { cn } from "@/lib/cn";
import { siteConfig } from "@/config/site";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DesktopNavigation } from "./DesktopNavigation";
import { MobileMenuButton } from "./MobileMenuButton";
import { MobileNavigation } from "./MobileNavigation";

export function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isHome = pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => {
    setIsMenuOpen(false);
    requestAnimationFrame(() => {
      menuButtonRef.current?.focus();
    });
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full",
        "border-b transition-standard transition-[background-color,border-color,box-shadow]",
        isScrolled
          ? "border-border bg-background/95 shadow-sm backdrop-blur-md"
          : "border-transparent bg-background/80 backdrop-blur-sm",
      )}
      style={{ "--header-height": "4rem" } as CSSProperties}
    >
      <div className="container-wide flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className={cn(
            "text-label font-bold tracking-[0.12em] text-text-primary",
            "transition-standard transition-colors hover:text-accent",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm",
          )}
          aria-label={`${siteConfig.name} home`}
          aria-current={isHome ? "page" : undefined}
        >
          {siteConfig.brandName}
        </Link>

        <DesktopNavigation />

        <MobileMenuButton
          ref={menuButtonRef}
          isOpen={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        />
      </div>

      <MobileNavigation isOpen={isMenuOpen} onClose={closeMenu} />
    </header>
  );
}
