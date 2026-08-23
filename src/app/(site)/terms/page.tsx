import { LegalDocument } from "@/components/shared/legal/LegalDocument";
import { termsAndConditions } from "@/config/legal";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

const description =
  "KIRAKITAH website and competition terms governing use of the platform and participation in KIRAKITAH programmes.";

export const metadata: Metadata = {
  title: "Terms & Conditions — KIRAKITAH",
  description,
  openGraph: {
    title: "Terms & Conditions — KIRAKITAH",
    description,
    url: `${siteConfig.url}/terms`,
    siteName: siteConfig.name,
    type: "website",
  },
  alternates: { canonical: `${siteConfig.url}/terms` },
};

export default function TermsPage() {
  return <LegalDocument document={termsAndConditions} />;
}
