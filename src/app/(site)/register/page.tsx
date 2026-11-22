import { RegisterEmailForm } from "@/components/features/participant/RegisterEmailForm";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Join KIRAKITAH — Register",
  description: "Create your KIRAKITAH participant account.",
  alternates: { canonical: `${siteConfig.url}/register` },
};

export default function RegisterPage() {
  return (
    <SectionShell className="py-12 md:py-16" containerClassName="max-w-2xl">
      <Suspense
        fallback={
          <p className="text-body-sm text-text-muted">Loading registration…</p>
        }
      >
        <RegisterEmailForm />
      </Suspense>
    </SectionShell>
  );
}
