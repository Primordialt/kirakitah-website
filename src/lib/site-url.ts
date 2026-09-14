const CANONICAL_PRODUCTION_URL = "https://www.kirakitah.com";
const LOCAL_DEV_URL = "http://localhost:3000";

function normalizeSiteUrl(url: string): string {
  const trimmed = url.replace(/\/$/, "");
  if (trimmed === "https://kirakitah.com" || trimmed === "http://kirakitah.com") {
    return CANONICAL_PRODUCTION_URL;
  }
  return trimmed;
}

function isValidAbsoluteHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveExplicitSiteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;

  const normalized = normalizeSiteUrl(raw);
  return isValidAbsoluteHttpUrl(normalized) ? normalized : null;
}

/**
 * Resolves the public site URL for metadata, canonical links, and sitemaps.
 * Prefers a valid NEXT_PUBLIC_SITE_URL, then production canonical, then Vercel preview URL.
 */
export function getSiteUrl(): string {
  const explicit = resolveExplicitSiteUrl();
  if (explicit) return explicit;

  if (process.env.VERCEL_ENV === "production") {
    return CANONICAL_PRODUCTION_URL;
  }

  const vercelUrl = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercelUrl) {
    const candidate = `https://${vercelUrl}`;
    if (isValidAbsoluteHttpUrl(candidate)) return candidate;
  }

  return LOCAL_DEV_URL;
}
