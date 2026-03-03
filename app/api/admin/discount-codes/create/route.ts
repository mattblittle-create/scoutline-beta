// app/api/admin/discount-codes/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { logAdminAction } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normCode(s: any) {
  return String(s ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_-]/g, "");
}

export async function POST(req: Request) {
  const { admin } = await requireAdmin({ redirectTo: "/staff" });

  try {
    const body = await req.json().catch(() => ({}));

    const code = normCode(body.code);
    if (!code || code.length < 3) {
      return NextResponse.json({ ok: false, error: "Invalid code" }, { status: 400 });
    }

    const type = body.type;
    const value = Number(body.value);

    if (!type || !["PERCENT", "FIXED", "FREE_TRIAL", "OVERRIDE_PRICE"].includes(String(type))) {
      return NextResponse.json({ ok: false, error: "Invalid type" }, { status: 400 });
    }
    if (!Number.isFinite(value) || value < 0) {
      return NextResponse.json({ ok: false, error: "Invalid value" }, { status: 400 });
    }
    if (type === "PERCENT" && (value < 1 || value > 100)) {
      return NextResponse.json({ ok: false, error: "PERCENT must be 1–100" }, { status: 400 });
    }

    const appliesTo = body.appliesTo;
    if (!appliesTo || !["PLAYER", "TEAM", "BOTH"].includes(String(appliesTo))) {
      return NextResponse.json({ ok: false, error: "Invalid appliesTo" }, { status: 400 });
    }

    const durationType = body.durationType;
    if (!durationType || !["ONCE", "MONTHS", "FOREVER"].includes(String(durationType))) {
      return NextResponse.json({ ok: false, error: "Invalid durationType" }, { status: 400 });
    }

    // ✅ Keep as number for TS (NaN means "not provided/invalid")
    const durationMonthsNum: number =
      durationType === "MONTHS" ? Number(body.durationMonths) : Number.NaN;

    if (
      durationType === "MONTHS" &&
      (!Number.isFinite(durationMonthsNum) || durationMonthsNum < 1 || durationMonthsNum > 120)
    ) {
      return NextResponse.json({ ok: false, error: "durationMonths must be 1–120" }, { status: 400 });
    }

    const expiresAt = body.expiresAt ? new Date(String(body.expiresAt)) : null;
    if (body.expiresAt && Number.isNaN(expiresAt!.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid expiresAt" }, { status: 400 });
    }

    const maxRedemptions =
      body.maxRedemptions === null || body.maxRedemptions === undefined ? null : Number(body.maxRedemptions);

    if (maxRedemptions !== null && (!Number.isFinite(maxRedemptions) || maxRedemptions < 1)) {
      return NextResponse.json({ ok: false, error: "maxRedemptions must be 1+ or null" }, { status: 400 });
    }

    const data: any = {
      code,
      type,
      value: Math.floor(value),
      appliesTo,
      plansAllowedJson: typeof body.plansAllowedJson === "string" ? body.plansAllowedJson : "[]",
      cadence: body.cadence ?? null,
      durationType,
      durationMonths: durationType === "MONTHS" ? Math.floor(durationMonthsNum) : null,
      expiresAt,
      maxRedemptions: maxRedemptions === null ? null : Math.floor(maxRedemptions),
      isActive: !!body.isActive,
      oncePerTarget: !!body.oncePerTarget,
      allowedTargetIdsJson: typeof body.allowedTargetIdsJson === "string" ? body.allowedTargetIdsJson : "[]",
      createdByAdminUserId: admin.id,
    };

    const created = await prisma.discountCode.create({ data });

    await logAdminAction({
      adminUserId: admin.id,
      actingUserId: null,
      action: "DISCOUNT_CREATE",
      entityType: "DiscountCode",
      entityId: created.id,
      beforeJson: null,
      afterJson: {
        id: created.id,
        code: created.code,
        type: created.type,
        value: created.value,
        appliesTo: created.appliesTo,
        cadence: created.cadence,
        durationType: created.durationType,
        durationMonths: created.durationMonths,
        expiresAt: created.expiresAt,
        maxRedemptions: created.maxRedemptions,
        isActive: created.isActive,
        oncePerTarget: created.oncePerTarget,
        plansAllowedJson: created.plansAllowedJson,
        allowedTargetIdsJson: created.allowedTargetIdsJson,
      },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    console.error("discount create error:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}