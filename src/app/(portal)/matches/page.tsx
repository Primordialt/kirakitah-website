import { MatchesClient } from "@/components/features/participant/MatchesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Matches — KIRAKITAH Participant Portal",
  robots: { index: false, follow: false },
};

export default function MatchesPage() {
  return <MatchesClient />;
}
