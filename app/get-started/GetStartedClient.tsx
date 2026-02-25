// app/get-started/GetStartedClient.tsx

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type CanonPlan = "redshirt" | "walk-on" | "all-american" | "team" | "coach";
type Billing = "monthly" | "annual";

function normalizeSlug(raw: string | null | undefined) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function canonicalizePlan(planRaw: string | null): CanonPlan | null {
  const p = normalizeSlug(planRaw);

  if (p === "coach") return "coach";
  if (p === "team" || p === "teams") return "team";
  if (p === "redshirt") return "redshirt";
  if (p === "walkon" || p === "walk-on") return "walk-on";
  if (p === "allamerican" || p === "all-american") return "all-american";

  return null;
}

function normalizeBilling(billingRaw: string | null): Billing | null {
  const b = normalizeSlug(billingRaw);
  if (b === "annual") return "annual";
  if (b === "monthly") return "monthly";
  return null;
}

function planSupportsAnnual(plan: CanonPlan): boolean {
  return plan === "walk-on" || plan === "all-american";
}

export default function GetStartedClient() {
  const router = useRouter();
  const search = useSearchParams();

  const planParam = search.get("plan");
  const billingParam = search.get("billing");

  const plan = React.useMemo(() => canonicalizePlan(planParam), [planParam]);
  const billing = React.useMemo(() => normalizeBilling(billingParam), [billingParam]);

  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setError(null);

    if (!plan) {
      setError("Missing or invalid plan selection.");
      return;
    }

    // Decide billing to carry forward (optional)
    let billingToUse: Billing | null = billing;
    if (billingToUse === "annual" && !planSupportsAnnual(plan)) {
      billingToUse = "monthly"; // fallback for plans without annual
    }

    const qs = billingToUse ? `?billing=${encodeURIComponent(billingToUse)}` : "";
    const target = `/onboarding/${encodeURIComponent(plan)}${qs}`;

    router.replace(target);
  }, [plan, billing, router]);

  // If we redirected quickly, user will barely see this.
  return (
    <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>
        Getting things ready…
      </h1>
      <p style={{ marginTop: 8, color: "#475569" }}>
        Taking you to onboarding now.
      </p>

      {error && (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#7f1d1d",
            borderRadius: 10,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <Link
          href="/pricing"
          style={{
            display: "inline-block",
            padding: "10px 14px",
            borderRadius: 10,
            background: "#fff",
            color: "#0f172a",
            textDecoration: "none",
            border: "1px solid #e5e7eb",
            fontWeight: 900,
          }}
        >
          Back to Pricing
        </Link>
      </div>
    </section>
  );
}
