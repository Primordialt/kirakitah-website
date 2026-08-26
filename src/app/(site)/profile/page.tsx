import { ProfileForm } from "@/components/features/participant/ProfileForm";
import { SectionShell } from "@/components/sections/esports/SectionShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile — KIRAKITAH",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return (
    <SectionShell className="py-12 md:py-16" containerClassName="max-w-3xl">
      <ProfileForm />
    </SectionShell>
  );
}
