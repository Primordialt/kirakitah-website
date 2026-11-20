"use client";

import { Button } from "@/components/ui";
import { participantFetch } from "@/lib/participant/api";
import { useState } from "react";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const onLogout = async () => {
    setLoading(true);
    try {
      await participantFetch("/api/participant/auth/logout", { method: "POST" });
    } finally {
      window.location.assign(
        process.env.NEXT_PUBLIC_AUTH0_ENABLED === "true"
          ? "/auth/logout"
          : "/login",
      );
    }
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
