// app/onboarding/player/page.tsx

"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function normalizePlanSlug(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function OnboardingPlayerBridgePageInner() {
  const router = useRouter();
  const search = useSearchParams();

  React.useEffect(() => {
    const q = normalizePlanSlug(search.get("plan") || "");

    const mapped =
      q === "allamerican"
        ? "all-american"
        : q === "walkon"
        ? "walk-on"
        : q;

    if (mapped === "redshirt" || mapped === "walk-on" || mapped === "all-american") {
      if (mapped === "redshirt") {
        router.replace(`/onboarding/${encodeURIComponent(mapped)}`);
      } else {
        router.replace(`/onboarding/${encodeURIComponent(mapped)}?billing=monthly`);
      }
    } else {
      router.replace("/pricing");
    }
  }, [router, search]);

  return null;
}

export default function OnboardingPlayerBridgePage() {
  return (
    <Suspense fallback={null}>
      <OnboardingPlayerBridgePageInner />
    </Suspense>
  );
}