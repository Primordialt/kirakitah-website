const DEFAULT_NEXT_PATH = "/dashboard";

export function isAuth0LoginEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH0_ENABLED === "true";
}

/** Relative in-app path only. Rejects protocol-relative and backslash paths. */
export function safeAppPath(
  value: string | null | undefined,
  fallback = DEFAULT_NEXT_PATH,
): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) {
    return fallback;
  }
  return value;
}

export function auth0ContinuePath(nextPath?: string | null): string {
  const next = safeAppPath(nextPath, "");
  if (!next) return "/login/continue";
  return `/login/continue?next=${encodeURIComponent(next)}`;
}

export function auth0LoginPath(
  nextPath?: string | null,
  screen: "login" | "signup" = "login",
): string {
  const params = new URLSearchParams();
  if (screen === "signup") params.set("screen_hint", "signup");
  params.set("returnTo", auth0ContinuePath(nextPath));
  return `/auth/login?${params.toString()}`;
}
