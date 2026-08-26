import { LoginForm } from "@/components/features/participant/LoginForm";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Login — KIRAKITAH",
  description: "Sign in to your KIRAKITAH participant account.",
  alternates: { canonical: `${siteConfig.url}/login` },
};

export default function LoginPage() {
  return (
    <SectionShell className="py-12 md:py-16" containerClassName="max-w-2xl">
      <Suspense
        fallback={
          <p className="text-body-sm text-text-muted">Loading login…</p>
        }
      >
        <LoginForm />
      </Suspense>
    </SectionShell>
  );
}
