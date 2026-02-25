// app/api/admin/discount-codes/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { logAdminAction } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function onlyInt(n: any, fallback: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.floor(v);
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function parseDateTime(v: any): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeCadence(appliesTo: string, cadenceRaw: any): string | null {
  const applies = String(appliesTo || "BOTH").toUpperCase();
  if (applies === "TEAM") return "monthly";

  const c = String(cadenceRaw ?? "").trim().toLowerCase();
  if (c === "monthly" || c === "annual" || c === "both") return c;
  return "both";
}

function safePlanArray(plansAllowed: any): string[] {
  if (plansAllowed == null) return [];
  if (!Array.isArray(plansAllowed)) return [];
  return plansAllowed.map((x) => String(x)).filter(Boolean);
}

function safeId(v: any) {
  return String(v ?? "").trim();
}

/**
 * POST /api/admin/discount-codes/[id]
 * Body: { op: "toggle-active" }
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { admin } = await requireAdmin({ redirectTo: "/staff" });
  const id = safeId(params?.id);
  if (!id) return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({} as any));
    const op = String(body?.op ?? "").trim();

    if (op !== "toggle-active") {
      return NextResponse.json({ ok: false, error: "Unsupported op." }, { status: 400 });
    }

    const before = await prisma.discountCode.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

    const updated = await prisma.discountCode.update({
      where: { id },
      data: { isActive: !before.isActive },
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: "DISCOUNT_TOGGLE_ACTIVE",
      entityType: "DiscountCode",
      entityId: updated.id,
      beforeJson: before,
      afterJson: updated,
    });

    return NextResponse.json({ ok: true, data: { code: updated } });
  } catch (e: any) {
    console.error("discount toggle error:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/discount-codes/[id]
 * Body: editable fields (type/value/appliesTo/cadence/durationType/durationMonths/expiresAt/maxRedemptions/oncePerTarget/plansAllowed)
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { admin } = await requireAdmin({ redirectTo: "/staff" });
  const id = safeId(params?.id);
  if (!id) return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });

  try {
    const body = await req.json().catch(() => ({} as any));

    const before = await prisma.discountCode.findUnique({ where: { id } });
    if (!before) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

    const type = String(body.type ?? before.type).toUpperCase();
    const appliesTo = String(body.appliesTo ?? before.appliesTo).toUpperCase();
    const durationType = String(body.durationType ?? before.durationType).toUpperCase();

    // Integer-only rules
    let value = onlyInt(body.value ?? before.value, before.value);
    if (value < 0) value = 0;

    if (type === "PERCENT") value = clampInt(value, 0, 100);
    if (type === "FIXED") value = clampInt(value, 0, 100000);
    if (type === "OVERRIDE_PRICE") value = clampInt(value, 0, 100000);
    if (type === "FREE_TRIAL") value = 0;

    const cadence = normalizeCadence(appliesTo, body.cadence ?? before.cadence);

    const durationMonths =
      durationType === "MONTHS"
        ? clampInt(onlyInt(body.durationMonths ?? before.durationMonths, 1), 1, 60)
        : null;

    const expiresAt =
      body.expiresAt === null || String(body.expiresAt ?? "").trim() === ""
        ? null
        : parseDateTime(body.expiresAt) ?? before.expiresAt;

    const maxRedemptions =
      body.maxRedemptions === null || String(body.maxRedemptions ?? "").trim() === ""
        ? null
        : clampInt(onlyInt(body.maxRedemptions, before.maxRedemptions ?? 1), 1, 1000000);

    const oncePerTarget = body.oncePerTarget == null ? Boolean(before.oncePerTarget) : Boolean(body.oncePerTarget);

    const plansAllowed = safePlanArray(body.plansAllowed);
    const plansAllowedJson = JSON.stringify(plansAllowed);

    const updated = await prisma.discountCode.update({
      where: { id },
      data: {
        type: type as any,
        value,
        appliesTo: appliesTo as any,
        cadence,
        durationType: durationType as any,
        durationMonths,
        expiresAt,
        maxRedemptions,
        oncePerTarget,
        plansAllowedJson,
      },
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: "DISCOUNT_EDIT",
      entityType: "DiscountCode",
      entityId: updated.id,
      beforeJson: before,
      afterJson: updated,
    });

    return NextResponse.json({ ok: true, data: { code: updated } });
  } catch (e: any) {
    console.error("discount update error:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
