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

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}
