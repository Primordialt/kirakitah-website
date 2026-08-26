import { RegisterPasswordForm } from "@/components/features/participant/RegisterPasswordForm";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create password — KIRAKITAH",
  robots: { index: false, follow: false },
};

export default function RegisterPasswordPage() {
  return (
    <SectionShell className="py-12 md:py-16" containerClassName="max-w-2xl">
      <RegisterPasswordForm />
    </SectionShell>
  );
}
