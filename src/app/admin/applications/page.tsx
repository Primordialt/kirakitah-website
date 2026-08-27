import { ApplicationsQueuePage } from "@/components/admin/ApplicationsQueuePage";

export default function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ApplicationsQueuePage searchParams={searchParams} />;
}
