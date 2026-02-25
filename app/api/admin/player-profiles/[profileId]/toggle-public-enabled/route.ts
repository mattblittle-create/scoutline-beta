//app/api/admin/player-profiles/[profileId]/toggle-public-enabled/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { logAdminAction } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: { profileId: string } }) {
  const { admin, roles } = await requireAdmin({ redirectTo: "/staff" });

  const can = roles.includes("SCOUTLINE_ADMIN") || roles.includes("SUPPORT_AGENT");
  if (!can) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const profileId = String(ctx?.params?.profileId || "").trim();
  if (!profileId) return NextResponse.json({ ok: false, error: "Missing profileId" }, { status: 400 });

  const profile = await prisma.playerProfile.findUnique({
    where: { id: profileId },
    select: { id: true, userId: true, email: true },
  });

  if (!profile?.userId) {
    return NextResponse.json({ ok: false, error: "No linked user for this profile." }, { status: 400 });
  }

  const player = await prisma.player.findUnique({
    where: { userId: profile.userId },
    select: { id: true, publicEnabled: true },
  });

  if (!player) return NextResponse.json({ ok: false, error: "Player row not found." }, { status: 404 });

  const nextVal = !player.publicEnabled;

  const updated = await prisma.player.update({
    where: { id: player.id },
    data: { publicEnabled: nextVal },
    select: { id: true, publicEnabled: true },
  });

  await logAdminAction({
    adminUserId: admin.id,
    actingUserId: profile.userId,
    action: "TOGGLE_PLAYER_PUBLIC_ENABLED",
    entityType: "Player",
    entityId: String(player.id),
    beforeJson: { publicEnabled: player.publicEnabled, profileId: profile.id, email: profile.email },
    afterJson: { publicEnabled: updated.publicEnabled, profileId: profile.id, email: profile.email },
  });

  return NextResponse.json({ ok: true, data: { publicEnabled: updated.publicEnabled } });
}
