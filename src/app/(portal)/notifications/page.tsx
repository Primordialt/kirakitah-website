import { NotificationsClient } from "@/components/features/participant/NotificationsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications — KIRAKITAH Participant Portal",
  robots: { index: false, follow: false },
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}
