import { brandAssets, type BrandAssetTone } from "@/config/brand";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import Link from "next/link";

export interface BrandLogoProps {
  variant?: "full" | "mark";
  tone?: BrandAssetTone;
  href?: string;
  className?: string;
  imageClassName?: string;
  "aria-current"?: "page" | boolean;
}

export function BrandLogo({
  variant = "full",
  tone = "brand",
  href = "/",
  className,
  imageClassName,
  "aria-current": ariaCurrent,
}: BrandLogoProps) {
  const asset =
    variant === "mark"
      ? tone === "white"
        ? brandAssets.logoMarkWhite
        : brandAssets.logoMark
      : tone === "white"
        ? brandAssets.logoWhite
        : brandAssets.logo;

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center",
        "transition-standard transition-opacity hover:opacity-90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm",
        className,
      )}
      aria-label={`${siteConfig.brandName} home`}
      aria-current={ariaCurrent || undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={asset.src}
        alt=""
        width={asset.width}
        height={asset.height}
        aria-hidden="true"
        className={cn(
          variant === "mark" ? "h-8 w-8" : "h-8 w-auto md:h-9",
          imageClassName,
        )}
      />
    </Link>
  );
}
