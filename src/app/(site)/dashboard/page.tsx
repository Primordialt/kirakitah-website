import { DashboardClient } from "@/components/features/participant/DashboardClient";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — KIRAKITAH",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <SectionShell className="py-12 md:py-16" containerClassName="max-w-3xl">
      <DashboardClient />
    </SectionShell>
  );
}
