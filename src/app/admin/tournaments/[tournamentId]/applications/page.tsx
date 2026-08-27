import { ApplicationsQueuePage } from "@/components/admin/ApplicationsQueuePage";

export default function TournamentApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tournamentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <ApplicationsQueuePage params={params} searchParams={searchParams} />
  );
}
