import { AdminChatboxPanel } from "@/components/admin/AdminChatboxPanel";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chatbox — KIRAKITAH Admin",
  robots: { index: false, follow: false },
};

export default async function AdminChatboxPage() {
  const session = await loadAdminSession("chat:moderate");
  return (
    <AdminShell session={session}>
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-h2 text-text-primary">Community Chatbox</h1>
        <p className="text-body-sm text-text-muted">
          Moderate the KIRAKITAH Community chat. Participants use the participant portal
          Chatbox.
        </p>
        <AdminChatboxPanel />
      </div>
    </AdminShell>
  );
}
