import { FixtureDetailClient } from "@/components/features/participant/FixtureDetailClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Match details — KIRAKITAH Participant Portal",
  robots: { index: false, follow: false },
};

export default async function FixtureDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return <FixtureDetailClient matchId={matchId} />;
}
