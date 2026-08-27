import { DashboardClient } from "@/components/features/participant/DashboardClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — KIRAKITAH Participant Portal",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <DashboardClient />;
}
