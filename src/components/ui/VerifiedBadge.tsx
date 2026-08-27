import { cn } from "@/lib/cn";

export type VerifiedBadgeProps = {
  /** When false, renders nothing. Must come from server-authoritative profile status. */
  verified: boolean;
  className?: string;
  size?: "sm" | "md";
};

/**
 * Purple verified badge for PROFILE VERIFIED participants only.
 * Do not use for email-verified, selected, or qualified states.
 */
export function VerifiedBadge({
  verified,
  className,
  size = "sm",
}: VerifiedBadgeProps) {
  if (!verified) return null;

  const dim = size === "md" ? "h-5 w-5" : "h-4 w-4";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-brand-primary text-white",
        dim,
        className,
      )}
      title="Verified participant"
      aria-label="Verified participant"
      role="img"
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className={size === "md" ? "h-3 w-3" : "h-2.5 w-2.5"}
        fill="none"
      >
        <path
          d="M3.5 8.2 6.4 11l6.1-6.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
