// app/dashboard/player/profile/page.tsx

"use client";

import React, { Suspense } from "react";
import { PlayerProfileEditor } from "./PlayerProfileEditor";

export default function PlayerProfilePage() {
  return (
    <Suspense fallback={null}>
      <PlayerProfileEditor />
    </Suspense>
  );
}