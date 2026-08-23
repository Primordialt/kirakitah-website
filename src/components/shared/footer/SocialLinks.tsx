import { cn } from "@/lib/cn";
import { type FooterLink } from "@/config/navigation";
import { Instagram, Youtube } from "lucide-react";

const socialIcons: Record<string, React.ReactNode> = {
  Instagram: <Instagram className="size-4" aria-hidden="true" />,
  TikTok: (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  ),
  YouTube: <Youtube className="size-4" aria-hidden="true" />,
};

export interface SocialLinksProps {
  links: FooterLink[];
  className?: string;
}

export function SocialLinks({ links, className }: SocialLinksProps) {
  const activeLinks = links.filter((link): link is FooterLink & { href: string } =>
    Boolean(link.href),
  );

  if (activeLinks.length === 0) {
    return (
      <ul className={cn("flex flex-col gap-3", className)}>
        {links.map((link) => (
          <li
            key={link.label}
            className="flex items-center gap-2 text-body-sm text-text-muted"
          >
            {socialIcons[link.label]}
            <span>{link.label}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {activeLinks.map((link) => (
        <li key={link.label}>
          <a
            href={link.href}
            className={cn(
              "inline-flex items-center gap-2 text-body-sm text-text-secondary",
              "transition-standard transition-colors hover:text-text-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50 rounded-sm",
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            {socialIcons[link.label]}
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
