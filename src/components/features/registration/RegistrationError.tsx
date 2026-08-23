import { Button } from "@/components/ui";

export interface RegistrationErrorProps {
  onRetry: () => void;
}

export function RegistrationError({ onRetry }: RegistrationErrorProps) {
  return (
    <div
      className="mx-auto flex max-w-xl flex-col gap-6 rounded-2xl border border-error/30 bg-error/5 p-8 text-center md:p-12"
      role="alert"
      aria-live="assertive"
    >
      <h2 className="text-h2 text-text-primary">SOMETHING WENT WRONG.</h2>
      <p className="text-body-lg text-text-secondary">
        We couldn&apos;t complete your application right now. Please try again.
      </p>
      <Button onClick={onRetry} size="lg">
        TRY AGAIN
      </Button>
    </div>
  );
}
