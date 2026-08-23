import {
  ComingSoonPage,
  createComingSoonMetadata,
} from "@/components/shared/coming-soon/ComingSoonPage";

const path = "/contact";
const title = "CONTACT";
const description =
  "Official KIRAKITAH contact channels will be published here soon. For KIRAKITAH GAMING 926 enquiries, register your interest through the tournament application process.";

export const metadata = createComingSoonMetadata({ title, description, path });

export default function ContactPage() {
  return <ComingSoonPage title={title} description={description} />;
}
