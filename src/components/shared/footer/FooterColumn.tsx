import { cn } from "@/lib/cn";
import { type FooterLink } from "@/config/navigation";
import Link from "next/link";

export interface FooterColumnProps {
  title: string;
  links: FooterLink[];
  className?: string;
}

export function FooterColumn({ title, links, className }: FooterColumnProps) {
  const activeLinks = links.filter((link) => link.href);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <h3 className="text-label font-semibold text-text-primary">{title}</h3>
      {activeLinks.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {activeLinks.map((link) => (
            <li key={link.label}>
              <FooterLinkItem link={link as FooterLink & { href: string }} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-3" aria-label={`${title} links`}>
          {links.map((link) => (
            <li key={link.label}>
              <span className="text-body-sm text-text-muted">{link.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FooterLinkItem({ link }: { link: FooterLink & { href: string } }) {
  if (link.external) {
    return (
      <a
        href={link.href}
        className={footerLinkClassName}
        target="_blank"
        rel="noopener noreferrer"
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link href={link.href} className={footerLinkClassName}>
      {link.label}
    </Link>
  );
}

const footerLinkClassName = cn(
  "text-body-sm text-text-secondary transition-standard transition-colors",
  "hover:text-text-primary",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50 rounded-sm",
);
