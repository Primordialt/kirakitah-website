import {
  EsportsHero,
  TournamentIntro,
  TournamentDetails,
  TournamentJourney,
  Qualification,
  WhyEnter,
  WhatYouNeed,
  WhoCanEnter,
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
  "Compete in KIRAKITAH Gaming 926, the inaugural eFootball Mobile championship. 128 players, 32 qualifiers, 1 champion and a US$100 grand prize.";

export const metadata: Metadata = {
  title: "KIRAKITAH Gaming 926 | eFootball Mobile Championship",
  description,
  openGraph: {
    title: "KIRAKITAH Gaming 926 | eFootball Mobile Championship",
    description,
    url: `${siteConfig.url}/esports`,
    siteName: siteConfig.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KIRAKITAH Gaming 926 | eFootball Mobile Championship",
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
      <WhyEnter />
      <WhatYouNeed />
      <WhoCanEnter />
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
