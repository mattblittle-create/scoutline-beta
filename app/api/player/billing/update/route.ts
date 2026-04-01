import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_PLANS = new Set(["REDSHIRT", "WALK_ON", "ALL_AMERICAN"]);
const ALLOWED_CADENCE = new Set(["monthly", "annual"]);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const playerProfileId = String(body?.playerProfileId || "").trim();
    const planTier = String(body?.planTier || "").trim();
    const billingCadence = String(body?.billingCadence || "").trim();

    if (!playerProfileId) return NextResponse.json({ ok: false, error: "playerProfileId required" }, { status: 400 });
    if (!ALLOWED_PLANS.has(planTier)) return NextResponse.json({ ok: false, error: "Invalid planTier" }, { status: 400 });
    if (!ALLOWED_CADENCE.has(billingCadence)) return NextResponse.json({ ok: false, error: "Invalid billingCadence" }, { status: 400 });

    await prisma.playerProfile.update({
      where: { id: playerProfileId },
      data: {
        playerPlanTier: planTier as any,
        playerBillingCadence: billingCadence,
      },
    });

// Keep Player.plan in sync with billing/profile plan tier.
// Public profile visibility reads Player.plan, so this must match.
const profile = await prisma.playerProfile.findUnique({
  where: { id: playerProfileId },
  select: { email: true },
});

if (profile?.email) {
  const user = await prisma.user.findFirst({
    where: { email: { equals: profile.email.toLowerCase(), mode: "insensitive" } },
    select: { id: true },
  });

  if (user?.id) {
    const nextPlan =
      planTier === "REDSHIRT" || planTier === "WALK_ON" || planTier === "ALL_AMERICAN"
        ? planTier
        : "REDSHIRT";

    await prisma.player.updateMany({
      where: { userId: user.id },
      data: { plan: nextPlan as any },
    });
  }
}

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}
