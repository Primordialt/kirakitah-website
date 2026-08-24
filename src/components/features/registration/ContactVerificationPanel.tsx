"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input, Label, FieldError, useFieldIds } from "@/components/ui";
import type { ContactChannelVerificationState } from "@/domain/registration";

type Channel = "email" | "phone";

interface ChannelUiState extends ContactChannelVerificationState {
  localStatus:
    | "idle"
    | "verifying"
    | "verified"
    | "error"
    | "unavailable"
    | "skipped";
  message?: string;
  code: string;
  cooldownSeconds: number;
}

function initialChannelState(
  channel: ContactChannelVerificationState | undefined,
): ChannelUiState {
  const status = channel?.status ?? "unavailable";
  return {
    status,
    challengeId: channel?.challengeId,
    resendAvailableAt: channel?.resendAvailableAt,
    localStatus:
      status === "verified"
        ? "verified"
        : status === "skipped"
          ? "skipped"
          : status === "unavailable" || !channel?.challengeId
            ? "unavailable"
            : "idle",
    code: "",
    cooldownSeconds: 0,
    message: undefined,
  };
}

function secondsUntil(iso?: string): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
}

async function postJson<T>(url: string, body: unknown): Promise<{
  ok: boolean;
  status: number;
  data: T;
}> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T;
  return { ok: response.ok, status: response.status, data };
}

function ChannelVerificationCard({
  channel,
  label,
  referenceId,
  state,
  onChange,
}: {
  channel: Channel;
  label: string;
  referenceId: string;
  state: ChannelUiState;
  onChange: (next: ChannelUiState) => void;
}) {
  const codeId = `${channel}-verification-code`;
  const codeField = useFieldIds(codeId);

  useEffect(() => {
    if (state.cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      onChange({
        ...state,
        cooldownSeconds: Math.max(0, state.cooldownSeconds - 1),
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state, onChange]);

  if (state.localStatus === "skipped") {
    return (
      <div className="rounded-xl border border-border-interactive bg-surface p-4 text-left">
        <h3 className="text-label font-semibold text-text-primary">{label}</h3>
        <p className="mt-2 text-body-sm text-text-muted">
          Contact verification is not required for this channel right now.
        </p>
      </div>
    );
  }

  if (state.localStatus === "unavailable") {
    return (
      <div className="rounded-xl border border-border-interactive bg-surface p-4 text-left">
        <h3 className="text-label font-semibold text-text-primary">{label}</h3>
        <p className="mt-2 text-body-sm text-text-muted">
          Verification messaging is temporarily unavailable. Your application is
          still received and identity will be reviewed manually.
        </p>
      </div>
    );
  }

  if (state.localStatus === "verified" || state.status === "verified") {
    return (
      <div className="rounded-xl border border-border-interactive bg-surface p-4 text-left">
        <h3 className="text-label font-semibold text-text-primary">{label}</h3>
        <p className="mt-2 text-body-sm text-text-secondary">
          {label} ownership verified.
        </p>
      </div>
    );
  }

  const handleVerify = async () => {
    if (!state.challengeId) return;
    onChange({ ...state, localStatus: "verifying", message: undefined });

    const result = await postJson<{
      success?: boolean;
      error?: { code: string; message: string };
    }>("/api/registrations/verify", {
      referenceId,
      channel,
      challengeId: state.challengeId,
      code: state.code.trim(),
    });

    if (result.ok && result.data.success) {
      onChange({
        ...state,
        status: "verified",
        localStatus: "verified",
        code: "",
        message: undefined,
      });
      return;
    }

    const code = result.data.error?.code;
    const message =
      result.data.error?.message ?? "Unable to verify this code.";

    onChange({
      ...state,
      localStatus: "error",
      message:
        code === "VERIFICATION_EXPIRED"
          ? "This code has expired. Request a new one."
          : code === "VERIFICATION_EXHAUSTED"
            ? "Too many attempts. Request a new code."
            : code === "VERIFICATION_ALREADY_USED"
              ? "This code has already been used."
              : message,
    });
  };

  const handleResend = async () => {
    if (state.cooldownSeconds > 0) return;

    const result = await postJson<{
      success?: boolean;
      challengeId?: string;
      resendAvailableAt?: string;
      error?: { code: string; message: string };
    }>("/api/registrations/verify/resend", {
      referenceId,
      channel,
    });

    if (result.ok && result.data.success && result.data.challengeId) {
      onChange({
        ...state,
        challengeId: result.data.challengeId,
        resendAvailableAt: result.data.resendAvailableAt,
        cooldownSeconds: secondsUntil(result.data.resendAvailableAt),
        localStatus: "idle",
        message: "A new code has been sent.",
        code: "",
      });
      return;
    }

    const payload = result.data as {
      resendAvailableAt?: string;
      error?: { code: string; message: string };
    };

    onChange({
      ...state,
      cooldownSeconds: secondsUntil(payload.resendAvailableAt),
      localStatus: "error",
      message:
        payload.error?.code === "PROVIDER_UNAVAILABLE"
          ? "Verification messaging is unavailable right now."
          : (payload.error?.message ?? "Unable to resend code."),
    });
  };

  return (
    <div className="rounded-xl border border-border-interactive bg-surface p-4 text-left">
      <h3 className="text-label font-semibold text-text-primary">{label}</h3>
      <p className="mt-2 text-body-sm text-text-secondary">
        Enter the 6-digit code sent to your {channel}.
      </p>

      <div className="mt-4 space-y-2">
        <Label htmlFor={codeId}>Verification code</Label>
        <Input
          id={codeId}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={state.code}
          onChange={(event) =>
            onChange({
              ...state,
              code: event.target.value.replace(/\D/g, "").slice(0, 6),
              message: undefined,
            })
          }
          aria-invalid={state.localStatus === "error"}
          aria-describedby={
            state.localStatus === "error" ? codeField.errorId : undefined
          }
        />
        {state.message ? (
          <FieldError id={codeField.errorId}>{state.message}</FieldError>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          size="md"
          disabled={state.code.length < 4 || state.localStatus === "verifying"}
          onClick={() => void handleVerify()}
        >
          {state.localStatus === "verifying" ? "VERIFYING…" : "VERIFY"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="md"
          disabled={state.cooldownSeconds > 0}
          onClick={() => void handleResend()}
        >
          {state.cooldownSeconds > 0
            ? `RESEND (${state.cooldownSeconds}s)`
            : "RESEND CODE"}
        </Button>
      </div>
    </div>
  );
}

export function ContactVerificationPanel({
  referenceId,
  contactVerification,
  deferred = false,
}: {
  referenceId: string;
  contactVerification?: {
    email: ContactChannelVerificationState;
    phone: ContactChannelVerificationState;
  };
  /** MVP_MANUAL_REVIEW: do not force OTP; communicate verification will follow. */
  deferred?: boolean;
}) {
  const [emailState, setEmailState] = useState(() =>
    initialChannelState(contactVerification?.email),
  );
  const [phoneState, setPhoneState] = useState(() =>
    initialChannelState(contactVerification?.phone),
  );

  const showPanel = useMemo(() => {
    return deferred || Boolean(contactVerification);
  }, [contactVerification, deferred]);

  const syncCooldown = useCallback((channel: Channel) => {
    if (channel === "email") {
      setEmailState((current) => ({
        ...current,
        cooldownSeconds: secondsUntil(current.resendAvailableAt),
      }));
    } else {
      setPhoneState((current) => ({
        ...current,
        cooldownSeconds: secondsUntil(current.resendAvailableAt),
      }));
    }
  }, []);

  useEffect(() => {
    syncCooldown("email");
    syncCooldown("phone");
  }, [syncCooldown]);

  if (!showPanel) {
    return null;
  }

  if (deferred) {
    return (
      <div className="flex w-full flex-col gap-3 rounded-xl border border-border-interactive bg-surface p-4 text-left">
        <h3 className="text-h3 text-text-primary">Contact verification</h3>
        <p className="text-label font-semibold uppercase tracking-wide text-accent">
          Contact verification will follow
        </p>
        <p className="text-body-sm text-text-secondary">
          Email and phone verification are not required to submit your
          application right now. Your contact details have been recorded. The
          KIRAKITAH team will contact you with next steps.
        </p>
        <p className="text-body-sm text-text-muted">
          Your email and phone are not marked verified until ownership is
          confirmed later.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 text-left">
      <h3 className="text-h3 text-text-primary">Contact verification</h3>
      <p className="text-body-sm text-text-secondary">
        Complete the required contact verification steps when available.
      </p>
      <ChannelVerificationCard
        channel="email"
        label="Email verification"
        referenceId={referenceId}
        state={emailState}
        onChange={setEmailState}
      />
      <ChannelVerificationCard
        channel="phone"
        label="Phone verification"
        referenceId={referenceId}
        state={phoneState}
        onChange={setPhoneState}
      />
    </div>
  );
}
