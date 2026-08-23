import {
  ComingSoonPage,
  createComingSoonMetadata,
} from "@/components/shared/coming-soon/ComingSoonPage";

const path = "/community";
const title = "COMMUNITY";
const description =
  "The KIRAKITAH community experience is coming soon. Connect, collaborate, and grow with players and creators across the platform.";

export const metadata = createComingSoonMetadata({ title, description, path });

export default function CommunityPage() {
  return <ComingSoonPage title={title} description={description} />;
}
