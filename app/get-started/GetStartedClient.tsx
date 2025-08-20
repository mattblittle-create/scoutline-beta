"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type PlanKey = "redshirt" | "walk-on" | "all-american" | "team" | "coach";

// Map plan → destination route (you'll build these pages next)
const PLAN_DESTINATIONS: Record<PlanKey, string> = {
  redshirt: "/onboarding/player?plan=redshirt",
  "walk-on": "/onboarding/player?plan=walk-on",
  "all-american": "/onboarding/player?plan=all-american",
  team: "/onboarding/team?plan=team",
  coach: "/onboarding/coach?plan=coach",
};

export default function GetStartedClient() {
  const params = useSearchParams();
  const router = useRouter();

  const rawPlan = (params.get("plan") || "").toLowerCase();

  const normalizedPlan = useMemo<PlanKey | null>(() => {
    if (rawPlan === "redshirt") return "redshirt";
    if (rawPlan === "walk-on" || rawPlan === "walkon") return "walk-on";
    if (rawPlan === "all-american" || rawPlan === "allamerican") return "all-american";
    if (rawPlan === "team" || rawPlan === "teams") return "team";
    if (rawPlan === "coach" || rawPlan === "coaches") return "coach";
    return null;
  }, [rawPlan]);

  // If a recognized plan is present, route immediately
  useEffect(() => {
    if (!normalizedPlan) return;
    const dest = PLAN_DESTINATIONS[normalizedPlan];
    if (dest) router.replace(dest);
  }, [normalizedPlan, router]);

  // Fallback UI if plan is missing/invalid
  return (
    <div style={{ textAlign: "center" }}>
      <h1 style={{ margin: 0, fontWeight: 800, fontSize: "clamp(22px, 4vw, 34px)" }}>
        Let’s get you set up
      </h1>
      <p style={{ color: "#475569", marginTop: 8 }}>
        Choose a plan to continue, or head back to pricing.
      </p>

      <div
        style={{
          display: "grid",
          gap: 12,
          justifyContent: "center",
          marginTop: 18,
        }}
      >
        <Link className="sl-link-btn gold" href="/onboarding/player?plan=redshirt">
          Redshirt
        </Link>
        <Link className="sl-link-btn gold" href="/onboarding/player?plan=walk-on">
          Walk-On
        </Link>
        <Link className="sl-link-btn gold" href="/onboarding/player?plan=all-american">
          All-American
        </Link>
        <Link className="sl-link-btn gold" href="/onboarding/team?plan=team">
          Teams
        </Link>
        <Link className="sl-link-btn" href="/onboarding/coach?plan=coach">
          College Coaches & Recruiters
        </Link>

        <div style={{ marginTop: 10 }}>
          <Link className="sl-link-btn" href="/pricing">
            Back to Pricing
          </Link>
        </div>
      </div>

      {/* Local styles matching your site's feel */}
      <style>{`
        .sl-link-btn {
          display:inline-block; padding:10px 14px; border-radius:10px;
          background: rgba(255,255,255,0.96); color:#0f172a; text-decoration:none;
          border:1px solid #e5e7eb; font-weight:800; margin: 0 6px;
          transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease, text-decoration-color .2s ease, border-color .2s ease;
        }
        .sl-link-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.18);
          background: #f3f4f6;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .sl-link-btn.gold { background:#caa042; color:#0f172a; border-color:#caa042; }
        .sl-link-btn.gold:hover { background:#d7b25e; border-color:#d7b25e; }
      `}</style>
    </div>
  );
}
