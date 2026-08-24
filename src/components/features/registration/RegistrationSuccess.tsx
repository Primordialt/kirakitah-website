"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";
import { COMPETITION_NAME } from "@/config/competition";
import { registrationPolicy } from "@/config/registration-policy";
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
  const contactDeferred = registrationPolicy.contactVerification === "DEFERRED";

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
        Your {COMPETITION_NAME} application has been received.
      </p>
      <p className="text-body-sm text-text-secondary">
        Our team will review your application and identity information. You will
        be contacted with the next steps.
      </p>
      <p className="text-body-sm text-text-muted">
        This is not confirmed tournament participation. Identity review is
        manual and does not automatically qualify you.
      </p>
      {referenceId ? (
        <p className="text-body-sm text-text-muted">
          Your application reference:{" "}
          <span className="font-medium text-text-primary">{referenceId}</span>
        </p>
      ) : null}

      {referenceId ? (
        <ContactVerificationPanel
          referenceId={referenceId}
          contactVerification={contactVerification}
          deferred={contactDeferred}
        />
      ) : null}

      <Button href="/esports" variant="outline" size="lg">
        BACK TO TOURNAMENT
      </Button>
    </div>
  );
}
