import { cn } from "@/lib/cn";
import {
  footerBrand,
  footerColumns,
  footerContactLink,
} from "@/config/navigation";
import { siteConfig } from "@/config/site";
import Link from "next/link";
import { FooterColumn } from "./FooterColumn";
import { SocialLinks } from "./SocialLinks";

export function Footer() {
  const exploreColumn = footerColumns.find((col) => col.title === "Explore");
  const participateColumn = footerColumns.find(
    (col) => col.title === "Participate",
  );
  const connectColumn = footerColumns.find((col) => col.title === "Connect");
  const legalColumn = footerColumns.find((col) => col.title === "Legal");

  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-wide py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Link
              href="/"
              className="text-h3 font-bold tracking-[0.1em] text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50 rounded-sm"
            >
              {siteConfig.brandName}
            </Link>
            <p className="mt-3 text-label font-semibold text-accent">
              {footerBrand.tagline}
            </p>
            <p className="mt-4 max-w-sm text-body-sm text-text-secondary">
              {footerBrand.description}
            </p>
            <p className="mt-6 text-caption text-text-muted">
              {siteConfig.parentOrganisation}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
            {exploreColumn && <FooterColumn {...exploreColumn} />}
            {participateColumn && <FooterColumn {...participateColumn} />}
            {connectColumn && (
              <div className="flex flex-col gap-4">
                <h3 className="text-label font-semibold text-text-primary">
                  {connectColumn.title}
                </h3>
                <SocialLinks links={connectColumn.links} />
              </div>
            )}
            {legalColumn && <FooterColumn {...legalColumn} />}
          </div>
        </div>

        <div
          className={cn(
            "mt-12 flex flex-col gap-4 border-t border-border pt-8",
            "sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <p className="text-caption text-text-muted">
            &copy; {new Date().getFullYear()} {siteConfig.brandName}. All rights
            reserved.
          </p>
          {footerContactLink.href && (
            <Link
              href={footerContactLink.href}
              className="text-body-sm text-text-secondary transition-standard transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50 rounded-sm"
            >
              {footerContactLink.label}
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
