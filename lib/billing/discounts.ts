// lib/billing/discounts.ts

import { prisma } from "@/lib/prisma";
import type { DiscountTargetType } from "@prisma/client";
import { getBasePriceCents, normalizeCadence, normalizePlanTierDb, planTierLabelFromDb } from "./plans";

type Ok<T> = { ok: true } & T;
type Err = { ok: false; reason: string };

function safeJsonArray(v: any): string[] {
  const s = String(v ?? "").trim();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function addMonths(d: Date, months: number) {
  const x = new Date(d.getTime());
  x.setMonth(x.getMonth() + months);
  return x;
}

/**
 * Validate + compute a discount application context.
 * This is used by:
 * - /api/billing/discount/apply (production UI / billing flows)
 * - admin tooling (if you reuse it there)
 */
export async function validateAndComputeDiscount(args: {
  code: string;
  targetType: DiscountTargetType;
  targetId: string;
  planTierRaw: any;
  cadenceRaw: any;
}): Promise<
  Ok<{
    discountCodeId: string;
    planTier: string;
    cadence: string;
    discountLabel: string;
    discountAmountCents: number;
    basePriceCents: number;
    totalCents: number;
    endsAt: Date | null;
  }> | Err
> {
  const code = String(args.code ?? "").trim().toUpperCase();
  if (!code) return { ok: false, reason: "Missing code." };

  const planTierDb = normalizePlanTierDb(args.planTierRaw);
  if (!planTierDb) return { ok: false, reason: "Invalid discount context: planTier." };

  const cadence = normalizeCadence(args.cadenceRaw);
  if (!cadence) return { ok: false, reason: "Invalid discount context: cadence." };

  // Fetch code
  const dc = await prisma.discountCode.findUnique({ where: { code } });
  if (!dc) return { ok: false, reason: "Code not found." };
  if (!dc.isActive) return { ok: false, reason: "Code is not active." };
  if (dc.expiresAt && dc.expiresAt.getTime() <= Date.now()) return { ok: false, reason: "Code expired." };

  // Applies-to gating
  if (dc.appliesTo === "TEAM" && args.targetType !== "TEAM") return { ok: false, reason: "Code only applies to teams." };
  if (dc.appliesTo === "PLAYER" && args.targetType !== "PLAYER") return { ok: false, reason: "Code only applies to players." };

  // Plan gating (✅ use DB plan keys everywhere)
  const allowedPlans = safeJsonArray(dc.plansAllowedJson); // should be ["REDSHIRT","WALK_ON",...]
  if (allowedPlans.length > 0 && !allowedPlans.includes(planTierDb)) {
    return { ok: false, reason: "Code is not eligible for this plan." };
  }

  // Cadence gating:
  // dc.cadence can be null | "monthly" | "annual" | "both"
  const dcCadence = String(dc.cadence ?? "").trim().toLowerCase();
  if (dcCadence && dcCadence !== "both" && dcCadence !== cadence) {
    return { ok: false, reason: "Code is not eligible for this billing cadence." };
  }

  // Target allowlist gating (optional)
  const allowedTargets = safeJsonArray(dc.allowedTargetIdsJson);
  if (allowedTargets.length > 0 && !allowedTargets.includes(args.targetId)) {
    return { ok: false, reason: "Code is not eligible for this account type." };
  }

  // Max redemptions gating
  if (typeof dc.maxRedemptions === "number") {
    const used = await prisma.discountApplication.count({ where: { discountCodeId: dc.id } });
    if (used >= dc.maxRedemptions) return { ok: false, reason: "Code has reached max redemptions." };
  }

  // Once-per-target gating
  if (dc.oncePerTarget) {
    const prior = await prisma.discountApplication.findFirst({
      where: { discountCodeId: dc.id, targetType: args.targetType, targetId: args.targetId },
      select: { id: true },
    });
    if (prior) return { ok: false, reason: "Code already redeemed for this account." };
  }

  // Compute base price
  const basePriceCents = getBasePriceCents(planTierDb, cadence);

  // Teams annual is not allowed (base price = 0 by our pricing table)
  if (planTierDb === "TEAM" && cadence === "annual") {
    return { ok: false, reason: "Teams plan does not support annual billing." };
  }

  // Compute discount
  let discountAmountCents = 0;
  let totalCents = basePriceCents;

  if (dc.type === "PERCENT") {
    const pct = Math.max(0, Math.min(100, Number(dc.value ?? 0)));
    discountAmountCents = Math.round((basePriceCents * pct) / 100);
    totalCents = Math.max(0, basePriceCents - discountAmountCents);
  } else if (dc.type === "FIXED") {
    // value stored as dollars in your admin UI → treat as dollars
    const dollarsOff = Math.max(0, Number(dc.value ?? 0));
    discountAmountCents = Math.round(dollarsOff * 100);
    totalCents = Math.max(0, basePriceCents - discountAmountCents);
  } else if (dc.type === "OVERRIDE_PRICE") {
    // value stored as dollars → becomes total price
    const dollars = Math.max(0, Number(dc.value ?? 0));
    totalCents = Math.round(dollars * 100);
    discountAmountCents = Math.max(0, basePriceCents - totalCents);
  } else if (dc.type === "FREE_TRIAL") {
    // FREE_TRIAL just sets total to 0 while active
    discountAmountCents = basePriceCents;
    totalCents = 0;
  }

  // Duration -> endsAt
  let endsAt: Date | null = null;
  if (dc.durationType === "ONCE") {
    endsAt = cadence === "annual" ? addMonths(new Date(), 12) : addMonths(new Date(), 1);
  } else if (dc.durationType === "MONTHS") {
    const m = typeof dc.durationMonths === "number" ? dc.durationMonths : 0;
    endsAt = m > 0 ? addMonths(new Date(), m) : null;
  } else {
    endsAt = null; // FOREVER
  }

  const planTierLabel = planTierLabelFromDb(planTierDb);
  const discountLabel =
    dc.type === "PERCENT"
      ? `${dc.value}% off`
      : dc.type === "FIXED"
      ? `$${dc.value} off`
      : dc.type === "OVERRIDE_PRICE"
      ? `Override to $${dc.value}`
      : "Free trial";

  return {
    ok: true,
    discountCodeId: dc.id,
    planTier: planTierLabel, // store friendly label in DiscountApplication for readability
    cadence,                 // store normalized cadence ("monthly" | "annual")
    discountLabel,
    discountAmountCents,
    basePriceCents,
    totalCents,
    endsAt,
  };
}