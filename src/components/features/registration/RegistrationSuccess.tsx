"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";
import { COMPETITION_NAME } from "@/config/competition";

export function RegistrationSuccess({
  referenceId,
}: {
  referenceId?: string;
  /** Retained for API compatibility; MVP deferred contact OTP is not shown. */
  contactVerification?: unknown;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div
      className="mx-auto flex max-w-xl flex-col gap-6 rounded-2xl border border-border-interactive bg-surface-elevated p-8 text-center md:p-12"
      role="status"
      aria-live="polite"
    >
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-h2 text-text-primary outline-none"
      >
        APPLICATION RECEIVED
      </h2>
      <p className="text-body-lg text-text-secondary">
        Thank you for submitting your {COMPETITION_NAME} application.
      </p>
      <p className="text-body-sm text-text-secondary">
        Our team will review your application and contact you regarding the next
        steps.
      </p>
      {referenceId ? (
        <p className="text-body-sm text-text-muted">
          <span className="font-medium text-text-primary">
            Application Reference:
          </span>{" "}
          <span className="font-medium text-text-primary">{referenceId}</span>
        </p>
      ) : null}
      <p className="text-body-sm text-text-muted">
        Please keep this reference for your records.
      </p>

      <Button href="/esports" variant="outline" size="lg">
        BACK TO TOURNAMENT
      </Button>
    </div>
  );
}
