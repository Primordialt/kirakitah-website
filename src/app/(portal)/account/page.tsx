import { AccountClient } from "@/components/features/participant/AccountClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account — KIRAKITAH Participant Portal",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountClient />;
}
