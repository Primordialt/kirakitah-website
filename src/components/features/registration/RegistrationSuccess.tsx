import { Button } from "@/components/ui";

export function RegistrationSuccess() {
  return (
    <div
      className="mx-auto flex max-w-xl flex-col gap-6 rounded-2xl border border-border-interactive bg-surface-elevated p-8 text-center md:p-12"
      role="status"
      aria-live="polite"
    >
      <h2 className="text-h2 text-text-primary">YOU&apos;RE IN THE SYSTEM.</h2>
      <p className="text-body-lg text-text-secondary">
        Your KIRAKITAH Gaming application has been received. We&apos;ll review
        your information and contact you with the next steps.
      </p>
      <Button href="/esports" variant="outline" size="lg">
        BACK TO TOURNAMENT
      </Button>
    </div>
  );
}
