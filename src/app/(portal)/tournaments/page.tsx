import { TournamentsClient } from "@/components/features/participant/TournamentsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tournaments — KIRAKITAH Participant Portal",
  robots: { index: false, follow: false },
};

export default function TournamentsPage() {
  return <TournamentsClient />;
}
