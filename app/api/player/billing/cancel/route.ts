// app/api/player/billing/cancel/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function endOfCurrentMonth(now: Date) {
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return new Date(nextMonthStart.getTime() - 1);
}

function endOfMonth12MonthsFromNow(now: Date) {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextYearSameMonthStart = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 12, 1);
  return new Date(nextYearSameMonthStart.getTime() - 1);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const playerProfileId = String(body?.playerProfileId || "").trim();
    if (!playerProfileId) {
      return NextResponse.json({ ok: false, error: "Missing playerProfileId" }, { status: 400 });
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
      return NextResponse.json({ ok: false, error: "Player profile not found" }, { status: 404 });
    }

    const now = new Date();
    const cadence = String((profile as any).playerBillingCadence || "monthly") as "monthly" | "annual";

    // Compute effective end-of-period
    const effectiveAt = cadence === "annual" ? endOfMonth12MonthsFromNow(now) : endOfCurrentMonth(now);

    // If cancellation already scheduled in the future, keep it (idempotent)
    const existingEffective = (profile as any).playerCancelEffectiveAt as Date | null;
    if (existingEffective && existingEffective.getTime() > now.getTime()) {
      return NextResponse.json({
        ok: true,
        effectiveAt: existingEffective,
        message: "Cancellation is already scheduled.",
      });
    }

    // ✅ IMPORTANT DEV NORMALIZATION:
    // If playerBillingStatus was previously set to "Canceled" during earlier dev iterations,
    // we convert it back to "Active" so the account remains accessible until effectiveAt.
    const wasHardCanceled = (profile as any).playerBillingStatus === "Canceled";

    await prisma.playerProfile.update({
      where: { id: playerProfileId },
      data: {
        playerCancelRequestedAt: now,
        playerCancelEffectiveAt: effectiveAt,

        // keep access until effectiveAt (status should stay Active until cutoff)
        ...(wasHardCanceled ? ({ playerBillingStatus: "Active" } as any) : {}),
      } as any,
    });

    return NextResponse.json({
      ok: true,
      effectiveAt,
      message: "Cancellation scheduled. Account will remain active until the end of the current billing period.",
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Failed" }, { status: 500 });
  }
}
