import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getAdminAuthProvider } from "@/server/admin/auth";
import { serverEnv } from "@/server/env";

export default function AdminLoginPage() {
  const provider = getAdminAuthProvider();
  let mode: "mock" | "database" | "unavailable" = "unavailable";

  if (provider.providerId === "database") {
    mode = "database";
  } else if (
    provider.providerId === "mock" &&
    serverEnv.allowMockAdminAuth
  ) {
    mode = "mock";
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-10">
      <Suspense fallback={<p className="text-body-sm text-text-muted">Loading…</p>}>
        <AdminLoginForm mode={mode} />
      </Suspense>
    </div>
  );
}
