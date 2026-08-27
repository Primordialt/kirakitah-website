import Link from "next/link";
import {
  ParticipantPortalHeader,
  ParticipantNavLinks,
} from "@/components/features/participant/ParticipantNav";

export type PortalShellIdentity = {
  username: string;
  profileVerified: boolean;
};

export function ParticipantPortalShell({
  children,
  identity,
}: {
  children: React.ReactNode;
  identity: PortalShellIdentity | null;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-brand-primary focus:px-4 focus:py-2 focus:text-white focus:outline-none"
      >
        Skip to main content
      </a>
      <ParticipantPortalHeader identity={identity} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-6 sm:px-6 md:py-8">
        <aside className="hidden w-52 shrink-0 lg:block">
          <p className="mb-3 text-caption font-semibold uppercase tracking-wide text-text-muted">
            Navigate
          </p>
          <nav aria-label="Participant portal sidebar">
            <ParticipantNavLinks orientation="vertical" />
          </nav>
        </aside>
        <main id="main-content" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
      <footer className="border-t border-border py-4 text-center text-body-sm text-text-muted">
        KIRAKITAH Participant Portal ·{" "}
        <Link
          href="/"
          className="text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Back to website
        </Link>
      </footer>
    </div>
  );
}
