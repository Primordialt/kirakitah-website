import { cn } from "@/lib/cn";
import { homepageEcosystem, type EcosystemItem } from "@/config/homepage";
import Link from "next/link";
import { Reveal } from "./Reveal";
import { SectionShell } from "./SectionShell";

function EcosystemCard({
  item,
  className,
}: {
  item: EcosystemItem;
  className?: string;
}) {
  const Icon = item.icon;
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span className="inline-flex size-10 items-center justify-center rounded-lg border border-border-interactive/50 bg-brand-primary/10 text-accent">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        {item.featured && (
          <span className="text-caption font-medium text-accent">Featured</span>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <h3 className="text-h4 text-text-primary">{item.title}</h3>
        <p className="text-body-sm text-text-secondary">{item.description}</p>
      </div>
    </>
  );

  const cardClass = cn(
    "group flex h-full flex-col rounded-xl border border-border bg-surface p-6",
    "transition-standard transition-colors",
    item.href &&
      "hover:border-border-interactive hover:bg-surface-elevated focus-within:border-border-interactive",
    item.featured && "border-border-interactive/60 bg-surface-elevated shadow-brand-glow",
    className,
  );

  if (item.href) {
    return (
      <Link href={item.href} className={cardClass}>
        {content}
      </Link>
    );
  }

  return (
    <div className={cn(cardClass, "opacity-90")}>{content}</div>
  );
}

export function Ecosystem() {
  const { heading, items } = homepageEcosystem;
  const featured = items.find((item) => item.featured);
  const supporting = items.filter((item) => !item.featured);

  return (
    <SectionShell ariaLabelledby="ecosystem-heading">
      <Reveal>
        <h2 id="ecosystem-heading" className="text-h2 text-text-primary">
          {heading}
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {featured && (
          <Reveal className="md:col-span-2 lg:row-span-2" delay={50}>
            <EcosystemCard item={featured} className="min-h-[220px] lg:min-h-full lg:p-8" />
          </Reveal>
        )}
        {supporting.map((item, index) => (
          <Reveal key={item.id} delay={100 + index * 50}>
            <EcosystemCard item={item} />
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
