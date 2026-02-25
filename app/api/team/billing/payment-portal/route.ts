// app/api/team/billing/payment-portal/route.ts
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
    where: { teamId, userId: viewer.id, role: "TEAM_ADMIN", isActive: true },
    select: { id: true },
  });

  return !!membership;
}

function randLast4() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return String(n);
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
    // ✅ DEV STUB:
    // Pretend we opened a payment portal and the user added/updated a card.
    // We simply upsert a TeamBillingProfile so the UI shows a billing method on file.
    await prisma.teamBillingProfile.upsert({
      where: { teamId },
      create: {
        teamId,
        provider: "VALOR",
        paymentType: "card",
        brand: "VISA",
        last4: randLast4(),
        providerCustomerId: `dev_cust_${teamId.slice(0, 8)}`,
        providerPaymentRef: `dev_pm_${Date.now()}`,
      },
      update: {
        paymentType: "card",
        brand: "VISA",
        last4: randLast4(),
        providerPaymentRef: `dev_pm_${Date.now()}`,
      },
      select: { id: true },
    });

    // send them back to billing page (your component already redirects)
    return NextResponse.json({
      ok: true,
      url: "/dashboard/team/billing",
      dev: true,
    });
  } catch (e: any) {
    return jsonError(e?.message || "Failed to open payment portal.", 500);
  }
}
