import { FixturesClient } from "@/components/features/participant/FixturesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fixtures — KIRAKITAH Participant Portal",
  robots: { index: false, follow: false },
};

export default function FixturesPage() {
  return <FixturesClient />;
}
