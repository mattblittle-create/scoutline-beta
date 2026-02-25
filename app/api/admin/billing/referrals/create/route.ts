// app/api/admin/billing/referrals/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin/getAdminContext";
import { DiscountTargetType, ReferralSourceType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(status: number, error: string, extra?: any) {
  return NextResponse.json({ ok: false, error, ...(extra ? { extra } : {}) }, { status });
}

function normalizeEmail(raw: any) {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

function normalizeUpper(raw: any) {
  return String(raw ?? "")
    .trim()
    .toUpperCase();
}

function parseTargetType(raw: any): DiscountTargetType | null {
  const t = normalizeUpper(raw);
  if (t === "PLAYER") return DiscountTargetType.PLAYER;
  if (t === "TEAM") return DiscountTargetType.TEAM;
  return null;
}

function parseSourceType(raw: any): ReferralSourceType {
  const s = normalizeUpper(raw);
  if (s === "DISCOUNT_CODE") return ReferralSourceType.DISCOUNT_CODE;
  if (s === "REFERRAL_LINK") return ReferralSourceType.REFERRAL_LINK;
  if (s === "MANUAL") return ReferralSourceType.MANUAL;
  // default to MANUAL for safety
  return ReferralSourceType.MANUAL;
}

/**
 * POST /api/admin/billing/referrals/create
 *
 * Body:
 * {
 *   referrerUserId?: string,
 *   referrerEmail?: string,
 *   targetType: "PLAYER" | "TEAM",
 *   targetId: string,
 *   sourceType?: "MANUAL" | "DISCOUNT_CODE" | "REFERRAL_LINK",
 *   sourceCode?: string, // discount code, referral slug, etc.
 *   note?: string,
 *   overwriteReferrer?: boolean // default false; if true, will replace referrerUserId if referral exists
 * }
 *
 * Behavior:
 * - Upserts Referral by unique (targetType, targetId)
 * - If overwriteReferrer=false and Referral exists with a referrerUserId, we keep it
 * - If referrerEmail provided, we try to find user by email (no user -> referrerUserId remains null)
 * - Read-only "safe": no commission generation here (that’s recompute’s job)
 */
export async function POST(req: Request) {
  const ctx = await getAdminContext().catch(() => null);
  if (!ctx?.ok) return jsonError(401, "Unauthorized.");

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  const targetType = parseTargetType(body?.targetType);
  const targetId = String(body?.targetId ?? "").trim();

  if (!targetType) return jsonError(400, "Invalid targetType. Use PLAYER or TEAM.");
  if (!targetId) return jsonError(400, "Missing targetId.");

  const overwriteReferrer = Boolean(body?.overwriteReferrer);

  // Resolve referrerUserId from either explicit ID or email lookup
  const inputReferrerUserId = String(body?.referrerUserId ?? "").trim() || null;
  const inputReferrerEmail = normalizeEmail(body?.referrerEmail);

  let resolvedReferrerUserId: string | null = inputReferrerUserId;

  if (!resolvedReferrerUserId && inputReferrerEmail) {
    const u = await prisma.user.findUnique({
      where: { email: inputReferrerEmail },
      select: { id: true },
    });
    resolvedReferrerUserId = u?.id ?? null;
  }

  const sourceType = parseSourceType(body?.sourceType);
  const sourceCode = String(body?.sourceCode ?? "").trim() || null;
  const note = String(body?.note ?? "").trim() || null;

  // If referral already exists, decide whether we can/should replace referrer
  const existing = await prisma.referral.findFirst({
    where: { targetType, targetId },
    select: {
      id: true,
      referrerUserId: true,
      sourceType: true,
      sourceCode: true,
      note: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const finalReferrerUserId =
    overwriteReferrer
      ? resolvedReferrerUserId
      : existing?.referrerUserId
      ? existing.referrerUserId
      : resolvedReferrerUserId;

  try {
    const referral = await prisma.referral.upsert({
      where: {
        // requires @@unique([targetType, targetId]) on Referral
        targetType_targetId: { targetType, targetId } as any,
      },
      create: {
        referrerUserId: finalReferrerUserId,
        targetType,
        targetId,
        sourceType,
        sourceCode,
        note,
      },
      update: {
        // only set referrerUserId if we computed a value (or overwrite is true)
        ...(overwriteReferrer ? { referrerUserId: finalReferrerUserId } : finalReferrerUserId ? { referrerUserId: finalReferrerUserId } : {}),
        // allow updating metadata
        sourceType,
        sourceCode,
        note,
      },
      select: {
        id: true,
        referrerUserId: true,
        targetType: true,
        targetId: true,
        sourceType: true,
        sourceCode: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      referral,
      resolved: {
        inputReferrerEmail: inputReferrerEmail || null,
        resolvedReferrerUserId,
        overwriteReferrer,
        existedBefore: !!existing,
      },
      hint: "Next: POST /api/admin/billing/commissions/recompute to generate CommissionEvents when qualifying PAID invoices exist.",
    });
  } catch (err: any) {
    // Common failure: unique constraint missing or named differently
    const msg = err?.message || "Failed to upsert referral.";
    return jsonError(500, msg, {
      note:
        "If this complains about `targetType_targetId`, ensure Referral has @@unique([targetType, targetId]) so Prisma generates that compound unique input name.",
    });
  }
}
