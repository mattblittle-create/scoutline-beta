// app/api/admin/team-invites/[inviteId]/resend/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { logAdminAction } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function addDays(d: Date, days: number) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + days);
  return x;
}

export async function POST(_req: Request, ctx: { params: { inviteId: string } }) {
  const { admin, roles } = await requireAdmin("/staff");

  // Permission: Support + ScoutLine Admin can resend
  const can = roles.includes("SCOUTLINE_ADMIN") || roles.includes("SUPPORT_AGENT");
  if (!can) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const inviteId = String(ctx?.params?.inviteId || "").trim();
  if (!inviteId) return NextResponse.json({ ok: false, error: "Missing inviteId" }, { status: 400 });

  const invite = await prisma.teamInvite.findUnique({
    where: { id: inviteId },
    include: {
      team: { select: { id: true, name: true, slug: true } },
      createdByUser: { select: { id: true, email: true } },
      acceptedUser: { select: { id: true, email: true } },
    },
  });

  if (!invite) return NextResponse.json({ ok: false, error: "Invite not found" }, { status: 404 });

  // Don’t resend if already accepted
  if (invite.status === "ACCEPTED") {
    return NextResponse.json({ ok: false, error: "Invite already accepted." }, { status: 400 });
  }

  // Update expiry (extend window). We keep tokenHash the same so existing link remains valid.
  const before = {
    status: invite.status,
    invitedEmail: invite.invitedEmail,
    expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
  };

  const updated = await prisma.teamInvite.update({
    where: { id: invite.id },
    data: {
      status: "PENDING", // put it back to pending if it was expired/cancelled
      expiresAt: addDays(new Date(), 7),
      updatedAt: new Date(),
    },
    include: {
      team: { select: { id: true, name: true, slug: true } },
    },
  });

  const after = {
    status: updated.status,
    invitedEmail: updated.invitedEmail,
    expiresAt: updated.expiresAt ? updated.expiresAt.toISOString() : null,
  };

  // ✅ Audit trail regardless of whether email provider exists
  await logAdminAction({
    adminUserId: admin.id,
    actingUserId: null,
    action: "TEAM_INVITE_RESEND",
    entityType: "TeamInvite",
    entityId: updated.id,
    beforeJson: {
      ...before,
      teamId: updated.teamId,
      teamName: updated.team?.name ?? null,
    },
    afterJson: {
      ...after,
      teamId: updated.teamId,
      teamName: updated.team?.name ?? null,
    },
  });

  /**
   * Optional: call your mailer here.
   * If you already have a helper like sendTeamInviteEmail({ ... }),
   * import it and call it. For now, we return "queued".
   */

  return NextResponse.json({
    ok: true,
    data: {
      inviteId: updated.id,
      teamId: updated.teamId,
      teamSlug: updated.team?.slug ?? null,
      invitedEmail: updated.invitedEmail,
      status: updated.status,
      expiresAt: updated.expiresAt,
      emailStatus: "queued",
    },
  });
}
