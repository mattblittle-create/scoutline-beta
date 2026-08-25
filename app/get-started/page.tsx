// app/get-started/page.tsx

import { redirect } from "next/navigation";

export const metadata = {
  title: "Get Started • ScoutLine",
  description: "Redirecting to onboarding.",
};

export const dynamic = "force-dynamic";

function normalizeSlug(raw: string | null) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function planSupportsAnnual(plan: string): boolean {
  return plan === "walk-on" || plan === "all-american";
}

export default function GetStartedPage({
  searchParams,
}: {
  searchParams: { plan?: string; billing?: string };
}) {
  const planRaw = normalizeSlug(searchParams?.plan ?? null);
  const billingRaw = normalizeSlug(searchParams?.billing ?? null);

  // canonicalize plan
  const plan =
    planRaw === "coach"
      ? "coach"
      : planRaw === "team" || planRaw === "teams"
      ? "team"
      : planRaw === "redshirt"
      ? "redshirt"
      : planRaw === "walkon" || planRaw === "walk-on"
      ? "walk-on"
      : planRaw === "allamerican" || planRaw === "all-american"
      ? "all-american"
      : null;

  // normalize billing
  let billing: "monthly" | "annual" | null =
    billingRaw === "annual" ? "annual" : billingRaw === "monthly" ? "monthly" : null;

  // If invalid plan, just send them to pricing
  if (!plan) redirect("/pricing");

  // billing only applies to the plans that support it
  if (billing === "annual" && !planSupportsAnnual(plan)) billing = "monthly";

  const qs = billing ? `?billing=${encodeURIComponent(billing)}` : "";

  // ✅ new routing rules
  if (plan === "coach") redirect(`/onboarding/coach${qs}`);
  if (plan === "team") redirect(`/onboarding/teams${qs}`);

  // player plans still live under /onboarding/[plan]
  redirect(`/onboarding/${encodeURIComponent(plan)}${qs}`);
}
