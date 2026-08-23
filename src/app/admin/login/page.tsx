import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { serverEnv } from "@/server/env";
import { getAdminAuthProvider } from "@/server/admin/auth";

export default function AdminLoginPage() {
  const provider = getAdminAuthProvider();
  const mockAuthAvailable =
    provider.providerId === "mock" && serverEnv.allowMockAdminAuth;

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-10">
      <Suspense fallback={<p className="text-body-sm text-text-muted">Loading…</p>}>
        <AdminLoginForm mockAuthAvailable={mockAuthAvailable} />
      </Suspense>
    </div>
  );
}
