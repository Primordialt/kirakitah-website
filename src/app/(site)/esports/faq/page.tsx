import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import { siteConfig } from "@/config/site";
import { services } from "@/services";
import type { Metadata } from "next";

const description =
  "Frequently asked questions about KIRAKITAH Gaming 2026 — eligibility, registration, qualification, prizes and more.";

export const metadata: Metadata = {
  title: "KIRAKITAH Gaming 2026 — FAQ",
  description,
  openGraph: {
    title: "KIRAKITAH Gaming 2026 — FAQ",
    description,
    url: `${siteConfig.url}/esports/faq`,
    siteName: siteConfig.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KIRAKITAH Gaming 2026 — FAQ",
    description,
  },
  alternates: { canonical: `${siteConfig.url}/esports/faq` },
};

export default async function EsportsFaqPage() {
  const faqs = await services.faqs.getByCategory("esports");

  return (
    <SectionShell className="py-12 md:py-20" containerClassName="max-w-3xl">
      <div className="mb-10">
        <p className="text-label font-semibold tracking-[0.2em] text-accent">
          KIRAKITAH GAMING 2026
        </p>
        <h1 className="mt-3 text-h1 text-text-primary">FAQ</h1>
        <p className="mt-4 text-body-lg text-text-secondary">
          Answers to common questions about the inaugural KIRAKITAH Gaming
          championship.
        </p>
      </div>
      <Accordion type="single" collapsible>
        {faqs.map((faq) => (
          <AccordionItem key={faq.id} value={faq.id}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </SectionShell>
  );
}
