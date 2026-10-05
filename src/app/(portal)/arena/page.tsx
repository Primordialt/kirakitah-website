import { ArenaDirectoryClient } from "@/components/features/arena/ArenaDirectoryClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Arena — KIRAKITAH",
  robots: { index: false, follow: false },
};

export default function ArenaPage() {
  return <ArenaDirectoryClient />;
}
