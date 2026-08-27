import { ProfileForm } from "@/components/features/participant/ProfileForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile — KIRAKITAH Participant Portal",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfileForm />;
}
