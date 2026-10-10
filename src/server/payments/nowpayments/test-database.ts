/**
 * The wallet concurrency file runs only against a disposable local Postgres.
 * Hosted Neon and Production URLs are refused, including in CI.
 */
export function isDisposableWalletTestDatabase(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}
