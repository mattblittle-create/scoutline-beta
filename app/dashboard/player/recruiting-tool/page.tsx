// app/dashboard/player/recruiting-tool/page.tsx

"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import RecruitingTool from "@/app/components/recruiting/RecruitingTool";

function PlayerRecruitingToolPageInner() {
  const search = useSearchParams();

  const playerProfileId =
    search.get("playerProfileId") || undefined;

  return (
    <RecruitingTool
      mode="player"
      playerProfileId={playerProfileId}
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