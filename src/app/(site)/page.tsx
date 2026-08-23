import {
  BrandIntro,
  Community,
  Ecosystem,
  FeaturedInitiative,
  FinalCTA,
  Hero,
  Principles,
  Stories,
} from "@/components/sections/home";
import { siteConfig } from "@/config/site";
import { services } from "@/services";
import type { Metadata } from "next";

const description =
  "KIRAKITAH is a growing platform for competition, creativity, technology, community and experiences. Explore what we're building.";

export const metadata: Metadata = {
  title: "KIRAKITAH | Play. Compete. Create.",
  description,
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: "KIRAKITAH | Play. Compete. Create.",
    description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: "website",
    locale: "en",
  },
  twitter: {
    card: "summary_large_image",
    title: "KIRAKITAH | Play. Compete. Create.",
    description,
  },
};

export default async function HomePage() {
  const stories = await services.stories.getFeatured();

  return (
    <>
      <Hero />
      <BrandIntro />
      <Ecosystem />
      <FeaturedInitiative />
      <Principles />
      <Community />
      <Stories stories={stories} />
      <FinalCTA />
    </>
  );
}
