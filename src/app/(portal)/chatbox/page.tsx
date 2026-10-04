import { ChatboxClient } from "@/components/features/chatbox/ChatboxClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chatbox — KIRAKITAH Participant Portal",
  robots: { index: false, follow: false },
};

export default function ChatboxPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <ChatboxClient />
    </div>
  );
}
