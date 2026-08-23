import type { FAQ } from "@/domain/faq";
import { esportsFaqPreview } from "@/config/esports";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
} from "@/components/ui";
import { SectionShell } from "./SectionShell";

export interface FAQPreviewProps {
  faqs: FAQ[];
}

export function FAQPreview({ faqs }: FAQPreviewProps) {
  return (
    <SectionShell ariaLabelledby="faq-preview-heading">
      <div className="flex flex-col gap-8">
        <h2
          id="faq-preview-heading"
          className="text-h2 text-text-primary"
        >
          {esportsFaqPreview.title}
        </h2>
        <Accordion type="single" collapsible defaultValue={faqs[0]?.id}>
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <Button href={esportsFaqPreview.cta.href} variant="outline" size="lg">
          {esportsFaqPreview.cta.label}
        </Button>
      </div>
    </SectionShell>
  );
}
