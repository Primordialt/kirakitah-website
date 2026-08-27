import { AccountClient } from "@/components/features/participant/AccountClient";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account — KIRAKITAH",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <SectionShell className="py-12 md:py-16" containerClassName="max-w-3xl">
      <AccountClient />
    </SectionShell>
  );
}
