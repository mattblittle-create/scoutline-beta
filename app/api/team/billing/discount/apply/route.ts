import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const teamId = String(body?.teamId || "").trim();
    const type = body?.type; // "PERCENT" | "FIXED" | "FREE_TRIAL" | "OVERRIDE_PRICE"
    const value = Number(body?.value);

    const cadence = String(body?.cadence || "monthly");
    const planTier = String(body?.planTier || "TEAM");

    if (!teamId) return NextResponse.json({ ok: false, error: "Missing teamId" }, { status: 400 });
    if (!type) return NextResponse.json({ ok: false, error: "Missing type" }, { status: 400 });
    if (!Number.isFinite(value)) return NextResponse.json({ ok: false, error: "Missing value" }, { status: 400 });

    // Revoke any existing ACTIVE TEAM discount app for this team (keep history)
    await prisma.discountApplication.updateMany({
      where: { targetType: "TEAM", targetId: teamId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    // Create a dedicated “manual” DiscountCode for this team (so we remain schema-pure)
    const code = await prisma.discountCode.create({
      data: {
        code: `MANUAL_TEAM_${teamId}_${Date.now()}`,
        type,
        value: Math.trunc(value),
        appliesTo: "TEAM",
        plansAllowedJson: JSON.stringify([planTier]),
        cadence,
        durationType: "FOREVER",
        isActive: true,
        oncePerTarget: false,
      },
    });

    const app = await prisma.discountApplication.create({
      data: {
        discountCodeId: code.id,
        targetType: "TEAM",
        targetId: teamId,
        planTier,
        cadence,
        status: "ACTIVE",
        metadata: { source: "team_billing_admin" },
      },
    });

    return NextResponse.json({ ok: true, discountCodeId: code.id, applicationId: app.id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
