// app/api/admin/discount-applications/resolve/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeStr(v: any) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  await requireAdmin({ redirectTo: "/staff" });

  const body = await req.json().catch(() => ({}));
  const targetType = safeStr(body.targetType);
  const query = safeStr(body.query);

  if (!query) return NextResponse.json({ ok: false, error: "Missing query" }, { status: 400 });
  if (targetType !== "PLAYER" && targetType !== "TEAM") {
    return NextResponse.json({ ok: false, error: "Invalid targetType" }, { status: 400 });
  }

  if (targetType === "PLAYER") {
    // Resolve to PlayerProfile.id (that’s your targetId for applications)
    const qLower = query.toLowerCase();

    const profile =
      (await prisma.playerProfile.findFirst({
        where: {
          OR: [
            { id: query },
            { email: { equals: qLower } },
            { email: { contains: qLower, mode: "insensitive" } },
            { userId: query },
          ],
        },
        select: {
          id: true,
          email: true,
          playerPlanTier: true,
          playerBillingCadence: true,
          user: { select: { id: true, slug: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      })) ?? null;

    if (!profile) {
      return NextResponse.json({ ok: false, error: "PlayerProfile not found for that query." }, { status: 404 });
    }

    const label = `${profile.email} · PlayerProfile ${profile.id.slice(0, 8)}…`;

    return NextResponse.json({
      ok: true,
      resolved: {
        targetType: "PLAYER",
        targetId: profile.id,
        label,
        planTier: String(profile.playerPlanTier ?? "REDSHIRT"),
        cadence: String(profile.playerBillingCadence ?? "monthly"),
      },
    });
  }

  // TEAM
  const team =
    (await prisma.team.findFirst({
      where: {
        OR: [
          { id: query },
          { slug: { equals: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        planTier: true,
        billingCadence: true,
      },
      orderBy: { createdAt: "desc" },
    })) ?? null;

  if (!team) {
    return NextResponse.json({ ok: false, error: "Team not found for that query." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    resolved: {
      targetType: "TEAM",
      targetId: team.id,
      label: `${team.name} (${team.slug}) · Team ${team.id.slice(0, 8)}…`,
      planTier: String(team.planTier ?? "TEAM"),
      cadence: String(team.billingCadence ?? "monthly"),
    },
  });
}
