import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

function requireCollegeCoach(user: any) {
  if (!user?.id) return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  if (!user?.collegeId) return { ok: false as const, status: 403 as const, error: "Coach is not linked to a college." };
  return { ok: true as const, collegeId: user.collegeId as string };
}

export async function POST(_req: Request, ctx: { params: { inviteId: string } }) {
  const user = await getCurrentUser();
  const gate = requireCollegeCoach(user);
  if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: gate.status });

  const inviteId = ctx.params.inviteId;

  const invite = await prisma.coachInvite.findUnique({ where: { id: inviteId } });
  if (!invite) return NextResponse.json<Err>({ ok: false, error: "Invite not found." }, { status: 404 });
  if (invite.collegeId !== gate.collegeId) return NextResponse.json<Err>({ ok: false, error: "Forbidden." }, { status: 403 });

  if (invite.status === "ACCEPTED") {
    return NextResponse.json<Err>({ ok: false, error: "Cannot revoke an accepted invite." }, { status: 400 });
  }

  await prisma.coachInvite.update({
    where: { id: inviteId },
    data: { status: "REVOKED" as any },
  });

  return NextResponse.json({ ok: true });
}
