"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";
import type { ContactChannelVerificationState } from "@/domain/registration";
import { ContactVerificationPanel } from "./ContactVerificationPanel";

export function RegistrationSuccess({
  referenceId,
  contactVerification,
}: {
  referenceId?: string;
  contactVerification?: {
    email: ContactChannelVerificationState;
    phone: ContactChannelVerificationState;
  };
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
        YOU&apos;RE IN THE SYSTEM.
      </h2>
      <p className="text-body-lg text-text-secondary">
        Your application has been received — this is not yet confirmed tournament
        participation.
      </p>
      <p className="text-body-sm text-text-secondary">
        Email and phone verification are required when available. Identity
        documents enter manual KIRAKITAH review and do not auto-approve your
        application.
      </p>
      {referenceId ? (
        <p className="text-body-sm text-text-muted">
          Application reference:{" "}
          <span className="font-medium text-text-primary">{referenceId}</span>
        </p>
      ) : null}

      {referenceId ? (
        <ContactVerificationPanel
          referenceId={referenceId}
          contactVerification={contactVerification}
        />
      ) : null}

      <Button href="/esports" variant="outline" size="lg">
        BACK TO TOURNAMENT
      </Button>
    </div>
  );
}
