import { RulesContent, RulesNavigation } from "@/components/sections/esports/RulesContent";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import { COMPETITION_NAME } from "@/config/competition";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

const description = `Official tournament rules for ${COMPETITION_NAME} — eligibility, registration, match format, prizes and safeguarding.`;

export const metadata: Metadata = {
  title: `${COMPETITION_NAME} — Tournament Rules`,
  description,
  openGraph: {
    title: `${COMPETITION_NAME} — Tournament Rules`,
    description,
    url: `${siteConfig.url}/esports/rules`,
    siteName: siteConfig.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${COMPETITION_NAME} — Tournament Rules`,
    description,
  },
  alternates: { canonical: `${siteConfig.url}/esports/rules` },
};

export default function EsportsRulesPage() {
  return (
    <SectionShell
      className="py-12 md:py-20"
      containerClassName="max-w-5xl"
    >
      <div className="mb-12 max-w-2xl">
        <p className="text-label font-semibold tracking-[0.2em] text-accent">
          {COMPETITION_NAME}
        </p>
        <h1 className="mt-3 text-h1 text-text-primary">TOURNAMENT RULES</h1>
        <p className="mt-4 text-body-lg text-text-secondary">
          Know the rules before you enter the arena.
        </p>
      </div>
      <div className="grid gap-12 lg:grid-cols-[14rem_1fr] lg:gap-16">
        <RulesNavigation />
        <RulesContent />
      </div>
    </SectionShell>
  );
}
