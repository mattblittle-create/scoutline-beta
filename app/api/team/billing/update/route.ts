// app/api/team/billing/update/route.ts
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

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const teamId = String(body?.teamId || "").trim();
  const planTier = String(body?.planTier || "").trim(); // expected "TEAM" from UI

  if (!teamId) return jsonError("Missing teamId.", 400);

  const allowed = await canManageTeam(teamId);
  if (!allowed) return jsonError("Unauthorized.", 401);

  // Teams plan is fixed right now — keep this endpoint future-proof but safe.
  if (planTier && planTier !== "TEAM") {
    return jsonError("Teams billing only supports planTier=TEAM at this time.", 400);
  }

  try {
    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        planTier: "TEAM",
        billingCadence: "monthly",
      },
      select: {
        id: true,
        planTier: true,
        billingCadence: true,
        billingStatus: true,
      },
    });

    return NextResponse.json({ ok: true, data: { team: updated } });
  } catch (e: any) {
    return jsonError(e?.message || "Failed to update billing.", 500);
  }
}
