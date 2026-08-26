import { ForgotPasswordForm } from "@/components/features/participant/ForgotPasswordForm";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password — KIRAKITAH",
  description: "Request a password reset link for your KIRAKITAH participant account.",
  alternates: { canonical: `${siteConfig.url}/forgot-password` },
};

export default function ForgotPasswordPage() {
  return (
    <SectionShell className="py-12 md:py-16" containerClassName="max-w-2xl">
      <ForgotPasswordForm />
    </SectionShell>
  );
}
