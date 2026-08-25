import {
  AboutEcosystem,
  AboutFinalCta,
  AboutHero,
  AboutPrinciples,
  HowItWorks,
  WhatWereBuilding,
  WhoWeAre,
  WhyWeExist,
} from "@/components/sections/about";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

const description =
  "Learn about KIRAKITAH — a platform built around competition, creativity, technology, community and experiences that bring people together.";

export const metadata: Metadata = {
  title: "About — KIRAKITAH",
  description,
  openGraph: {
    title: "About — KIRAKITAH",
    description,
    url: `${siteConfig.url}/about`,
    siteName: siteConfig.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About — KIRAKITAH",
    description,
  },
  alternates: { canonical: `${siteConfig.url}/about` },
};

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <WhoWeAre />
      <WhyWeExist />
      <HowItWorks />
      <AboutPrinciples />
      <WhatWereBuilding />
      <AboutEcosystem />
      <AboutFinalCta />
    </>
  );
}
