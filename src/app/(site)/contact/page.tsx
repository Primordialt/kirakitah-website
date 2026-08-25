import { ContactForm } from "@/components/features/contact/ContactForm";
import { Reveal, SectionShell } from "@/components/sections/home";
import { contactPageContent } from "@/config/pages";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

const description =
  "Contact KIRAKITAH for general enquiries, gaming and eSports questions, partnerships, collaborations, media requests and community information.";

export const metadata: Metadata = {
  title: "Contact — KIRAKITAH",
  description,
  openGraph: {
    title: "Contact — KIRAKITAH",
    description,
    url: `${siteConfig.url}/contact`,
    siteName: siteConfig.name,
    type: "website",
  },
  alternates: { canonical: `${siteConfig.url}/contact` },
};

export default function ContactPage() {
  const { hero } = contactPageContent;

  return (
    <>
      <SectionShell className="border-b border-border pt-12 md:pt-16">
        <Reveal>
          <p className="text-label font-semibold tracking-[0.15em] text-accent">
            {hero.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl text-display text-text-primary">
            {hero.headline}
          </h1>
          <p className="mt-6 max-w-2xl text-body-lg text-text-secondary">
            {hero.supportingCopy}
          </p>
        </Reveal>
      </SectionShell>

      <SectionShell className="pb-20">
        <Reveal>
          <div className="mx-auto max-w-xl">
            <ContactForm />
          </div>
        </Reveal>
      </SectionShell>
    </>
  );
}
