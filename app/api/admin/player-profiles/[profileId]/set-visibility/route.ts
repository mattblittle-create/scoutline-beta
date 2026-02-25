// app/api/admin/player-profiles/[profileId]/set-visibility/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { logAdminAction } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["PUBLIC", "PRIVATE", "TEAM_ONLY", "VERIFIED_ONLY"] as const;
type Visibility = (typeof ALLOWED)[number];

export async function POST(req: Request, ctx: { params: { profileId: string } }) {
  const { admin, roles } = await requireAdmin({ redirectTo: "/staff" });

  const can = roles.includes("SCOUTLINE_ADMIN") || roles.includes("SUPPORT_AGENT");
  if (!can) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const profileId = String(ctx?.params?.profileId || "").trim();
  if (!profileId) return NextResponse.json({ ok: false, error: "Missing profileId" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { visibility?: string };
  const raw = String(body.visibility || "").trim().toUpperCase();
  if (!ALLOWED.includes(raw as any)) {
    return NextResponse.json({ ok: false, error: "Invalid visibility" }, { status: 400 });
  }
  const visibility = raw as Visibility;

  const profile = await prisma.playerProfile.findUnique({
    where: { id: profileId },
    select: { id: true, userId: true, email: true },
  });

  if (!profile?.userId) {
    return NextResponse.json({ ok: false, error: "No linked user for this profile." }, { status: 400 });
  }

  const player = await prisma.player.findUnique({
    where: { userId: profile.userId },
    select: { id: true, publicVisibility: true },
  });

  if (!player) return NextResponse.json({ ok: false, error: "Player row not found." }, { status: 404 });

  const updated = await prisma.player.update({
    where: { id: player.id },
    data: { publicVisibility: visibility },
    select: { id: true, publicVisibility: true },
  });

  await logAdminAction({
    adminUserId: admin.id,
    actingUserId: profile.userId,
    action: "SET_PLAYER_PUBLIC_VISIBILITY",
    entityType: "Player",
    entityId: String(player.id),
    beforeJson: { publicVisibility: player.publicVisibility, profileId: profile.id, email: profile.email },
    afterJson: { publicVisibility: updated.publicVisibility, profileId: profile.id, email: profile.email },
  });

  return NextResponse.json({ ok: true, data: { publicVisibility: updated.publicVisibility } });
}
