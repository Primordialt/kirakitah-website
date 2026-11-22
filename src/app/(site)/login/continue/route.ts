import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuth0 } from "@/lib/auth0";
import { safeAppPath } from "@/lib/auth0-paths";
import { getDb } from "@/server/db";
import { participantAccounts } from "@/server/db/schema";
import {
  createSocialParticipantAccount,
  providerEmailIsVerified,
  socialProviderFromSubject,
  startSocialParticipantSession,
} from "@/server/participant/auth/social";
import { normalizeRegistrationEmail } from "@/server/verification/email/pre-registration";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nextPath = safeAppPath(url.searchParams.get("next"));
  const loginUrl = new URL("/login", url);
  loginUrl.searchParams.set("next", nextPath);

  const auth0 = getAuth0();
  if (!auth0) return NextResponse.redirect(loginUrl);

  const session = await auth0.getSession();
  const email = session?.user.email;
  const provider = socialProviderFromSubject(session?.user.sub);
  if (!email || !provider) return NextResponse.redirect(loginUrl);
  if (!providerEmailIsVerified(session?.user.email_verified)) {
    return NextResponse.redirect(loginUrl);
  }

  const emailNormalized = normalizeRegistrationEmail(email);
  const db = getDb();
  const [existing] = await db
    .select({
      id: participantAccounts.id,
      email: participantAccounts.email,
      username: participantAccounts.username,
      active: participantAccounts.active,
      lockedUntil: participantAccounts.lockedUntil,
    })
    .from(participantAccounts)
    .where(eq(participantAccounts.emailNormalized, emailNormalized))
    .limit(1);

  const locked =
    Boolean(existing?.lockedUntil) &&
    Date.parse(existing?.lockedUntil ?? "") > Date.now();
  if (existing && (!existing.active || locked)) {
    loginUrl.searchParams.set("error", "unavailable");
    return NextResponse.redirect(loginUrl);
  }

  const user =
    existing ??
    (await createSocialParticipantAccount({
      email: emailNormalized,
      provider,
    }));

  await startSocialParticipantSession(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      active: user.active,
    },
    provider,
  );

  return NextResponse.redirect(new URL(nextPath, url));
}
