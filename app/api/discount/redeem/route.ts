// app/api/discount/redeem/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normCode(v: string) {
  return String(v || "").trim().toUpperCase();
}

function safeJsonArray(v: string | null | undefined): string[] {
  if (!v) return [];
  try {
    const parsed = JSON.parse(v);
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const codeInput = normCode(body?.code);
    const targetType = String(body?.targetType || "").trim(); // "TEAM" | "PLAYER"
    const targetId = String(body?.targetId || "").trim();
    const planTier = String(body?.planTier || "").trim();
    const cadence = String(body?.cadence || "").trim();

    if (!codeInput) return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
    if (!targetType || !["TEAM", "PLAYER"].includes(targetType)) {
      return NextResponse.json({ ok: false, error: "Invalid targetType" }, { status: 400 });
    }
    if (!targetId) return NextResponse.json({ ok: false, error: "Missing targetId" }, { status: 400 });
    if (!planTier) return NextResponse.json({ ok: false, error: "Missing planTier" }, { status: 400 });
    if (!cadence) return NextResponse.json({ ok: false, error: "Missing cadence" }, { status: 400 });

    const dc = await prisma.discountCode.findUnique({ where: { code: codeInput } });
    if (!dc) return NextResponse.json({ ok: false, error: "Code not found" }, { status: 404 });
    if (!dc.isActive) return NextResponse.json({ ok: false, error: "Code is not active" }, { status: 400 });
    if (dc.expiresAt && dc.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ ok: false, error: "Code expired" }, { status: 400 });
    }

    // appliesTo gating
    if (dc.appliesTo === "TEAM" && targetType !== "TEAM") {
      return NextResponse.json({ ok: false, error: "Code only applies to teams" }, { status: 400 });
    }
    if (dc.appliesTo === "PLAYER" && targetType !== "PLAYER") {
      return NextResponse.json({ ok: false, error: "Code only applies to players" }, { status: 400 });
    }

    // plan gating
    const plansAllowed = safeJsonArray(dc.plansAllowedJson);
    if (plansAllowed.length > 0 && !plansAllowed.includes(planTier)) {
      return NextResponse.json({ ok: false, error: "Code not valid for this plan" }, { status: 400 });
    }

    // cadence gating
    if (dc.cadence && dc.cadence !== cadence) {
      return NextResponse.json({ ok: false, error: "Code not valid for this cadence" }, { status: 400 });
    }

    // allowed target gating (best for “Battery only”)
    const allowedTargets = safeJsonArray(dc.allowedTargetIdsJson);
    if (allowedTargets.length > 0 && !allowedTargets.includes(targetId)) {
      return NextResponse.json({ ok: false, error: "Code not permitted for this account" }, { status: 400 });
    }

    // max redemptions gating
    if (typeof dc.maxRedemptions === "number") {
      const used = await prisma.discountApplication.count({ where: { discountCodeId: dc.id } });
      if (used >= dc.maxRedemptions) {
        return NextResponse.json({ ok: false, error: "Code has reached max redemptions" }, { status: 400 });
      }
    }

    // oncePerTarget gating
    if (dc.oncePerTarget) {
      const prior = await prisma.discountApplication.findFirst({
        where: { discountCodeId: dc.id, targetType: targetType as any, targetId },
        select: { id: true },
      });
      if (prior) {
        return NextResponse.json({ ok: false, error: "Code already redeemed for this account" }, { status: 400 });
      }
    }

    // ✅ ONE ACTIVE CODE AT A TIME (no stacking):
    // If there is an ACTIVE application, we will REPLACE it.
    const existingActive = await prisma.discountApplication.findFirst({
      where: {
        targetType: targetType as any,
        targetId,
        status: "ACTIVE",
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      orderBy: { appliedAt: "desc" },
      include: { discountCode: true },
    });

    if (existingActive?.discountCode?.code === dc.code) {
      // Redeeming the same code again is a no-op (and avoids wasting redemptions).
      return NextResponse.json({
        ok: true,
        message: "Code already active.",
        application: {
          id: existingActive.id,
          endsAt: existingActive.endsAt,
          code: existingActive.discountCode.code,
          type: existingActive.discountCode.type,
          value: existingActive.discountCode.value,
        },
      });
    }

    let replacedCode: string | null = null;
    if (existingActive) {
      replacedCode = existingActive.discountCode?.code ?? null;
      await prisma.discountApplication.updateMany({
        where: { targetType: targetType as any, targetId, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
    }

    // endsAt based on duration
    let endsAt: Date | null = null;
    if (dc.durationType === "ONCE") {
      endsAt = cadence === "annual" ? addMonths(new Date(), 12) : addMonths(new Date(), 1);
    } else if (dc.durationType === "MONTHS") {
      const m = typeof dc.durationMonths === "number" ? dc.durationMonths : 0;
      endsAt = m > 0 ? addMonths(new Date(), m) : null;
    }

    const app = await prisma.discountApplication.create({
      data: {
        discountCodeId: dc.id,
        targetType: targetType as any,
        targetId,
        planTier,
        cadence,
        status: "ACTIVE",
        appliedAt: new Date(),
        endsAt: endsAt ?? undefined,
        metadata: { source: "self_redeem", replacedCode },
      },
      include: { discountCode: true },
    });

    return NextResponse.json({
      ok: true,
      message: replacedCode ? `Replaced ${replacedCode} with ${app.discountCode.code}` : "Code applied.",
      application: {
        id: app.id,
        endsAt: app.endsAt,
        code: app.discountCode.code,
        type: app.discountCode.type,
        value: app.discountCode.value,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
