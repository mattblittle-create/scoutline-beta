// app/api/admin/referrals/upsert/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin/getAdminContext";
import type { DiscountTargetType, ReferralSourceType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(status: number, error: string, extra?: any) {
  return NextResponse.json({ ok: false, error, ...(extra ?? {}) }, { status });
}

function normEmail(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  return s.includes("@") ? s : "";
}

function normStr(v: any, max = 500) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

function asTargetType(v: any): DiscountTargetType | null {
  const t = String(v ?? "").trim().toUpperCase();
  if (t === "PLAYER" || t === "TEAM") return t as DiscountTargetType;
  return null;
}

function asSourceType(v: any): ReferralSourceType | null {
  // You defined: DISCOUNT_CODE | REFERRAL_LINK | MANUAL
  const t = String(v ?? "").trim().toUpperCase();
  if (t === "DISCOUNT_CODE" || t === "REFERRAL_LINK" || t === "MANUAL") return t as ReferralSourceType;
  return null;
}

/**
 * Admin-only: Create/update the canonical Referral row for a target.
 *
 * POST body:
 * {
 *   referrerEmail: "someone@domain.com" | null,
 *   targetType: "PLAYER" | "TEAM",
 *   targetId: "cuid...",
 *   sourceType?: "MANUAL" | "DISCOUNT_CODE" | "REFERRAL_LINK",
 *   sourceCode?: string,
 *   note?: string
 * }
 *
 * Rules:
 * - One Referral per target (unique by targetType + targetId). Replaces any existing referrer when re-submitted.
 * - If referrerEmail is missing/blank, clears the referrerUserId (keeps the referral record).
 */
export async function POST(req: Request) {
  const ctx = await getAdminContext();
  if (!ctx.ok) return jsonError(401, "Unauthorized.");

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  const targetType = asTargetType(body?.targetType);
  const targetId = normStr(body?.targetId, 200);
  if (!targetType) return jsonError(400, "Invalid targetType. Expected TEAM or PLAYER.");
  if (!targetId) return jsonError(400, "Missing targetId.");

  const referrerEmail = normEmail(body?.referrerEmail);
  const sourceType = asSourceType(body?.sourceType) ?? ("MANUAL" as any);
  const sourceCode = normStr(body?.sourceCode, 120) || null;
  const note = normStr(body?.note, 500) || null;

  // Find the referrer user (optional)
  const referrerUser =
    referrerEmail.length > 0
      ? await prisma.user.findUnique({
          where: { email: referrerEmail },
          select: { id: true, email: true, name: true },
        })
      : null;

  // If they provided an email but we didn't find a user, fail loudly (admin can fix typo)
  if (referrerEmail && !referrerUser) {
    return jsonError(404, "Referrer user not found for that email.", { referrerEmail });
  }

  const referrerUserId = referrerUser?.id ?? null;

  try {
    /**
     * Prefer an upsert using the compound unique key.
     * If your schema DOES NOT have @@unique([targetType, targetId]),
     * Prisma won't generate targetType_targetId and this will throw — we fallback below.
     */
    let referral: any;
    try {
      referral = await prisma.referral.upsert({
        where: {
          // Prisma generates this name when you have @@unique([targetType, targetId])
          targetType_targetId: { targetType, targetId },
        } as any,
        create: {
          referrerUserId,
          targetType: targetType as any,
          targetId,
          sourceType: sourceType as any,
          sourceCode,
          note,
        },
        update: {
          referrerUserId,
          sourceType: sourceType as any,
          sourceCode,
          note,
        },
        include: {
          referrerUser: { select: { id: true, email: true, name: true } },
          commissions: { select: { id: true }, take: 1 },
        },
      });
    } catch (e) {
      // Fallback path if compound unique isn't available
      const existing = await prisma.referral.findFirst({
        where: { targetType: targetType as any, targetId },
        select: { id: true },
      });

      if (existing?.id) {
        referral = await prisma.referral.update({
          where: { id: existing.id },
          data: {
            referrerUserId,
            sourceType: sourceType as any,
            sourceCode,
            note,
          },
          include: {
            referrerUser: { select: { id: true, email: true, name: true } },
            commissions: { select: { id: true }, take: 1 },
          },
        });
      } else {
        referral = await prisma.referral.create({
          data: {
            referrerUserId,
            targetType: targetType as any,
            targetId,
            sourceType: sourceType as any,
            sourceCode,
            note,
          },
          include: {
            referrerUser: { select: { id: true, email: true, name: true } },
            commissions: { select: { id: true }, take: 1 },
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      referral: {
        id: referral.id,
        targetType: referral.targetType,
        targetId: referral.targetId,
        sourceType: referral.sourceType,
        sourceCode: referral.sourceCode,
        note: referral.note,
        referrerUser: referral.referrerUser ?? null,
        createdAt: referral.createdAt,
        updatedAt: referral.updatedAt,
      },
    });
  } catch (err: any) {
    console.error("[admin/referrals/upsert] error:", err);
    return jsonError(500, err?.message || "Server error.");
  }
}
