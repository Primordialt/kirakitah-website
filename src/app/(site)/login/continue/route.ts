import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuth0 } from "@/lib/auth0";
import { safeAppPath } from "@/lib/auth0-paths";
import { getDb } from "@/server/db";
import { participantAccounts } from "@/server/db/schema";
import { recordParticipantAuditEvent } from "@/server/participant/audit";
import { setParticipantSessionCookie } from "@/server/participant/auth/session";
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
  if (!email) return NextResponse.redirect(loginUrl);

  const emailNormalized = normalizeRegistrationEmail(email);
  const db = getDb();
  const [row] = await db
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

  if (!row) {
    const registerUrl = new URL("/register", url);
    registerUrl.searchParams.set("notice", "finish-profile");
    registerUrl.searchParams.set("email", email);
    return NextResponse.redirect(registerUrl);
  }

  const locked =
    Boolean(row.lockedUntil) && Date.parse(row.lockedUntil ?? "") > Date.now();
  if (!row.active || locked) {
    loginUrl.searchParams.set("error", "unavailable");
    return NextResponse.redirect(loginUrl);
  }

  const now = new Date().toISOString();
  await db
    .update(participantAccounts)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: now,
    })
    .where(eq(participantAccounts.id, row.id));

  await setParticipantSessionCookie({
    id: row.id,
    email: row.email,
    username: row.username,
    active: row.active,
  });

  await recordParticipantAuditEvent({
    eventType: "PARTICIPANT_LOGIN_SUCCESS",
    accountId: row.id,
    actor: row.id,
    metadata: { method: "auth0" },
  }).catch(() => undefined);

  return NextResponse.redirect(new URL(nextPath, url));
}
