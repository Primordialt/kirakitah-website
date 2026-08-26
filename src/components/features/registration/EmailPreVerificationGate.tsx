"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, FieldError, Input, Label, useFieldIds } from "@/components/ui";
import { COMPETITION_NAME, TOURNAMENT_EVENT_ID } from "@/config/competition";

type VerifyPhase = "idle" | "code_sent" | "verified" | "error";

export interface EmailPreVerificationState {
  email: string;
  challengeId?: string;
  emailVerificationToken?: string;
  expiresAt?: string;
  verified: boolean;
}

export function EmailPreVerificationGate({
  fullName,
  value,
  onChange,
  disabled,
}: {
  fullName?: string;
  value: EmailPreVerificationState;
  onChange: (next: EmailPreRegistrationValue) => void;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<VerifyPhase>(
    value.verified ? "verified" : value.challengeId ? "code_sent" : "idle",
  );
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const emailId = "pre-reg-email";
  const codeId = "pre-reg-code";
  const emailField = useFieldIds(emailId);
  const codeField = useFieldIds(codeId);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const resetVerification = useCallback(
    (email: string) => {
      setPhase("idle");
      setCode("");
      setMessage(null);
      onChange({
        email,
        verified: false,
        challengeId: undefined,
        emailVerificationToken: undefined,
        expiresAt: undefined,
      });
    },
    [onChange],
  );

  const sendCode = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/registrations/email/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value.email.trim().toLowerCase(),
          eventId: TOURNAMENT_EVENT_ID,
          recipientFirstName: fullName?.trim().split(/\s+/)[0],
        }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        challengeId?: string;
        resendAvailableAt?: string;
        message?: string;
        error?: { code: string; message: string };
      };

      if (!response.ok || !payload.success || !payload.challengeId) {
        setPhase("error");
        setMessage(
          payload.error?.message ??
            "Unable to send verification email. Try again shortly.",
        );
        if (payload.resendAvailableAt) {
          setCooldown(
            Math.max(
              0,
              Math.ceil(
                (new Date(payload.resendAvailableAt).getTime() - Date.now()) /
                  1000,
              ),
            ),
          );
        }
        setLoading(false);
        return;
      }

      setPhase("code_sent");
      setMessage("Verification email sent.");
      if (payload.resendAvailableAt) {
        setCooldown(
          Math.max(
            0,
            Math.ceil(
              (new Date(payload.resendAvailableAt).getTime() - Date.now()) /
                1000,
            ),
          ),
        );
      } else {
        setCooldown(60);
      }
      onChange({
        ...value,
        email: value.email.trim().toLowerCase(),
        challengeId: payload.challengeId,
        verified: false,
        emailVerificationToken: undefined,
        expiresAt: undefined,
      });
    } catch {
      setPhase("error");
      setMessage("Unable to send verification email. Try again shortly.");
    }
    setLoading(false);
  };

  const verifyCode = async () => {
    if (!value.challengeId) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/registrations/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value.email.trim().toLowerCase(),
          challengeId: value.challengeId,
          code: code.trim(),
        }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        emailVerificationToken?: string;
        expiresAt?: string;
        message?: string;
        error?: { code: string; message: string };
      };

      if (!response.ok || !payload.success || !payload.emailVerificationToken) {
        setPhase("error");
        setMessage(payload.error?.message ?? "Unable to verify this code.");
        setLoading(false);
        return;
      }

      setPhase("verified");
      setMessage("Email verified.");
      onChange({
        ...value,
        email: value.email.trim().toLowerCase(),
        verified: true,
        emailVerificationToken: payload.emailVerificationToken,
        expiresAt: payload.expiresAt,
      });
    } catch {
      setPhase("error");
      setMessage("Unable to verify this code.");
    }
    setLoading(false);
  };

  return (
    <fieldset className="flex flex-col gap-4 rounded-2xl border border-border-interactive bg-surface-elevated p-5">
      <legend className="px-1 text-h4 text-text-primary">EMAIL VERIFICATION</legend>
      <p className="text-body-sm text-text-secondary">
        Verify ownership of your email before you can submit your {COMPETITION_NAME}{" "}
        application.
      </p>

      <div className="space-y-2">
        <Label htmlFor={emailId}>Email address</Label>
        <Input
          id={emailId}
          type="email"
          autoComplete="email"
          required
          disabled={disabled}
          value={value.email}
          onChange={(event) => {
            const next = event.target.value;
            if (value.verified || value.challengeId) {
              resetVerification(next);
            } else {
              onChange({ ...value, email: next, verified: false });
            }
          }}
          aria-invalid={phase === "error"}
          aria-describedby={
            phase === "verified" ? emailField.descriptionId : undefined
          }
        />
        {phase === "verified" ? (
          <p
            id={emailField.descriptionId}
            className="text-body-sm text-text-muted"
          >
            Changing this email clears verification and requires a new code.
          </p>
        ) : null}
      </div>

      {phase === "verified" ? (
        <p className="text-body-sm font-medium text-text-primary" role="status">
          Email verified.
        </p>
      ) : (
        <>
          {phase === "code_sent" || phase === "error" ? (
            <div className="space-y-2">
              <Label htmlFor={codeId}>Verification code</Label>
              <Input
                id={codeId}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                aria-invalid={phase === "error"}
                aria-describedby={
                  message ? codeField.errorId : undefined
                }
              />
            </div>
          ) : null}

          {message ? (
            <FieldError id={codeField.errorId}>{message}</FieldError>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {phase === "idle" || (phase === "error" && !value.challengeId) ? (
              <Button
                type="button"
                size="md"
                disabled={disabled || loading || !value.email.includes("@")}
                onClick={() => void sendCode()}
              >
                {loading ? "SENDING…" : "SEND VERIFICATION CODE"}
              </Button>
            ) : null}

            {value.challengeId ? (
              <>
                <Button
                  type="button"
                  size="md"
                  disabled={disabled || loading || code.length < 4}
                  onClick={() => void verifyCode()}
                >
                  {loading ? "VERIFYING…" : "VERIFY EMAIL"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  disabled={disabled || loading || cooldown > 0}
                  onClick={() => void sendCode()}
                >
                  {cooldown > 0 ? `RESEND (${cooldown}s)` : "RESEND CODE"}
                </Button>
              </>
            ) : null}
          </div>
        </>
      )}
    </fieldset>
  );
}

/** Alias used by onChange typing */
export type EmailPreRegistrationValue = EmailPreVerificationState;
