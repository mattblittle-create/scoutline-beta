// app/api/team/billing/cancel/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function canManageTeam(teamId: string) {
  // 1) DEV cookie override
  const cookieStore = cookies();
  const devTeamId = String(cookieStore.get("scoutline_dev_teamId")?.value || "").trim();
  if (devTeamId && devTeamId === teamId) return true;

  // 2) Real auth: TEAM_ADMIN membership for team
  const viewer = await getCurrentUser().catch(() => null);
  if (!viewer?.id) return false;

  const membership = await prisma.teamMembership.findFirst({
    where: {
      teamId,
      userId: viewer.id,
      role: "TEAM_ADMIN",
      isActive: true,
    },
    select: { id: true },
  });

  return !!membership;
}

// ✅ Recommended: end-of-current paid period for monthly billing.
// Using "start of next month" is clean and avoids end-of-day/timezone weirdness.
function startOfNextMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const teamId = String(body?.teamId || "").trim();
  if (!teamId) return jsonError("Missing teamId.", 400);

  const allowed = await canManageTeam(teamId);
  if (!allowed) return jsonError("Unauthorized.", 401);

  try {
    const now = new Date();

    const existing = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        billingStatus: true,
        cancelRequestedAt: true,
        cancelEffectiveAt: true,
      },
    });

    if (!existing) return jsonError("Team not found.", 404);

    // ✅ If already canceled, return state (idempotent)
    if (existing.billingStatus === "Canceled") {
      return NextResponse.json({
        ok: true,
        effectiveAt: existing.cancelEffectiveAt ? existing.cancelEffectiveAt.toISOString() : null,
        message: "This Teams account is already canceled.",
      });
    }

    // ✅ If cancellation is already scheduled in the future, do NOT move the date.
    // (prevents re-cancel pushing effectiveAt out another cycle)
    if (existing.cancelEffectiveAt && existing.cancelEffectiveAt.getTime() > now.getTime()) {
      return NextResponse.json({
        ok: true,
        effectiveAt: existing.cancelEffectiveAt.toISOString(),
        message: "Cancellation already scheduled.",
      });
    }

    // ✅ Schedule cancel at end of the current paid month (monthly billing)
    // Swap from addDays(now, 30) to a true period boundary.
    const effectiveAt = startOfNextMonth(now);

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        cancelRequestedAt: now,
        cancelEffectiveAt: effectiveAt,
        // billingStatus remains Active until effectiveAt passes;
        // getCurrentTeam() will enforce to "Canceled" when date passes.
      },
      select: {
        id: true,
        billingStatus: true,
        cancelRequestedAt: true,
        cancelEffectiveAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      effectiveAt: updated.cancelEffectiveAt ? updated.cancelEffectiveAt.toISOString() : null,
      message: "Cancellation scheduled.",
    });
  } catch (e: any) {
    return jsonError(e?.message || "Failed to cancel billing.", 500);
  }
}
