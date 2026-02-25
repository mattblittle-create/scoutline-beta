// app/api/admin/discount-codes/[id]/update/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { logAdminAction } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { admin } = await requireAdmin({ redirectTo: "/staff" });

  const id = String(params?.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const before = await prisma.discountCode.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

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

  const durationMonths =
    durationType === "MONTHS" ? Number(body.durationMonths) : null;

  if (durationType === "MONTHS" && (!Number.isFinite(durationMonths) || durationMonths < 1 || durationMonths > 120)) {
    return NextResponse.json({ ok: false, error: "durationMonths must be 1–120" }, { status: 400 });
  }

  const expiresAt = body.expiresAt ? new Date(String(body.expiresAt)) : null;
  if (body.expiresAt && Number.isNaN(expiresAt!.getTime())) {
    return NextResponse.json({ ok: false, error: "Invalid expiresAt" }, { status: 400 });
  }

  const maxRedemptions = body.maxRedemptions === null || body.maxRedemptions === undefined
    ? null
    : Number(body.maxRedemptions);

  if (maxRedemptions !== null && (!Number.isFinite(maxRedemptions) || maxRedemptions < 1)) {
    return NextResponse.json({ ok: false, error: "maxRedemptions must be 1+ or null" }, { status: 400 });
  }

  const data: any = {
    type,
    value: Math.floor(value),
    appliesTo,
    plansAllowedJson: typeof body.plansAllowedJson === "string" ? body.plansAllowedJson : before.plansAllowedJson,
    cadence: body.cadence ?? null,
    durationType,
    durationMonths: durationType === "MONTHS" ? Math.floor(durationMonths as any) : null,
    expiresAt,
    maxRedemptions: maxRedemptions === null ? null : Math.floor(maxRedemptions),
    isActive: !!body.isActive,
    oncePerTarget: !!body.oncePerTarget,
    allowedTargetIdsJson: typeof body.allowedTargetIdsJson === "string" ? body.allowedTargetIdsJson : before.allowedTargetIdsJson,
  };

  const updated = await prisma.discountCode.update({ where: { id }, data });

  await logAdminAction({
    adminUserId: admin.id,
    actingUserId: null,
    action: "DISCOUNT_UPDATE",
    entityType: "DiscountCode",
    entityId: id,
    beforeJson: {
      id: before.id,
      code: before.code,
      type: before.type,
      value: before.value,
      appliesTo: before.appliesTo,
      plansAllowedJson: before.plansAllowedJson,
      cadence: before.cadence,
      durationType: before.durationType,
      durationMonths: before.durationMonths,
      expiresAt: before.expiresAt,
      maxRedemptions: before.maxRedemptions,
      isActive: before.isActive,
      oncePerTarget: before.oncePerTarget,
      allowedTargetIdsJson: before.allowedTargetIdsJson,
    },
    afterJson: {
      id: updated.id,
      code: updated.code,
      type: updated.type,
      value: updated.value,
      appliesTo: updated.appliesTo,
      plansAllowedJson: updated.plansAllowedJson,
      cadence: updated.cadence,
      durationType: updated.durationType,
      durationMonths: updated.durationMonths,
      expiresAt: updated.expiresAt,
      maxRedemptions: updated.maxRedemptions,
      isActive: updated.isActive,
      oncePerTarget: updated.oncePerTarget,
      allowedTargetIdsJson: updated.allowedTargetIdsJson,
    },
  });

  return NextResponse.json({ ok: true });
}
