import { cn } from "@/lib/cn";
import type { Initiative, InitiativeCategory } from "@/domain/initiative";
import {
  getInitiativeCategoryLabel,
  getInitiativeStatusLabel,
  getInitiativeStatusVariant,
  isInitiativeNavigable,
} from "@/lib/initiative-display";
import { Badge } from "@/components/ui";
import Link from "next/link";

const categoryGradients: Record<InitiativeCategory, string> = {
  competition:
    "from-brand-primary/40 via-brand-primary/10 to-transparent border-brand-primary/30",
  technology:
    "from-accent-secondary/20 via-transparent to-transparent border-accent-secondary/20",
  creativity: "from-accent/25 via-transparent to-transparent border-accent/25",
  community: "from-info/20 via-transparent to-transparent border-info/20",
  experiences:
    "from-brand-primary/20 via-accent-secondary/10 to-transparent border-border-interactive/30",
  culture: "from-surface-muted via-transparent to-transparent border-border",
};

function InitiativeVisual({
  initiative,
  featured,
}: {
  initiative: Initiative;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-gradient-to-br",
        categoryGradients[initiative.category],
        featured ? "min-h-44 md:min-h-full md:min-w-[40%]" : "min-h-36",
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[32px_32px] opacity-50" />
      {featured && initiative.status === "active" && (
        <p className="absolute bottom-4 left-4 text-caption font-medium text-text-secondary">
          Current flagship initiative
        </p>
      )}
    </div>
  );
}

function InitiativeCardContent({ initiative }: { initiative: Initiative }) {
  const statusLabel = getInitiativeStatusLabel(initiative.status);

  return (
    <div className="flex flex-col gap-3 p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {getInitiativeCategoryLabel(initiative.category)}
        </Badge>
        <Badge variant={getInitiativeStatusVariant(initiative.status)}>
          <span className="sr-only">Status: </span>
          {statusLabel}
        </Badge>
      </div>
      <div>
        <h3 className="text-h4 text-text-primary">{initiative.name}</h3>
        <p className="mt-1 text-body-sm text-text-secondary">
          {initiative.tagline}
        </p>
      </div>
      <p className="text-body-sm text-text-muted">{initiative.description}</p>
      {initiative.cta ? (
        <span className="text-label font-semibold text-accent group-hover:text-text-primary transition-standard">
          {initiative.cta.label} →
        </span>
      ) : initiative.status === "in-development" ||
        initiative.status === "exploring" ||
        initiative.status === "coming-next" ? (
        <span className="text-caption text-text-muted">
          {getInitiativeStatusLabel(initiative.status)}
        </span>
      ) : null}
    </div>
  );
}

export interface InitiativeCardProps {
  initiative: Initiative;
  featured?: boolean;
  className?: string;
}

export function InitiativeCard({
  initiative,
  featured = initiative.featured,
  className,
}: InitiativeCardProps) {
  const href = initiative.cta?.href ?? `/initiatives/${initiative.slug}`;
  const isInteractive = isInitiativeNavigable(initiative.status);

  const wrapperClass = cn(
    "group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface",
    "transition-standard transition-colors",
    isInteractive && "hover:border-border-interactive hover:bg-surface-elevated",
    featured && "border-border-interactive/50 shadow-brand-glow lg:flex-row lg:items-stretch",
    className,
  );

  const inner = featured ? (
    <div className="flex flex-col lg:flex-row lg:items-stretch">
      <InitiativeVisual initiative={initiative} featured={featured} />
      <div className="flex flex-1 flex-col justify-center">
        <InitiativeCardContent initiative={initiative} />
      </div>
    </div>
  ) : (
    <>
      <InitiativeVisual initiative={initiative} featured={featured} />
      <InitiativeCardContent initiative={initiative} />
    </>
  );

  if (isInteractive && href) {
    return (
      <Link href={href} className={wrapperClass}>
        {inner}
      </Link>
    );
  }

  return (
    <article className={cn(wrapperClass, "opacity-90")}>{inner}</article>
  );
}

export interface InitiativeCardGridProps {
  initiatives: Initiative[];
}

export function InitiativeCardGrid({ initiatives }: InitiativeCardGridProps) {
  const sorted = [...initiatives].sort((a, b) => a.sortOrder - b.sortOrder);
  const featured = sorted.find((i) => i.featured && i.status === "active");
  const others = sorted.filter((i) => i !== featured);

  return (
    <div className="flex flex-col gap-8">
      {featured && <InitiativeCard initiative={featured} featured />}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {others.map((initiative) => (
          <InitiativeCard key={initiative.id} initiative={initiative} />
        ))}
      </div>
    </div>
  );
}
