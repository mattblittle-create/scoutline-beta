"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function normalizePlan(raw?: string | null) {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  if (v === "walk-on" || v === "walkon") return "walkon";
  if (v === "all-american" || v === "allamerican") return "allamerican";
  if (v === "redshirt") return "redshirt";
  if (v === "team" || v === "teams") return "team";
  if (v === "coach" || v === "coaches" || v.includes("recruit")) return "coach";
  return null;
}

export default function GetStartedRouter() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const planParam = params.get("plan");
    const plan = normalizePlan(planParam);
    if (plan) {
      router.replace(`/onboarding/${plan}`);
    } else {
      router.replace("/pricing");
    }
  }, [params, router]);

  return (
    <main style={{ maxWidth: 800, margin: "60px auto", padding: "0 16px", color: "#0f172a" }}>
      <h1 style={{ fontWeight: 800, margin: 0 }}>Redirecting…</h1>
      <p style={{ marginTop: 8 }}>Starting your onboarding flow.</p>
    </main>
  );
}
