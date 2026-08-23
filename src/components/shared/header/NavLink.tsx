"use client";

import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentProps } from "react";

export interface NavLinkProps extends Omit<ComponentProps<typeof Link>, "href"> {
  href: string;
  external?: boolean;
  activeClassName?: string;
}

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({
  href,
  external,
  className,
  activeClassName,
  children,
  ...props
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = isActiveRoute(pathname, href);

  const classes = cn(
    "transition-standard transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm",
    isActive
      ? cn(
          "text-text-primary font-semibold",
          activeClassName ?? "underline decoration-brand-primary decoration-2 underline-offset-4",
        )
      : "text-text-secondary hover:text-text-primary",
    className,
  );

  if (external) {
    return (
      <a
        href={href}
        className={classes}
        target="_blank"
        rel="noopener noreferrer"
        aria-current={isActive ? "page" : undefined}
        {...(props as ComponentProps<"a">)}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={classes}
      aria-current={isActive ? "page" : undefined}
      {...props}
    >
      {children}
    </Link>
  );
}

export function useActiveRoute(href: string): boolean {
  const pathname = usePathname();
  return isActiveRoute(pathname, href);
}
