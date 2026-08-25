// app/api/admin/discount-applications/apply/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { logAdminAction } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function parseJsonArray(s: string): string[] {
  try {
    const v = JSON.parse(String(s || "[]"));
    return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  const { admin } = await requireAdmin("/staff");

  const body = await req.json().catch(() => ({}));
  const code = safeStr(body.code).toUpperCase();
  const targetType = safeStr(body.targetType);
  const targetId = safeStr(body.targetId);
  const planTier = safeStr(body.planTier);
  const cadence = safeStr(body.cadence);

  if (!code) return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
  if (targetType !== "PLAYER" && targetType !== "TEAM") {
    return NextResponse.json({ ok: false, error: "Invalid targetType" }, { status: 400 });
  }
  if (!targetId) return NextResponse.json({ ok: false, error: "Missing targetId" }, { status: 400 });
  if (!planTier) return NextResponse.json({ ok: false, error: "Missing planTier" }, { status: 400 });
  if (!cadence) return NextResponse.json({ ok: false, error: "Missing cadence" }, { status: 400 });

  const dc = await prisma.discountCode.findUnique({ where: { code } });
  if (!dc) return NextResponse.json({ ok: false, error: "Discount code not found" }, { status: 404 });

  // ✅ Validate: active + expiresAt
  if (!dc.isActive) return NextResponse.json({ ok: false, error: "Discount code is inactive." }, { status: 400 });
  if (dc.expiresAt && dc.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "Discount code has expired (expiresAt)." }, { status: 400 });
  }

  // ✅ Validate: appliesTo
  if (dc.appliesTo === "PLAYER" && targetType !== "PLAYER") {
    return NextResponse.json({ ok: false, error: "This code only applies to PLAYER targets." }, { status: 400 });
  }
  if (dc.appliesTo === "TEAM" && targetType !== "TEAM") {
    return NextResponse.json({ ok: false, error: "This code only applies to TEAM targets." }, { status: 400 });
  }

  // ✅ Validate: cadence restriction (if set)
  if (dc.cadence && dc.cadence.trim().toLowerCase() !== cadence.toLowerCase()) {
    return NextResponse.json({ ok: false, error: `Cadence mismatch. Code requires "${dc.cadence}".` }, { status: 400 });
  }

  // ✅ Validate: plansAllowedJson (if non-empty)
  const plansAllowed = parseJsonArray(dc.plansAllowedJson);
  if (plansAllowed.length && !plansAllowed.includes(planTier)) {
    return NextResponse.json({ ok: false, error: `Plan tier "${planTier}" not allowed for this code.` }, { status: 400 });
  }

  // ✅ Validate: allowedTargetIdsJson (if non-empty)
  const allowedTargets = parseJsonArray(dc.allowedTargetIdsJson);
  if (allowedTargets.length && !allowedTargets.includes(targetId)) {
    return NextResponse.json({ ok: false, error: "This target is not allowed for this code." }, { status: 400 });
  }

  // ✅ Validate: maxRedemptions (counts all applications, regardless of status)
  if (dc.maxRedemptions) {
    const total = await prisma.discountApplication.count({ where: { discountCodeId: dc.id } });
    if (total >= dc.maxRedemptions) {
      return NextResponse.json({ ok: false, error: "Max redemptions reached for this code." }, { status: 400 });
    }
  }

  // ✅ Validate: oncePerTarget (disallow any ACTIVE for same target)
  if (dc.oncePerTarget) {
    const existing = await prisma.discountApplication.findFirst({
      where: {
        discountCodeId: dc.id,
        targetType: targetType as any,
        targetId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ ok: false, error: "This code is once-per-target and is already ACTIVE for this target." }, { status: 400 });
    }
  }

  // ✅ Optional endsAt: only for MONTHS duration (FOREVER/ONCE are interpreted by billing engine)
  let endsAt: Date | null = null;
  if (dc.durationType === "MONTHS") {
    const m = dc.durationMonths ?? 0;
    if (m > 0) {
      const d = new Date();
      d.setMonth(d.getMonth() + m);
      endsAt = d;
    }
  }

  const created = await prisma.discountApplication.create({
    data: {
      discountCodeId: dc.id,
      targetType: targetType as any,
      targetId,
      planTier,
      cadence,
      status: "ACTIVE",
      endsAt,
      metadata: {
        appliedBy: "admin",
        code,
        discountType: dc.type,
        discountValue: dc.value,
        durationType: dc.durationType,
        durationMonths: dc.durationMonths ?? null,
      },
    },
  });

  await logAdminAction({
    adminUserId: admin.id,
    actingUserId: null,
    action: "DISCOUNT_APPLY",
    entityType: "DiscountApplication",
    entityId: created.id,
    beforeJson: null,
    afterJson: {
      id: created.id,
      discountCodeId: created.discountCodeId,
      targetType: created.targetType,
      targetId: created.targetId,
      planTier: created.planTier,
      cadence: created.cadence,
      status: created.status,
      endsAt: created.endsAt,
    },
  });

  return NextResponse.json({ ok: true, id: created.id });
}
