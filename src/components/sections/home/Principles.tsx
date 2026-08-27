import { homepagePrinciples } from "@/config/homepage";
import { Reveal } from "./Reveal";
import { SectionShell } from "./SectionShell";

export function Principles() {
  const { heading, items } = homepagePrinciples;

  return (
    <SectionShell ariaLabelledby="principles-heading">
      <Reveal>
        <h2 id="principles-heading" className="text-h2 text-text-primary">
          {heading}
        </h2>
      </Reveal>
      <ol className="mt-10 flex flex-col gap-4 md:gap-0">
        {items.map((item, index) => (
          <li key={item.id} className="border-t border-border py-6 md:py-8">
            <Reveal delay={index * 60}>
              <div className="group grid gap-3 md:grid-cols-[4rem_1fr_1.5fr] md:items-baseline md:gap-8">
                <span
                  className="text-h3 font-bold text-brand-primary/40 transition-standard group-hover:text-brand-primary/70"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-h4 text-text-primary">{item.title}</h3>
                <p className="text-body text-text-secondary">{item.description}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}
