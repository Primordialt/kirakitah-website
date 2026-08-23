import type { EsportsPlatform } from "@/config/esports";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

export interface PlatformButtonsProps {
  platforms: EsportsPlatform[];
  className?: string;
}

export function PlatformButtons({ platforms, className }: PlatformButtonsProps) {
  return (
    <ul className={cn("flex flex-wrap gap-3", className)}>
      {platforms.map((platform) => (
        <li key={platform.label}>
          {platform.href ? (
            <Button
              href={platform.href}
              variant="outline"
              size="md"
              target="_blank"
              rel="noopener noreferrer"
            >
              {platform.label}
            </Button>
          ) : (
            <span
              className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-button text-text-muted"
              aria-disabled="true"
            >
              {platform.label}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
