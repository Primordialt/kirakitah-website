import {
  ComingSoonPage,
  createComingSoonMetadata,
} from "@/components/shared/coming-soon/ComingSoonPage";

const path = "/stories";
const title = "STORIES";
const description =
  "Stories from across the KIRAKITAH platform will appear here soon — including updates from KIRAKITAH GAMING 926 and future initiatives.";

export const metadata = createComingSoonMetadata({ title, description, path });

export default function StoriesPage() {
  return <ComingSoonPage title={title} description={description} />;
}
