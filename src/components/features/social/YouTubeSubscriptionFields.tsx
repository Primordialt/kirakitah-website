"use client";

import { Button, Checkbox, Input } from "@/components/ui";
import {
  KIRAKITAH_YOUTUBE_URL,
  youtubeSubscriptionCopy,
} from "@/config/eligibility-requirements";

type YouTubeSubscriptionFieldsProps = {
  channelValue?: string;
  onChannelChange?: (value: string) => void;
  attested: boolean;
  onAttestedChange: (checked: boolean) => void;
  attestationError?: string;
  channelError?: string;
  showOptionalChannel?: boolean;
};

export function YouTubeSubscriptionFields({
  channelValue = "",
  onChannelChange,
  attested,
  onAttestedChange,
  attestationError,
  channelError,
  showOptionalChannel = true,
}: YouTubeSubscriptionFieldsProps) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface-elevated p-4">
      <div>
        <h3 className="text-body font-semibold text-text-primary">
          {youtubeSubscriptionCopy.title}
        </h3>
        <p className="mt-1 text-body-sm text-text-secondary">
          {youtubeSubscriptionCopy.lead}
        </p>
        <p className="mt-2 text-body-sm text-text-muted">
          {youtubeSubscriptionCopy.channelLabel}{" "}
          <span className="font-medium text-text-primary">
            {youtubeSubscriptionCopy.channelHandle}
          </span>
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

      {showOptionalChannel && onChannelChange ? (
        <Input
          label={youtubeSubscriptionCopy.channelFieldDescription}
          placeholder="Your YouTube channel or handle"
          autoComplete="off"
          value={channelValue}
          onChange={(event) => onChannelChange(event.target.value)}
          error={channelError}
        />
      ) : null}

      <Checkbox
        label={youtubeSubscriptionCopy.attestationLabel}
        description={youtubeSubscriptionCopy.attestationDescription}
        required
        checked={attested}
        onChange={(event) => onAttestedChange(event.target.checked)}
        error={attestationError}
      />
    </div>
  );
}
