import { Footer } from "@/components/shared/footer/Footer";
import { Header } from "@/components/shared/header/Header";
import type { SiteHeaderAuthState } from "@/config/site-header-auth";

export interface SiteShellProps {
  children: React.ReactNode;
  auth: SiteHeaderAuthState;
}

export function SiteShell({ children, auth }: SiteShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-brand-primary focus:px-4 focus:py-2 focus:text-white focus:outline-none"
      >
        Skip to main content
      </a>
      <Header auth={auth} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
