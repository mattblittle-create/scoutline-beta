// app/api/billing/discount/apply/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DiscountTargetType } from "@prisma/client";
import { validateAndComputeDiscount } from "@/lib/billing/discounts";

const BATTERY_SPONSOR_EMAIL = "batterytrainingacademy@gmail.com";

// Codes that should never be generally redeemable
const RESTRICTED_CODES = new Set(["BATTERYBETA"]);

function normalizeCode(raw: any) {
  return String(raw || "").trim().toUpperCase();
}

function jsonError(status: number, error: string, extra?: any) {
  return NextResponse.json({ ok: false, error, ...(extra ? { extra } : {}) }, { status });
}

/** Accepts either enum-ish or label-ish plan tier and normalizes to what billing expects. */
function normalizePlanTier(raw: any) {
  const v = String(raw || "").trim();
  const u = v.toUpperCase();

  // already-friendly labels
  if (v === "Teams" || v === "Walk-On" || v === "All-American" || v === "Redshirt") return v;

  // enum-ish -> label
  if (u === "TEAM" || u === "TEAMS") return "Teams";
  if (u === "WALK_ON" || u === "WALKON") return "Walk-On";
  if (u === "ALL_AMERICAN" || u === "ALLAMERICAN") return "All-American";
  if (u === "REDSHIRT") return "Redshirt";

  // pass-through as last resort (validate will reject)
  return v;
}

function normalizeCadence(raw: any) {
  const v = String(raw || "").trim();
  const u = v.toUpperCase();
  if (v === "Monthly" || v === "Annual") return v;
  if (u === "MONTHLY") return "Monthly";
  if (u === "ANNUAL" || u === "YEARLY") return "Annual";
  return v;
}

// POST body:
// {
//   code: "HALFOFF3",
//   targetType: "TEAM" | "PLAYER",
//   targetId: "abc123",
//   planTier: "Teams" | "Walk-On" | "All-American" | "Redshirt"  (also accepts TEAM/WALK_ON/etc and normalizes)
//   cadence: "Monthly"
//   metadata?: {...},
//   requesterEmail?: "..."   // optional (beta); not trusted for restricted codes
// }
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const code = normalizeCode(body?.code);
    const targetTypeRaw = String(body?.targetType || "").trim().toUpperCase();
    const targetId = String(body?.targetId || "").trim();

    const planTier = normalizePlanTier(body?.planTier);
    const cadence = "Monthly";

    if (!code || !targetId || !planTier || !cadence) {
      return jsonError(400, "Missing required fields.");
    }

    const targetType =
      targetTypeRaw === "TEAM"
        ? DiscountTargetType.TEAM
        : targetTypeRaw === "PLAYER"
        ? DiscountTargetType.PLAYER
        : null;

    if (!targetType) {
      return jsonError(400, "Invalid targetType.");
    }

    /**
     * =========================
     * Restricted code protection (BATTERYBETA)
     * =========================
     * Since we don't have NextAuth/session in this repo, we cannot securely trust requesterEmail
     * from the client for restricted codes.
     *
     * For beta: require an admin secret header to apply restricted codes.
     * Later: replace with session/email-based authorization.
     */
    if (RESTRICTED_CODES.has(code)) {
      const secret = req.headers.get("x-billing-admin-secret") || "";
      const expected = process.env.BILLING_ADMIN_SECRET || "";

      if (!expected) {
        return jsonError(500, "Server is missing BILLING_ADMIN_SECRET.");
      }

      if (!secret || secret !== expected) {
        return jsonError(403, "Code is not eligible for this account.");
      }

      // Optional extra belt-and-suspenders: allow only battery email to be associated in metadata
      // (not used for auth; just stored as info)
      const requesterEmail = String(body?.requesterEmail || "").trim().toLowerCase();
      if (requesterEmail && requesterEmail !== BATTERY_SPONSOR_EMAIL) {
        body.requesterEmail = undefined;
      }
    }

    // =========================
    // Validate + compute first
    // (Do NOT revoke existing discount until new one is valid.)
    // =========================
    let computed: any;
    try {
      computed = await validateAndComputeDiscount({
        code,
        targetType,
        targetId,
        planTierRaw: planTier,
        cadenceRaw: cadence,
      });
    } catch (e: any) {
      // ✅ IMPORTANT: surface the real error in dev so we can fix fast
      const msg = e?.message || "validateAndComputeDiscount threw";
      console.error("validateAndComputeDiscount error:", e);
      return jsonError(
        400,
        `Invalid discount context: ${msg}`,
        process.env.NODE_ENV !== "production"
          ? { code, targetType: targetTypeRaw, targetId, planTier, cadence }
          : undefined
      );
    }

    if (!computed?.ok) {
      return jsonError(400, computed?.reason || "Discount not valid.");
    }

    // =========================
    // Enforce single active discount per target
    // Revoke existing ACTIVE *after* validation succeeds
    // =========================
    await prisma.discountApplication.updateMany({
      where: { targetType, targetId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    const app = await prisma.discountApplication.create({
      data: {
        discountCodeId: computed.discountCodeId,
        targetType,
        targetId,
        planTier: computed.planTier,
        cadence: computed.cadence,
        status: "ACTIVE",
        endsAt: computed.endsAt,
        metadata: body?.metadata ?? undefined,
      },
      include: { discountCode: true },
    });

    return NextResponse.json({
      ok: true,
      application: {
        id: app.id,
        code: app.discountCode.code,
        label: computed.discountLabel,
        amountOffCents: computed.discountAmountCents,
        basePriceCents: computed.basePriceCents,
        totalCents: computed.totalCents,
        endsAt: app.endsAt,
      },
    });
  } catch (err: any) {
    console.error("discount/apply error:", err);

    // ✅ In dev: return the actual message so you don’t have to guess
    if (process.env.NODE_ENV !== "production") {
      return jsonError(500, err?.message || "Server error applying code.", { stack: err?.stack });
    }

    return jsonError(500, "Server error applying code.");
  }
}