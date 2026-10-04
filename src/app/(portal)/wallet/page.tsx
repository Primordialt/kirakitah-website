import { WalletClient } from "@/components/features/wallet/WalletClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wallet — KIRAKITAH",
  robots: { index: false, follow: false },
};

export default function WalletPage() {
  return <WalletClient />;
}
