import { RegisterUsernameForm } from "@/components/features/participant/RegisterUsernameForm";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create username — KIRAKITAH",
  robots: { index: false, follow: false },
};

export default function RegisterUsernamePage() {
  return (
    <SectionShell className="py-12 md:py-16" containerClassName="max-w-2xl">
      <RegisterUsernameForm />
    </SectionShell>
  );
}
