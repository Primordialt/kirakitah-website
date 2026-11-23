import { GetTheAppActions } from "@/components/pwa/GetTheAppActions";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

const description =
  "Add KIRAKITAH to your phone home screen and turn on alerts. No app store needed.";

export const metadata: Metadata = {
  title: "Add KIRAKITAH to your phone",
  description,
  alternates: { canonical: `${siteConfig.url}/get-the-app` },
};

const steps = [
  {
    title: "Open this page on your phone",
    body: "Use the browser you already have. Safari on iPhone. Chrome on Android.",
  },
  {
    title: "iPhone",
    body: "Tap the Share button, then tap Add to Home Screen, then tap Add. A KIRAKITAH icon appears with your other apps.",
  },
  {
    title: "Android",
    body: "Tap Install App if you see that button. If you do not, open the browser menu and tap Install app or Add to Home screen.",
  },
  {
    title: "Open the icon",
    body: "Use the KIRAKITAH icon, not the browser tab. On iPhone, alerts only work after you open the icon.",
  },
  {
    title: "Turn on alerts",
    body: "Sign in, tap Turn on phone alerts, then tap Allow. KIRAKITAH sends one test message so you can see it worked.",
  },
];

export default function GetTheAppPage() {
  return (
    <SectionShell className="py-10 md:py-16" containerClassName="max-w-xl">
      <p className="text-caption font-semibold uppercase tracking-wide text-brand-primary">
        Your phone
      </p>
      <h1 className="mt-2 text-h2 text-text-primary">Add KIRAKITAH to your phone</h1>
      <p className="mt-3 text-body text-text-secondary">
        KIRAKITAH can sit on your home screen like any other app. You do not go to an app store.
      </p>
      <ol className="mt-8 space-y-4">
        {steps.map((step, index) => (
          <li key={step.title} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-caption font-semibold text-accent">Step {index + 1}</p>
            <h2 className="mt-1 text-body font-semibold text-text-primary">{step.title}</h2>
            <p className="mt-2 text-body-sm text-text-secondary">{step.body}</p>
          </li>
        ))}
      </ol>
      <GetTheAppActions />
    </SectionShell>
  );
}
