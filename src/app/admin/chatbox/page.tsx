import { AdminChatboxConsole } from "@/components/admin/AdminChatboxConsole";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chatbox — KIRAKITAH Admin",
  robots: { index: false, follow: false },
};

export default async function AdminChatboxPage() {
  const session = await loadAdminSession("chat:moderate");
  const permissions = {
    canLock: roleHasPermission(session.user.role, "chat:lock"),
    canAnnounce: roleHasPermission(session.user.role, "chat:announce"),
    canModerate: roleHasPermission(session.user.role, "chat:moderate"),
  };

  return (
    <AdminShell session={session}>
      <div className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-h2 text-text-primary">Community Chatbox</h1>
        <p className="text-body-sm text-text-muted">
          Read the live community transcript and moderate the KIRAKITAH Chatbox. Participants
          use the participant portal Chatbox.
        </p>
        <AdminChatboxConsole permissions={permissions} />
      </div>
    </AdminShell>
  );
}
