import { NotificationsClient } from "@/components/features/participant/NotificationsClient";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications — KIRAKITAH",
  robots: { index: false, follow: false },
};

export default function NotificationsPage() {
  return (
    <SectionShell className="py-12 md:py-16" containerClassName="max-w-3xl">
      <NotificationsClient />
    </SectionShell>
  );
}
