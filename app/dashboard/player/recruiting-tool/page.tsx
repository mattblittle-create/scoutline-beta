// app/dashboard/player/recruiting-tool/page.tsx

"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import RecruitingTool from "@/app/components/recruiting/RecruitingTool";

function PlayerRecruitingToolPageInner() {
  const search = useSearchParams();

  const playerProfileId = search.get("playerProfileId") || undefined;
  const from = search.get("from") || "";
  const returnTo = search.get("returnTo") || "";

  const isFromTeamRoster = from === "team-roster";

  return (
    <RecruitingTool
      mode="player"
      playerProfileId={playerProfileId}
      backHref={
        isFromTeamRoster
          ? returnTo || "/dashboard/team/roster"
          : "/dashboard/player"
      }
      backLabel={isFromTeamRoster ? "Back to Team Roster" : "Back to Dashboard"}
    />
  );
}

export default function PlayerRecruitingToolPage() {
  return (
    <Suspense fallback={null}>
      <PlayerRecruitingToolPageInner />
    </Suspense>
  );
}