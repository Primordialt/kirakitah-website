"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Input } from "@/components/ui";

export function VerifiedProfilesSearch({
  initialQuery,
}: {
  initialQuery: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = query.trim();
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    params.delete("page");
    router.push(`/admin/reviews/profiles/verified?${params.toString()}`);
  };

  return (
    <form
      className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={onSubmit}
    >
      <div className="flex-1">
        <Input
          label="Search approved profiles"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, username, or email"
          autoComplete="off"
        />
      </div>
      <Button type="submit" className="sm:mb-0.5">
        Search
      </Button>
    </form>
  );
}
