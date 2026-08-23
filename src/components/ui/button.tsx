"use client";

import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import {
  type ButtonHTMLAttributes,
  type AnchorHTMLAttributes,
  forwardRef,
} from "react";

const variantStyles = {
  primary:
    "bg-brand-primary text-white hover:bg-brand-primary-hover active:bg-brand-primary-active shadow-sm hover:shadow-brand-glow disabled:opacity-50 disabled:shadow-none disabled:hover:bg-brand-primary",
  secondary:
    "bg-surface-elevated text-text-primary border border-border hover:bg-surface-interactive hover:border-border-strong active:bg-surface-muted disabled:opacity-50",
  ghost:
    "bg-transparent text-text-primary hover:bg-surface-muted active:bg-surface-elevated disabled:opacity-50",
  outline:
    "bg-transparent text-text-primary border border-border-interactive hover:bg-brand-primary/10 hover:border-brand-primary active:bg-brand-primary/20 disabled:opacity-50",
  destructive:
    "bg-error/15 text-error border border-error/30 hover:bg-error/25 active:bg-error/35 disabled:opacity-50",
  link: "bg-transparent text-accent underline-offset-4 hover:underline active:text-accent/80 disabled:opacity-50 p-0 h-auto",
} as const;

const sizeStyles = {
  sm: "h-8 px-3 text-button gap-1.5 rounded-md",
  md: "h-10 px-4 text-button gap-2 rounded-lg",
  lg: "h-12 px-6 text-button gap-2.5 rounded-lg",
  icon: "h-10 w-10 p-0 rounded-lg",
} as const;

export type ButtonVariant = keyof typeof variantStyles;
export type ButtonSize = keyof typeof sizeStyles;

type BaseButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconOnly?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
};

type ButtonAsButton = BaseButtonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = BaseButtonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export const Button = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    icon,
    iconOnly,
    children,
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const resolvedSize = iconOnly ? "icon" : size;

  const classes = cn(
    "inline-flex items-center justify-center font-sans transition-standard transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus",
    "disabled:pointer-events-none",
    variantStyles[variant],
    variant !== "link" && sizeStyles[resolvedSize],
    className,
  );

  const content = (
    <>
      {loading && (
        <Loader2
          className="size-4 shrink-0 animate-spin"
          aria-hidden="true"
        />
      )}
      {!loading && icon && (
        <span className="inline-flex shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {!iconOnly && children}
      {iconOnly && !loading && (
        <span className="sr-only">{children}</span>
      )}
    </>
  );

  if ("href" in props && props.href) {
    const { href, ...linkProps } = props;
    if (isDisabled) {
      return (
        <span
          className={cn(classes, "pointer-events-none opacity-50")}
          aria-disabled="true"
        >
          {content}
        </span>
      );
    }
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        {...linkProps}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
});
