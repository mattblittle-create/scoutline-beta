"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

function normalizePlanSlug(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export default function OnboardingPlayerBridgePage() {
  const router = useRouter();
  const search = useSearchParams();

  React.useEffect(() => {
    const q = normalizePlanSlug(search.get("plan") || "");

    // map common aliases
    const mapped =
      q === "allamerican" ? "all-american" :
      q === "walkon" ? "walk-on" :
      q;

    if (mapped === "redshirt" || mapped === "walk-on" || mapped === "all-american") {
      router.replace(`/onboarding/${encodeURIComponent(mapped)}`);
    } else {
      router.replace("/pricing");
    }
  }, [router, search]);

  return null;
}
