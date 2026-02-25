import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };
type StaffRole = "HEAD" | "ASSISTANT" | "RECRUITING" | "ADMIN";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

function normalizeRole(v: any): StaffRole {
  const raw = String(v ?? "").trim().toUpperCase();
  if (raw === "HEAD") return "HEAD";
  if (raw === "RECRUITING") return "RECRUITING";
  if (raw === "ADMIN") return "ADMIN";
  return "ASSISTANT";
}

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
  const invite: any = await prisma.coachInvite.findUnique({ where: { id: inviteId } });
  if (!invite) return NextResponse.json<Err>({ ok: false, error: "Invite not found." }, { status: 404 });
  if (invite.collegeId !== gate.collegeId) return NextResponse.json<Err>({ ok: false, error: "Forbidden." }, { status: 403 });

  if (invite.status !== "PENDING") {
    return NextResponse.json<Err>({ ok: false, error: "Only pending invites can be resent." }, { status: 400 });
  }

  const token = makeToken();
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const updated: any = await prisma.coachInvite.update({
    where: { id: inviteId },
    data: { tokenHash, expiresAt },
  });

  return NextResponse.json({
    ok: true,
    data: {
      rawToken: token,
      expiresAt: updated.expiresAt ? updated.expiresAt.toISOString() : null,
      invitedEmail: updated.invitedEmail,
      staffRole: normalizeRole(updated.staffRole ?? updated.role ?? "ASSISTANT"),
    },
  });
}
