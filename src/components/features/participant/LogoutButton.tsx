"use client";

import { Button } from "@/components/ui";
import { participantFetch } from "@/lib/participant/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onLogout = async () => {
    setLoading(true);
    await participantFetch("/api/participant/auth/logout", { method: "POST" });
    setLoading(false);
    router.replace("/login");
    router.refresh();
  };

  return (
    <Button
      type="button"
      variant="secondary"
      loading={loading}
      onClick={() => void onLogout()}
    >
      LOG OUT
    </Button>
  );
}
