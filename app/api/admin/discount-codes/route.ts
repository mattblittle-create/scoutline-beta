import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { logAdminAction } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function upperCode(s: any) {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

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

  // TEAM locks cadence to monthly
  if (applies === "TEAM") return "monthly";

  const c = String(cadenceRaw ?? "").trim().toLowerCase();
  if (c === "monthly" || c === "annual" || c === "both") return c;

  // default for PLAYER/BOTH
  return "both";
}

function safePlanArray(plansAllowed: any): string[] {
  if (plansAllowed == null) return [];
  if (!Array.isArray(plansAllowed)) return [];
  return plansAllowed.map((x) => String(x)).filter(Boolean);
}

export async function GET() {
  await requireAdmin({ redirectTo: "/staff" });

  const codes = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ ok: true, data: { codes } });
}

export async function POST(req: Request) {
  const { admin } = await requireAdmin({ redirectTo: "/staff" });

  try {
    const body = await req.json().catch(() => ({} as any));

    const code = upperCode(body.code);
    if (code.length < 3) {
      return NextResponse.json({ ok: false, error: "Code too short." }, { status: 400 });
    }

    const type = String(body.type || "PERCENT").toUpperCase();
    const appliesTo = String(body.appliesTo || "BOTH").toUpperCase();
    const durationType = String(body.durationType || "ONCE").toUpperCase();

    // Integer-only rules
    let value = onlyInt(body.value, 0);
    if (value < 0) value = 0;

    if (type === "PERCENT") value = clampInt(value, 0, 100);
    if (type === "FIXED") value = clampInt(value, 0, 100000);
    if (type === "OVERRIDE_PRICE") value = clampInt(value, 0, 100000);
    if (type === "FREE_TRIAL") value = 0; // value disabled

    const cadence = normalizeCadence(appliesTo, body.cadence);

    const durationMonths =
      durationType === "MONTHS"
        ? clampInt(onlyInt(body.durationMonths, 1), 1, 60)
        : null;

    const expiresAt = parseDateTime(body.expiresAt);
    const maxRedemptions =
      body.maxRedemptions != null && String(body.maxRedemptions).trim() !== ""
        ? clampInt(onlyInt(body.maxRedemptions, 1), 1, 1000000)
        : null;

    const oncePerTarget = body.oncePerTarget == null ? true : Boolean(body.oncePerTarget);

    const plansAllowed = safePlanArray(body.plansAllowed);
    const plansAllowedJson = JSON.stringify(plansAllowed);

    const created = await prisma.discountCode.create({
      data: {
        code,
        type: type as any,
        value,
        appliesTo: appliesTo as any,
        cadence,
        durationType: durationType as any,
        durationMonths,
        expiresAt,
        maxRedemptions,
        isActive: true,
        oncePerTarget,
        plansAllowedJson,
        createdByAdminUserId: admin.id,
      },
    });

    await logAdminAction({
      adminUserId: admin.id,
      action: "DISCOUNT_CREATE",
      entityType: "DiscountCode",
      entityId: created.id,
      beforeJson: null,
      afterJson: created,
    });

    return NextResponse.json({ ok: true, data: { code: created } });
  } catch (e: any) {
    console.error("discount create error:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
