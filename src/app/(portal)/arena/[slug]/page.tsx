import { ArenaPlayClient } from "@/components/features/arena/ArenaPlayClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arena — KIRAKITAH",
  robots: { index: false, follow: false },
};

export default async function ArenaSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ArenaPlayClient slug={slug} />;
}
