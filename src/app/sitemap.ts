import { siteConfig } from "@/config/site";
import { buildPublicSitemap } from "@/lib/seo/public-sitemap";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildPublicSitemap(siteConfig.url);
}
