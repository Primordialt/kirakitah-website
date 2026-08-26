import { ResetPasswordForm } from "@/components/features/participant/ResetPasswordForm";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Reset Password — KIRAKITAH",
  description: "Choose a new password for your KIRAKITAH participant account.",
  alternates: { canonical: `${siteConfig.url}/reset-password` },
};

export default function ResetPasswordPage() {
  return (
    <SectionShell className="py-12 md:py-16" containerClassName="max-w-2xl">
      <Suspense
        fallback={
          <p className="text-body-sm text-text-muted">Loading reset form…</p>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </SectionShell>
  );
}
