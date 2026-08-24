export type DataSource = "mock" | "api";

/**
 * Client + shared data-source resolution.
 * Vercel Production always uses the real registration API (fail closed).
 * Preview / development / CI may use mock when NEXT_PUBLIC_DATA_SOURCE != api.
 */
export function getDataSource(): DataSource {
  if (process.env.VERCEL_ENV === "production") {
    return "api";
  }

  return process.env.NEXT_PUBLIC_DATA_SOURCE === "api" ? "api" : "mock";
}

export function isMockRegistrationAllowed(): boolean {
  return process.env.VERCEL_ENV !== "production";
}
