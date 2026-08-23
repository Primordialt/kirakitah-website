import { LegalDocument } from "@/components/shared/legal/LegalDocument";
import { privacyPolicy } from "@/config/legal";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

const description =
  "How KIRAKITAH collects, uses and protects personal information when you use the website or participate in programmes and competitions.";

export const metadata: Metadata = {
  title: "Privacy Policy — KIRAKITAH",
  description,
  openGraph: {
    title: "Privacy Policy — KIRAKITAH",
    description,
    url: `${siteConfig.url}/privacy`,
    siteName: siteConfig.name,
    type: "website",
  },
  alternates: { canonical: `${siteConfig.url}/privacy` },
};

export default function PrivacyPage() {
  return <LegalDocument document={privacyPolicy} />;
}
