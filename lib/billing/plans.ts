// lib/billing/plans.ts

/**
 * Canonical billing primitives used across:
 * - discount validation/compute
 * - invoice generation
 * - admin tools
 *
 * IMPORTANT:
 * - cadence is canonicalized to lowercase: "monthly" | "annual"
 * - plan tier is canonicalized to UI-friendly labels:
 *   "Redshirt" | "Walk-On" | "All-American" | "Teams"
 */

export type Cadence = "monthly" | "annual";

// UI-friendly labels
export type PlanTierLabel = "Redshirt" | "Walk-On" | "All-American" | "Teams";

// DB / Prisma enum-style tiers (historical + current)
export type PlanTierDb = "REDSHIRT" | "WALK_ON" | "ALL_AMERICAN" | "TEAM";

// Unified key (supports legacy TEAM usage in some older billing code)
export type PlanTierKey = PlanTierLabel | "TEAM";

/**
 * ✅ OFFICIAL SCOUTLINE PRICING (cents)
 *
 * Teams: $39.95 per player / month (monthly only)
 * Redshirt: FREE
 * Walk-On: $24.95 monthly / $265 annual
 * All-American: $49.95 monthly / $510 annual
 */
const BASE_PLAN_PRICES_CENTS: Record<PlanTierLabel, Record<Cadence, number>> = {
  Redshirt: { monthly: 0, annual: 0 },
  "Walk-On": { monthly: 2495, annual: 26500 },
  "All-American": { monthly: 4995, annual: 51000 },
  Teams: { monthly: 3995, annual: 0 }, // 🚫 no annual Teams plan
};

/**
 * Export with TEAM alias so older code that references PLAN_PRICES_CENTS.TEAM keeps working.
 */
export const PLAN_PRICES_CENTS: Record<PlanTierKey, Record<Cadence, number>> = {
  ...BASE_PLAN_PRICES_CENTS,
  TEAM: BASE_PLAN_PRICES_CENTS.Teams,
};

/**
 * Normalize plan tier input (enum-ish or label-ish) => PlanTierLabel (or "" if invalid)
 *
 * Accepts:
 * - "WALK_ON" | "ALL_AMERICAN" | "REDSHIRT" | "TEAM"
 * - "Walk-On" | "All-American" | "Redshirt" | "Teams"
 * - "walkon" | "allamerican" | "teams" etc.
 */
export function normalizePlanTier(raw: any): PlanTierLabel | "" {
  const v = String(raw ?? "").trim();
  if (!v) return "";

  // already label format
  if (v === "Redshirt" || v === "Walk-On" || v === "All-American" || v === "Teams") return v;

  const u = v.toUpperCase().replace(/\s+/g, "");

  if (u === "REDSHIRT") return "Redshirt";
  if (u === "WALK_ON" || u === "WALKON") return "Walk-On";
  if (u === "ALL_AMERICAN" || u === "ALLAMERICAN") return "All-American";
  if (u === "TEAM" || u === "TEAMS") return "Teams";

  return "";
}

/**
 * Normalize cadence input => "monthly" | "annual" (or "" if invalid)
 *
 * Accepts:
 * - "monthly" | "annual"
 * - "Monthly" | "Annual"
 * - "YEARLY"
 */
export function normalizeCadence(raw: any): Cadence | "" {
  const v = String(raw ?? "").trim();
  if (!v) return "";

  const u = v.toUpperCase();
  if (u === "MONTHLY") return "monthly";
  if (u === "ANNUAL" || u === "YEARLY") return "annual";

  return "";
}

/**
 * Convenience: base price lookup (safe)
 */
export function basePriceCents(planTier: PlanTierLabel, cadence: Cadence): number {
  const byTier = BASE_PLAN_PRICES_CENTS[planTier];
  return byTier ? Number(byTier[cadence] ?? 0) : 0;
}