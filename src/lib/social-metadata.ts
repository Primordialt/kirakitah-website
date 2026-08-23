import { brandAssets } from "@/config/brand";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

/** Absolute purple brand mark URL for Open Graph / Twitter previews. */
export function getSocialLogoUrl(): string {
  return new URL(brandAssets.socialLogo.src, siteConfig.url).toString();
}

export function getDefaultSocialImages(): NonNullable<
  NonNullable<Metadata["openGraph"]>["images"]
> {
  return [
    {
      url: getSocialLogoUrl(),
      width: brandAssets.socialLogo.width,
      height: brandAssets.socialLogo.height,
      alt: brandAssets.socialLogo.alt,
      type: "image/png",
    },
  ];
}

export function withSocialMetadata(
  metadata: Metadata,
): Metadata {
  const images = getDefaultSocialImages();

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: metadata.openGraph?.images ?? images,
    },
    twitter: {
      card: "summary_large_image",
      ...metadata.twitter,
      images: metadata.twitter && "images" in metadata.twitter && metadata.twitter.images
        ? metadata.twitter.images
        : [getSocialLogoUrl()],
    },
  };
}
