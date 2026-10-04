import { SiteShell } from "@/components/shared/site-shell/SiteShell";
import { getParticipantSessionFromCookies } from "@/server/participant";

export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getParticipantSessionFromCookies();
  const auth = session
    ? { isAuthenticated: true as const, username: session.user.username }
    : { isAuthenticated: false as const };

  return <SiteShell auth={auth}>{children}</SiteShell>;
}
