// app/api/admin/billing/commissions/recompute/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin/getAdminContext";
import type { DiscountTargetType, CommissionStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(status: number, error: string, extra?: any) {
  return NextResponse.json({ ok: false, error, ...(extra ?? {}) }, { status });
}

function normStr(v: any, max = 200) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

function asTargetType(v: any): DiscountTargetType | null {
  const t = String(v ?? "").trim().toUpperCase();
  if (t === "PLAYER" || t === "TEAM") return t as DiscountTargetType;
  return null;
}

function asBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
}

function asInt(v: any): number | null {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function days(n: number) {
  return n * 24 * 60 * 60 * 1000;
}

function addMs(d: Date, ms: number) {
  return new Date(d.getTime() + ms);
}

/**
 * Commission schedule (Option A rules → earns only after FIRST PAID invoice with > $0 collected)
 * Update these any time — recompute will fix the derived amounts.
 */
const COMMISSION_CENTS: Record<string, number> = {
  // Player plans
  "WALK_ON:monthly": 2000, // $20
  "WALK_ON:annual": 5000, // $50
  "ALL_AMERICAN:monthly": 4000, // $40
  "ALL_AMERICAN:annual": 10000, // $100
  // Team plan (placeholder)
  // "TEAM:monthly": 0,
  // "TEAM:annual": 0,
};

/**
 * Default eligibility delay:
 * You said commissions are paid after the first payment cycle + refund window
 * (≈ within 2 months of activation/payment).
 *
 * Default: 60 days after the qualifying paid invoice date.
 * Override with COMMISSION_ELIGIBILITY_DELAY_DAYS env var,
 * OR via request payload/query refundWindowDays (treated as override).
 */
const DEFAULT_ELIGIBILITY_DELAY_DAYS =
  Number(process.env.COMMISSION_ELIGIBILITY_DELAY_DAYS || "60") || 60;

/**
 * A "qualifying paid invoice" means:
 * - status === PAID
 * - paidAt is set
 * - AND amount collected > 0
 *
 * PlayerInvoice: amountPaidCents > 0 is best (fallback to amountCents)
 * TeamInvoice: no amountPaidCents field in your schema → use amountCents > 0
 */
type QualifyingInvoice =
  | {
      kind: "PLAYER";
      playerInvoiceId: string;
      paidAt: Date;
      billedAmountCents: number;
    }
  | {
      kind: "TEAM";
      teamInvoiceId: string;
      paidAt: Date;
      billedAmountCents: number;
    };

async function findQualifyingInvoiceForReferral(ref: {
  targetType: DiscountTargetType;
  targetId: string;
}): Promise<QualifyingInvoice | null> {
  if (ref.targetType === "PLAYER") {
    const inv = await prisma.playerInvoice.findFirst({
      where: {
        playerProfileId: ref.targetId,
        status: "PAID",
        paidAt: { not: null },
        OR: [{ amountPaidCents: { gt: 0 } }, { amountCents: { gt: 0 } }],
      },
      orderBy: { paidAt: "asc" },
      select: { id: true, paidAt: true, amountPaidCents: true, amountCents: true },
    });

    if (!inv?.paidAt) return null;

    const billed =
      Number(inv.amountPaidCents || 0) > 0
        ? Number(inv.amountPaidCents || 0)
        : Number(inv.amountCents || 0);

    if (billed <= 0) return null;

    return { kind: "PLAYER", playerInvoiceId: inv.id, paidAt: inv.paidAt, billedAmountCents: billed };
  }

  if (ref.targetType === "TEAM") {
    const inv = await prisma.teamInvoice.findFirst({
      where: {
        teamId: ref.targetId,
        status: "PAID",
        paidAt: { not: null },
        amountCents: { gt: 0 },
      },
      orderBy: { paidAt: "asc" },
      select: { id: true, paidAt: true, amountCents: true },
    });

    if (!inv?.paidAt) return null;

    const billed = Number(inv.amountCents || 0);
    if (billed <= 0) return null;

    return { kind: "TEAM", teamInvoiceId: inv.id, paidAt: inv.paidAt, billedAmountCents: billed };
  }

  return null;
}

async function getPlanContext(
  targetType: DiscountTargetType,
  targetId: string
): Promise<{ planTier: string; cadence: string } | null> {
  if (targetType === "PLAYER") {
    const p = await prisma.playerProfile.findUnique({
      where: { id: targetId },
      select: { playerPlanTier: true, playerBillingCadence: true },
    });
    if (!p) return null;
    return { planTier: String(p.playerPlanTier), cadence: String(p.playerBillingCadence || "monthly") };
  }

  if (targetType === "TEAM") {
    const t = await prisma.team.findUnique({
      where: { id: targetId },
      select: { planTier: true, billingCadence: true },
    });
    if (!t) return null;
    return { planTier: String(t.planTier), cadence: String(t.billingCadence || "monthly") };
  }

  return null;
}

function computeCommissionAmountCents(planTier: string, cadence: string): number {
  const key = `${String(planTier).toUpperCase()}:${String(cadence).toLowerCase()}`;
  return Number(COMMISSION_CENTS[key] || 0);
}

type RecomputeArgs = {
  targetType: DiscountTargetType | null;
  targetId: string;
  referralId: string;
  dryRun: boolean;
  eligibilityDelayDaysOverride: number | null;
};

async function runRecompute(args: RecomputeArgs) {
  const { targetType, targetId, referralId, dryRun, eligibilityDelayDaysOverride } = args;

  const eligibilityDelayDays =
    typeof eligibilityDelayDaysOverride === "number" && eligibilityDelayDaysOverride >= 0
      ? eligibilityDelayDaysOverride
      : DEFAULT_ELIGIBILITY_DELAY_DAYS;

  const where: any = {};
  if (referralId) where.id = referralId;
  if (targetType) where.targetType = targetType;
  if (targetId) where.targetId = targetId;

  const referrals = await prisma.referral.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: referralId ? 1 : 1500,
    select: {
      id: true,
      referrerUserId: true,
      targetType: true,
      targetId: true,
      sourceType: true,
      sourceCode: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const now = new Date();
  const stats = {
    referralsSeen: referrals.length,
    skippedNoReferrer: 0,
    skippedNoPlanContext: 0,
    pendingNoPaidInvoice: 0,
    created: 0,
    updated: 0,
    leftPaidUntouched: 0,
    errors: 0,
  };

  const touched: Array<{ referralId: string; commissionEventId?: string; action: string; note?: string }> = [];

  for (const ref of referrals) {
    try {
      if (!ref.referrerUserId) {
        stats.skippedNoReferrer += 1;
        touched.push({ referralId: ref.id, action: "SKIP", note: "No referrerUserId" });
        continue;
      }

      const planCtx = await getPlanContext(ref.targetType, ref.targetId);
      if (!planCtx) {
        stats.skippedNoPlanContext += 1;
        touched.push({ referralId: ref.id, action: "SKIP", note: "Missing plan context (target not found?)" });
        continue;
      }

      const qualifying = await findQualifyingInvoiceForReferral(ref);
      if (!qualifying) {
        // keep it visible in admin by having a single PENDING event per referral
        const existingPending = await prisma.commissionEvent.findFirst({
          where: { referralId: ref.id },
          orderBy: { earnedAt: "desc" },
          select: { id: true, status: true, payoutId: true },
        });

        if (!existingPending) {
          const commissionAmountCents = computeCommissionAmountCents(planCtx.planTier, planCtx.cadence);
          const eligibleAt = addMs(now, days(eligibilityDelayDays)); // placeholder until first paid invoice exists

          if (!dryRun) {
            const created = await prisma.commissionEvent.create({
              data: {
                referralId: ref.id,
                planTier: planCtx.planTier,
                cadence: planCtx.cadence,
                billedAmountCents: 0,
                commissionAmountCents,
                earnedAt: now,
                eligibleAt,
                status: "PENDING",
              },
              select: { id: true },
            });
            stats.created += 1;
            touched.push({
              referralId: ref.id,
              commissionEventId: created.id,
              action: "CREATE",
              note: "PENDING (no paid invoice yet)",
            });
          } else {
            stats.created += 1;
            touched.push({ referralId: ref.id, action: "DRY_CREATE", note: "Would create PENDING (no paid invoice yet)" });
          }
        } else {
          stats.pendingNoPaidInvoice += 1;
          touched.push({
            referralId: ref.id,
            commissionEventId: existingPending.id,
            action: "KEEP",
            note: "Still no paid invoice",
          });
        }

        continue;
      }

      const eligibleAt = addMs(qualifying.paidAt, days(eligibilityDelayDays));
      const computedStatus: CommissionStatus =
        now.getTime() >= eligibleAt.getTime() ? ("ELIGIBLE" as any) : ("PENDING" as any);

      const commissionAmountCents = computeCommissionAmountCents(planCtx.planTier, planCtx.cadence);

      // Prefer event linked to this invoice
      const existing = await prisma.commissionEvent.findFirst({
        where: {
          referralId: ref.id,
          ...(qualifying.kind === "PLAYER"
            ? { playerInvoiceId: qualifying.playerInvoiceId }
            : { teamInvoiceId: qualifying.teamInvoiceId }),
        },
        select: { id: true, status: true, payoutId: true },
      });

      const fallbackRecent = !existing
        ? await prisma.commissionEvent.findFirst({
            where: { referralId: ref.id },
            orderBy: { earnedAt: "desc" },
            select: { id: true, status: true, payoutId: true },
          })
        : null;

      const targetEvent = existing ?? fallbackRecent;

      // Never downgrade paid / payout-linked
      if (targetEvent && (String(targetEvent.status).toUpperCase() === "PAID" || targetEvent.payoutId)) {
        stats.leftPaidUntouched += 1;
        touched.push({ referralId: ref.id, commissionEventId: targetEvent.id, action: "SKIP", note: "Already PAID / has payoutId" });
        continue;
      }

      const dataUpdate: any = {
        planTier: planCtx.planTier,
        cadence: planCtx.cadence,
        billedAmountCents: qualifying.billedAmountCents,
        commissionAmountCents,
        earnedAt: qualifying.paidAt,
        eligibleAt,
        status: computedStatus,
        teamInvoiceId: qualifying.kind === "TEAM" ? qualifying.teamInvoiceId : null,
        playerInvoiceId: qualifying.kind === "PLAYER" ? qualifying.playerInvoiceId : null,
      };

      if (!targetEvent) {
        if (!dryRun) {
          const created = await prisma.commissionEvent.create({
            data: {
              referralId: ref.id,
              planTier: planCtx.planTier,
              cadence: planCtx.cadence,
              billedAmountCents: qualifying.billedAmountCents,
              commissionAmountCents,
              earnedAt: qualifying.paidAt,
              eligibleAt,
              status: computedStatus,
              teamInvoiceId: qualifying.kind === "TEAM" ? qualifying.teamInvoiceId : undefined,
              playerInvoiceId: qualifying.kind === "PLAYER" ? qualifying.playerInvoiceId : undefined,
            },
            select: { id: true },
          });
          stats.created += 1;
          touched.push({ referralId: ref.id, commissionEventId: created.id, action: "CREATE", note: "Linked to first paid invoice" });
        } else {
          stats.created += 1;
          touched.push({ referralId: ref.id, action: "DRY_CREATE", note: "Would create linked commission event" });
        }
      } else {
        if (!dryRun) {
          await prisma.commissionEvent.update({
            where: { id: targetEvent.id },
            data: dataUpdate,
            select: { id: true },
          });
          stats.updated += 1;
          touched.push({ referralId: ref.id, commissionEventId: targetEvent.id, action: "UPDATE", note: "Recomputed from invoices" });
        } else {
          stats.updated += 1;
          touched.push({ referralId: ref.id, commissionEventId: targetEvent.id, action: "DRY_UPDATE", note: "Would update commission event" });
        }
      }
    } catch (e: any) {
      stats.errors += 1;
      touched.push({ referralId: ref.id, action: "ERROR", note: e?.message || "Unknown error" });
      console.error("[commissions/recompute] referral error:", ref?.id, e);
    }
  }

  return {
    ok: true,
    dryRun,
    eligibilityDelayDays,
    stats,
    touched: touched.slice(0, 250),
    note:
      "This recompute uses invoices as source of truth. $0 invoices (free trial / sponsored) do NOT generate commission eligibility until a >$0 PAID invoice exists.",
  };
}

/**
 * GET: easy manual testing in browser
 * /api/admin/billing/commissions/recompute?dryRun=1&refundWindowDays=30
 */
export async function GET(req: Request) {
  const ctx = await getAdminContext();
  if (!ctx.ok) return jsonError(401, "Unauthorized.");

  const { searchParams } = new URL(req.url);
  const targetType = asTargetType(searchParams.get("targetType"));
  const targetId = normStr(searchParams.get("targetId"));
  const referralId = normStr(searchParams.get("referralId"));
  const dryRun = asBool(searchParams.get("dryRun"));
  const refundWindowDays = asInt(searchParams.get("refundWindowDays"));

  const res = await runRecompute({
    targetType,
    targetId,
    referralId,
    dryRun,
    eligibilityDelayDaysOverride: refundWindowDays,
  });

  return NextResponse.json(res);
}

/**
 * POST: what your admin UI should call
 * body: { dryRun?: boolean, refundWindowDays?: number, targetType?: "PLAYER"|"TEAM", targetId?: string, referralId?: string }
 */
export async function POST(req: Request) {
  const ctx = await getAdminContext();
  if (!ctx.ok) return jsonError(401, "Unauthorized.");

  let body: any = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const targetType = asTargetType(body?.targetType);
  const targetId = normStr(body?.targetId);
  const referralId = normStr(body?.referralId);
  const dryRun = asBool(body?.dryRun);
  const refundWindowDays = asInt(body?.refundWindowDays);

  const res = await runRecompute({
    targetType,
    targetId,
    referralId,
    dryRun,
    eligibilityDelayDaysOverride: refundWindowDays,
  });

  return NextResponse.json(res);
}