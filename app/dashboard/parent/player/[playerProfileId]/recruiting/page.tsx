// app/dashboard/parent/player/[playerProfileId]/recruiting/page.tsx

import { notFound } from "next/navigation";
import RecruitingTool from "@/app/components/recruiting/RecruitingTool";
import { getParentDashboardContext } from "@/lib/parent/getParentDashboardContext";

type PageProps = {
  params: {
    playerProfileId: string;
  };
};

export default async function ParentRecruitingSnapshotPage({
  params,
}: PageProps) {
  const playerProfileId = String(params?.playerProfileId || "").trim();

  if (!playerProfileId) notFound();

  await getParentDashboardContext({
    playerProfileId,
    requireLinkedPlayer: true,
  });

  return (
    <RecruitingTool
      mode="parent"
      playerProfileId={playerProfileId}
      backHref={`/dashboard/parent/player/${encodeURIComponent(
        playerProfileId
      )}`}
      backLabel="Back to Player Overview"
    />
  );
}