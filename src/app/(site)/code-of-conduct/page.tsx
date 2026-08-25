import { LegalDocument } from "@/components/shared/legal/LegalDocument";
import { codeOfConduct } from "@/config/legal";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

const description =
  "KIRAKITAH Code of Conduct — expectations for respectful, fair and safe participation across all KIRAKITAH programmes and experiences.";

export const metadata: Metadata = {
  title: "Code of Conduct — KIRAKITAH",
  description,
  openGraph: {
    title: "Code of Conduct — KIRAKITAH",
    description,
    url: `${siteConfig.url}/code-of-conduct`,
    siteName: siteConfig.name,
    type: "website",
  },
  alternates: { canonical: `${siteConfig.url}/code-of-conduct` },
};

export default function CodeOfConductPage() {
  return <LegalDocument document={codeOfConduct} />;
}
