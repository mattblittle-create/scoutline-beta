// app/api/player/billing/cancel/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

async function resolveCancellationEffectiveAt(playerProfileId: string, cadence: "monthly" | "annual") {
  const now = new Date();

  const latestPaidInvoice = await prisma.playerInvoice.findFirst({
    where: {
      playerProfileId,
      status: "PAID",
      periodEnd: { gt: now },
    },
    orderBy: { periodEnd: "desc" },
    select: { periodEnd: true },
  });

  if (latestPaidInvoice?.periodEnd) {
    return latestPaidInvoice.periodEnd;
  }

  return cadence === "annual" ? addYears(now, 1) : addMonths(now, 1);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const playerProfileId = String(body?.playerProfileId || "").trim();

    if (!playerProfileId) {
      return NextResponse.json(
        { ok: false, error: "Missing playerProfileId" },
        { status: 400 }
      );
    }

    const profile = await prisma.playerProfile.findUnique({
      where: { id: playerProfileId },
      select: {
        id: true,
        playerBillingCadence: true,
        playerBillingStatus: true,
        playerCancelRequestedAt: true,
        playerCancelEffectiveAt: true,
      } as any,
    });

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Player profile not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const cadence =
      String((profile as any).playerBillingCadence || "monthly").toLowerCase() === "annual"
        ? "annual"
        : "monthly";

    const existingEffective = (profile as any).playerCancelEffectiveAt as Date | null;

    if (existingEffective && existingEffective.getTime() > now.getTime()) {
      return NextResponse.json({
        ok: true,
        effectiveAt: existingEffective,
        message:
          "Cancellation is already scheduled. Future renewals are stopped and access remains active through the current paid billing period.",
      });
    }

    const effectiveAt = await resolveCancellationEffectiveAt(playerProfileId, cadence);
    const wasHardCanceled = (profile as any).playerBillingStatus === "Canceled";

    await prisma.playerProfile.update({
      where: { id: playerProfileId },
      data: {
        playerCancelRequestedAt: now,
        playerCancelEffectiveAt: effectiveAt,
        ...(wasHardCanceled ? ({ playerBillingStatus: "Active" } as any) : {}),
      } as any,
    });

    return NextResponse.json({
      ok: true,
      effectiveAt,
      message:
        "Cancellation scheduled. Future renewals are stopped and access remains active through the current paid billing period. ScoutLine does not issue prorated refunds for partial billing periods.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed" },
      { status: 500 }
    );
  }
}