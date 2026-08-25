import { Reveal, SectionShell } from "@/components/sections/home";
import type { LegalDocumentConfig } from "@/config/legal";

export interface LegalDocumentProps {
  document: LegalDocumentConfig;
}

export function LegalDocument({ document }: LegalDocumentProps) {
  return (
    <>
      <SectionShell className="border-b border-border pt-12 md:pt-16">
        <Reveal>
          <h1 className="text-display text-text-primary">{document.title}</h1>
          <p className="mt-4 text-caption text-text-muted">
            Last Updated: {document.lastUpdated}
          </p>
        </Reveal>
      </SectionShell>

      <SectionShell className="pb-20">
        <div className="mx-auto max-w-3xl space-y-10">
          {document.introduction?.map((paragraph) => (
            <p key={paragraph.slice(0, 32)} className="text-body-lg text-text-secondary">
              {paragraph}
            </p>
          ))}

          {document.sections.map((section, index) => (
            <Reveal key={section.id} delay={index * 40}>
              <section aria-labelledby={`legal-${section.id}`}>
                <h2
                  id={`legal-${section.id}`}
                  className="text-h3 text-text-primary"
                >
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4">
                  {section.content.map((paragraph) => (
                    <p key={paragraph.slice(0, 32)} className="text-body text-text-secondary">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            </Reveal>
          ))}

          <p className="border-t border-border pt-8 text-body-sm text-text-muted">
            {document.disclaimer}
          </p>
        </div>
      </SectionShell>
    </>
  );
}
