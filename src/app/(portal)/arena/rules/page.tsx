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
      <h1 className="text-h2 text-text-primary">Arena rules</h1>
      <p>
        KIRAKITAH Arena is a paid competitive feature using KK PTS (1 KK = 1 USDT). It is not part
        of KG926 tournament qualification. This feature is not a statement of legal approval.
        Deposits and withdrawals stay pending until a payment provider and compliance review are in
        place.
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Every accepted response costs 0.5 KK, whether it is correct or not.</li>
        <li>Multiple responses in the same round are allowed. Each one is charged and counted.</li>
        <li>A round is valid only when at least 10 charged responses are accepted.</li>
        <li>Presence in the Arena does not count. Unique players are not the threshold.</li>
        <li>The first valid correct response wins, but only if the round reaches 10 responses.</li>
        <li>The winner receives 3 KK once. Extra correct responses do not pay again.</li>
        <li>If the timer ends with fewer than 10 charged responses, the round is invalid and no prize is paid.</li>
        <li>If 10 or more responses are accepted and none are correct, there is no winner and no prize.</li>
        <li>The next round starts after a 10-second countdown.</li>
        <li>The server decides timing, correctness, winner, and wallet balance.</li>
        <li>Copy, paste, and text selection are disabled on challenge content. Browsers cannot fully block screenshots.</li>
      </ul>
    </article>
  );
}
