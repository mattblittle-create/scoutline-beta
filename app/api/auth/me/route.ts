// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // IMPORTANT:
  // This endpoint is used by the header to decide Log In vs Log Out.
  // It should reflect REAL auth state only (scoutline_uid),
  // and NOT dev impersonation cookies/headers.
  const uid = cookies().get("scoutline_uid")?.value?.trim();
  if (!uid) return NextResponse.json({ ok: true, user: null });

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      collegeId: true,
      Player: {
        select: {
          plan: true,
        },
      },
      PlayerProfile: {
        select: {
          playerPlanTier: true,
          playerBillingStatus: true,
          hasActivePlayerBilling: true,
          hasActiveTeamBilling: true,
        },
      },
    },
  });

  if (!user) return NextResponse.json({ ok: true, user: null });

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      role: user.role ?? null,
      collegeId: user.collegeId ?? null,
      planTier:
        user.PlayerProfile?.playerPlanTier ??
        user.Player?.plan ??
        "REDSHIRT",
      billingStatus: user.PlayerProfile?.playerBillingStatus ?? null,
      hasActivePlayerBilling: user.PlayerProfile?.hasActivePlayerBilling ?? false,
      hasActiveTeamBilling: user.PlayerProfile?.hasActiveTeamBilling ?? false,
    },
  });
}
