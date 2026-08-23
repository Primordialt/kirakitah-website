/**
 * Resolves the public site URL for metadata, canonical links, and sitemaps.
 * Prefers NEXT_PUBLIC_SITE_URL, then Vercel's deployment URL, then localhost.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;

  const vercelUrl = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercelUrl) return `https://${vercelUrl}`;

  return "http://localhost:3000";
}
