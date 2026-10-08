import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Arena rules — KIRAKITAH",
  robots: { index: false, follow: false },
};

export default function ArenaRulesPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-4 py-6 text-body-sm text-text-secondary">
      <Link href="/arena" className="text-accent hover:underline">
        ← Arena
      </Link>
      <h1 className="text-h2 text-text-primary">How to play</h1>
      <p>Pick an arena, watch the clock, and be first.</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Quickfire: choose A, B, C, or D.</li>
        <li>TypeRush: type the line exactly, then submit.</li>
        <li>Each response costs the entry amount shown on the arena card.</li>
        <li>You can send more than one response. Each one costs the entry amount.</li>
        <li>One round. One winner.</li>
        <li>If nobody wins before the clock runs out, the round ends and the next one begins.</li>
      </ul>
    </article>
  );
}
