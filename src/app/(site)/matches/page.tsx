import { MatchesClient } from "@/components/features/participant/MatchesClient";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Matches — KIRAKITAH",
  robots: { index: false, follow: false },
};

export default function MatchesPage() {
  return (
    <SectionShell className="py-12 md:py-16" containerClassName="max-w-3xl">
      <MatchesClient />
    </SectionShell>
  );
}
