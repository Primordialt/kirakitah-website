import { RegistrationForm } from "@/components/features/registration";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import { COMPETITION_NAME } from "@/config/competition";
import { esportsRegisterHero } from "@/config/esports";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

const description = `Register for ${COMPETITION_NAME} — the inaugural eFootball Mobile championship commencing September 14, 2026.`;

export const metadata: Metadata = {
  title: `Register for ${COMPETITION_NAME} — KIRAKITAH`,
  description,
  openGraph: {
    title: `Register for ${COMPETITION_NAME} — KIRAKITAH`,
    description,
    url: `${siteConfig.url}/esports/register`,
    siteName: siteConfig.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Register for ${COMPETITION_NAME} — KIRAKITAH`,
    description,
  },
  alternates: { canonical: `${siteConfig.url}/esports/register` },
};

export default function EsportsRegisterPage() {
  return (
    <>
      <SectionShell className="py-12 md:py-16" containerClassName="max-w-2xl">
        <div className="mb-10 text-center">
          <p className="text-label font-semibold tracking-[0.2em] text-accent">
            {COMPETITION_NAME}
          </p>
          <h1 className="mt-3 text-h1 text-text-primary">
            REGISTER FOR {COMPETITION_NAME}
          </h1>
          <p className="mt-4 text-body-lg text-text-secondary">
            {esportsRegisterHero.headline}
          </p>
          <p className="mt-2 text-body text-text-muted">
            {esportsRegisterHero.copy}
          </p>
        </div>
        <RegistrationForm />
      </SectionShell>
    </>
  );
}
