import { Auth0Client } from "@auth0/nextjs-auth0/server";

let client: Auth0Client | undefined;

export function isAuth0Configured(): boolean {
  return Boolean(
    process.env.AUTH0_DOMAIN &&
      process.env.AUTH0_CLIENT_ID &&
      process.env.AUTH0_CLIENT_SECRET &&
      process.env.AUTH0_SECRET &&
      process.env.APP_BASE_URL,
  );
}

export function getAuth0(): Auth0Client | null {
  if (!isAuth0Configured()) return null;
  client ??= new Auth0Client({
    signInReturnToPath: "/login/continue",
  });
  return client;
}
