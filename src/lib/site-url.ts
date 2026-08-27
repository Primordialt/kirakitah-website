const CANONICAL_PRODUCTION_URL = "https://www.kirakitah.com";

function normalizeSiteUrl(url: string): string {
  const trimmed = url.replace(/\/$/, "");
  if (trimmed === "https://kirakitah.com" || trimmed === "http://kirakitah.com") {
    return CANONICAL_PRODUCTION_URL;
  }
  return trimmed;
}

/**
 * Resolves the public site URL for metadata, canonical links, and sitemaps.
 * Prefers NEXT_PUBLIC_SITE_URL, then production canonical, then Vercel preview URL.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return normalizeSiteUrl(explicit);

  if (process.env.VERCEL_ENV === "production") {
    return CANONICAL_PRODUCTION_URL;
  }

  const vercelUrl = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}
