import { SectionShell } from "@/components/sections/home/SectionShell";
import { Button } from "@/components/ui";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

export interface ComingSoonPageProps {
  title: string;
  description: string;
  path: string;
}

export function createComingSoonMetadata({
  title,
  description,
  path,
}: ComingSoonPageProps): Metadata {
  return {
    title,
    description,
    openGraph: {
      title: `${title} — ${siteConfig.name}`,
      description,
      url: `${siteConfig.url}${path}`,
      siteName: siteConfig.name,
      type: "website",
    },
    alternates: { canonical: `${siteConfig.url}${path}` },
  };
}

export function ComingSoonPage({
  title,
  description,
}: Omit<ComingSoonPageProps, "path">) {
  return (
    <SectionShell className="py-20 md:py-28" containerClassName="max-w-2xl">
      <p className="text-label font-semibold tracking-[0.2em] text-accent">
        KIRAKITAH
      </p>
      <h1 className="mt-3 text-h1 text-text-primary">{title}</h1>
      <p className="mt-6 text-body-lg text-text-secondary">{description}</p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button href="/" size="lg">
          BACK TO HOME
        </Button>
        <Button href="/initiatives" variant="outline" size="lg">
          EXPLORE INITIATIVES
        </Button>
      </div>
    </SectionShell>
  );
}
