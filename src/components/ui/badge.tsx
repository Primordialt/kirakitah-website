import { cn } from "@/lib/cn";
import { type HTMLAttributes } from "react";

const badgeVariants = {
  default: "bg-surface-muted text-text-primary border-border",
  brand: "bg-brand-primary/15 text-accent border-brand-primary/30",
  accent: "bg-accent/15 text-accent border-accent/30",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  error: "bg-error/15 text-error border-error/30",
  info: "bg-info/15 text-info border-info/30",
  outline: "bg-transparent text-text-secondary border-border-strong",
} as const;

export type BadgeVariant = keyof typeof badgeVariants;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-caption font-medium",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
