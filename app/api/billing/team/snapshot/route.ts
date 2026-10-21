// app/api/billing/team/snapshot/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLAN_PRICES_CENTS, normalizeCadence, normalizePlanTier } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

// GET /api/billing/team/snapshot?teamId=abc123&planTier=Teams&cadence=Monthly&orgName=Foo&seatsUsed=42
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const teamId = String(searchParams.get("teamId") || "").trim();
    const planTierRaw = String(searchParams.get("planTier") || "Teams").trim();
    const cadenceRaw = String(searchParams.get("cadence") || "monthly").trim(); // ✅ lowercase default
    const orgName = String(searchParams.get("orgName") || "Organization").trim();
    const seatsUsed = Number(searchParams.get("seatsUsed") || "0");

    if (!teamId) {
      return NextResponse.json({ ok: false, error: "Missing teamId." }, { status: 400 });
    }

    // ---- Normalize plan tier (fallback to Teams) ----
    const planTierNorm = normalizePlanTier(planTierRaw);
    const planTier = planTierNorm ? planTierNorm : "Teams";

    // ---- Normalize cadence to the actual keys used in PLAN_PRICES_CENTS ----
    // Your normalizeCadence likely returns "monthly"/"annual" (lowercase).
    // If it ever returns "" or null, fall back to "monthly".
    const cadenceNorm = normalizeCadence(cadenceRaw);
    const cadence = cadenceNorm ? cadenceNorm : "monthly";

    const basePriceCents = PLAN_PRICES_CENTS[planTier][cadence];

    // Find active discount application (1 active max by design)
    const active = await prisma.discountApplication.findFirst({
      where: { targetType: "TEAM", targetId: teamId, status: "ACTIVE" },
      include: { discountCode: true },
      orderBy: { appliedAt: "desc" },
    });

    let discount = null as null | {
      code: string;
      label: string;
      amountOffCents: number;
      activeUntilLabel?: string;
    };

    let totalCents = basePriceCents;

    if (active) {
      // Re-compute amountOff based on current plan price to avoid stale totals if you change pricing
      const dc = active.discountCode;

      let amountOffCents = 0;

      if (dc.type === "PERCENT") amountOffCents = Math.floor((basePriceCents * dc.value) / 100);
      if (dc.type === "FIXED") amountOffCents = dc.value;
      if (dc.type === "FREE_TRIAL") amountOffCents = basePriceCents;
      if (dc.type === "OVERRIDE_PRICE") amountOffCents = Math.max(0, basePriceCents - Math.max(0, dc.value));

      amountOffCents = Math.max(0, Math.min(basePriceCents, amountOffCents));
      totalCents = Math.max(0, basePriceCents - amountOffCents);

      discount = {
        code: dc.code,
        label:
          dc.type === "PERCENT"
            ? `${dc.value}% off`
            : dc.type === "FREE_TRIAL"
            ? "Free trial"
            : "Discount",
        amountOffCents,
        activeUntilLabel: active.endsAt ? active.endsAt.toLocaleDateString("en-US") : undefined,
      };
    }

    return NextResponse.json({
      ok: true,
      snapshot: {
        orgName,
        planName: planTier,
        cadence, // will be "monthly"/"annual"
        seatLabel: "Players",
        seatsUsed: Number.isFinite(seatsUsed) ? seatsUsed : 0,
        basePriceCents,
        discount,
        totalCents,
      },
    });
  } catch (err: any) {
    console.error("team/snapshot error:", err);
    return NextResponse.json({ ok: false, error: "Server error creating snapshot." }, { status: 500 });
  }
}