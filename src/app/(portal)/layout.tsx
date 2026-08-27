import { ParticipantPortalShell } from "@/components/features/participant/portal/ParticipantPortalShell";
import {
  getParticipantSessionFromCookies,
  requireParticipantSession,
} from "@/server/participant";
import { getParticipantProfile } from "@/server/participant/profile/service";

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let identity: { username: string; profileVerified: boolean } | null = null;

  try {
    const session = requireParticipantSession(
      await getParticipantSessionFromCookies(),
    );
    let profileVerified = false;
    try {
      const profile = await getParticipantProfile(session.user.id);
      profileVerified = profile.status === "verified";
    } catch {
      profileVerified = false;
    }
    identity = {
      username: session.user.username,
      profileVerified,
    };
  } catch {
    identity = null;
  }

  return (
    <ParticipantPortalShell identity={identity}>
      {children}
    </ParticipantPortalShell>
  );
}
