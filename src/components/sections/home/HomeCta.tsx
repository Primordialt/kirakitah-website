import { cn } from "@/lib/cn";
import { Button, type ButtonVariant } from "@/components/ui";
import type { HomepageCta } from "@/config/homepage";

export interface HomeCtaProps {
  cta: HomepageCta;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function HomeCta({
  cta,
  variant = "primary",
  size = "lg",
  className,
}: HomeCtaProps) {
  if (!cta.href) {
    return (
      <Button
        variant={variant === "primary" ? "secondary" : variant}
        size={size}
        disabled
        className={cn("opacity-70", className)}
        aria-disabled="true"
        title="Coming soon"
      >
        {cta.label}
      </Button>
    );
  }

  return (
    <Button href={cta.href} variant={variant} size={size} className={className}>
      {cta.label}
    </Button>
  );
}
