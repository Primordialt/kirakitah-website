"use client";

import { Button, Input } from "@/components/ui";
import {
  KIRAKITAH_YOUTUBE_URL,
  youtubeSubscriptionCopy,
} from "@/config/eligibility-requirements";
import { apiErrorMessage, participantFetch } from "@/lib/participant/api";
import { useState } from "react";

export function YouTubeSubscriptionAttestationPanel({
  tournamentId,
  onAttested,
}: {
  tournamentId: string;
  onAttested?: () => void;
}) {
  const [channel, setChannel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submitAttestation = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { response, payload } = await participantFetch<{
      message?: string;
    }>(`/api/participant/tournaments/${tournamentId}/social/youtube-subscription`, {
      method: "POST",
      body: JSON.stringify({
        youtubeChannel: channel.trim() || undefined,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      setError(
        apiErrorMessage(
          payload,
          "Unable to record YouTube subscription attestation.",
        ),
      );
      return;
    }

    setSuccess(
      payload.message ??
        "YouTube subscription attestation recorded. Manual review is required.",
    );
    onAttested?.();
  };

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-border bg-surface-elevated p-4">
      <div>
        <h3 className="text-body font-semibold text-text-primary">
          {youtubeSubscriptionCopy.title}
        </h3>
        <p className="mt-1 text-body-sm text-text-secondary">
          {youtubeSubscriptionCopy.lead}
        </p>
      </div>

      <Button
        href={KIRAKITAH_YOUTUBE_URL}
        target="_blank"
        rel="noopener noreferrer"
        variant="secondary"
        className="w-full sm:w-auto"
      >
        {youtubeSubscriptionCopy.subscribeCta}
        <span className="sr-only"> (opens in a new tab)</span>
      </Button>

      <Input
        label="YouTube channel (optional)"
        description={youtubeSubscriptionCopy.channelFieldDescription}
        placeholder="Your YouTube channel or handle"
        autoComplete="off"
        value={channel}
        onChange={(event) => setChannel(event.target.value)}
      />

      <Button
        type="button"
        onClick={() => void submitAttestation()}
        disabled={loading}
        className="w-full sm:w-auto"
      >
        {loading ? "Submitting…" : "I've subscribed"}
      </Button>

      {success ? (
        <p role="status" className="text-body-sm text-text-secondary">
          {success}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
