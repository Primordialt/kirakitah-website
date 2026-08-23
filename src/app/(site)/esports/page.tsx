import {
  EsportsHero,
  TournamentIntro,
  TournamentDetails,
  TournamentJourney,
  Qualification,
  KnockoutStage,
  TournamentTechnology,
  WatchAction,
  MatchHighlights,
  RulesPreview,
  FAQPreview,
  EsportsFinalCTA,
} from "@/components/sections/esports";
import { esportsFaqPreview } from "@/config/esports";
import { siteConfig } from "@/config/site";
import { services } from "@/services";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const description =
  "KIRAKITAH GAMING 926 — the inaugural eFootball Mobile championship. 128 players, 32 qualify, one champion, US$100 grand prize. Commences September 14, 2026.";

export const metadata: Metadata = {
  title: "KIRAKITAH GAMING 926 — eFootball Mobile Championship",
  description,
  openGraph: {
    title: "KIRAKITAH GAMING 926 — eFootball Mobile Championship",
    description,
    url: `${siteConfig.url}/esports`,
    siteName: siteConfig.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KIRAKITAH GAMING 926 — eFootball Mobile Championship",
    description,
  },
  alternates: { canonical: `${siteConfig.url}/esports` },
};

export default async function EsportsPage() {
  const tournament = await services.tournaments.getFeatured();

  if (!tournament) {
    notFound();
  }

  const allFaqs = await services.faqs.getByCategory("esports");
  const previewFaqs = esportsFaqPreview.previewQuestionIds
    .map((id) => allFaqs.find((faq) => faq.id === id))
    .filter((faq): faq is NonNullable<typeof faq> => Boolean(faq));

  return (
    <>
      <EsportsHero />
      <TournamentIntro />
      <TournamentDetails tournament={tournament} />
      <TournamentJourney />
      <Qualification />
      <KnockoutStage />
      <TournamentTechnology />
      <WatchAction />
      <MatchHighlights />
      <RulesPreview />
      <FAQPreview faqs={previewFaqs} />
      <EsportsFinalCTA />
    </>
  );
}
