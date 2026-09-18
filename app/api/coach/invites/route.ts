// app/api/coach/invites/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

const ROLE_PRESETS = [
  "Head Coach",
  "Assistant Coach",
  "Pitching Coach",
  "Hitting Coach",
  "Fielding Coach",
  "Recruiting Coordinator",
  "Recruiting Staff",
  "Program Manager",
  "Program Staff",
  "General Manager",
] as const;

type StaffTitle = (typeof ROLE_PRESETS)[number];

function normalizeEmail(e: any) {
  return String(e ?? "").trim().toLowerCase();
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}

function normalizeTitle(v: any): StaffTitle {
  const raw = String(v ?? "").trim();
  const hit = ROLE_PRESETS.find((x) => x === raw);
  return hit || "Assistant Coach";
}

function requireCollegeCoach(user: any) {
  if (!user?.id) return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  if (!user?.collegeId) return { ok: false as const, status: 403 as const, error: "Coach is not linked to a college." };

  if (process.env.NODE_ENV === "production") {
    const t = user?.coachProfile?.coachAccountType ?? null;
    if (t !== "COLLEGE_COACH") {
      return { ok: false as const, status: 403 as const, error: "College Coach access required." };
    }
  }

  return { ok: true as const, collegeId: user.collegeId as string, userId: user.id as string };
}

function invitePublicToken(invite: any): string | null {
  return invite?.rawToken ? String(invite.rawToken) : null;
}

export async function GET(_req: Request) {
  const user = await getCurrentUser();
  const gate = requireCollegeCoach(user);
  if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: gate.status });

  const invites = await prisma.coachInvite.findMany({
    where: { collegeId: gate.collegeId },
    orderBy: { createdAt: "desc" },
    include: {
      createdByUser: { select: { name: true, email: true } },
      acceptedUser: { select: { name: true, email: true } },
    },
  });

  const now = new Date();
  const expiredIds = invites
    .filter((i) => i.status === "PENDING" && i.expiresAt && i.expiresAt.getTime() < now.getTime())
    .map((i) => i.id);

  if (expiredIds.length) {
    await prisma.coachInvite.updateMany({
      where: { id: { in: expiredIds } },
      data: { status: "EXPIRED" as any },
    });
  }

  const refreshed = await prisma.coachInvite.findMany({
    where: { collegeId: gate.collegeId },
    orderBy: { createdAt: "desc" },
    include: {
      createdByUser: { select: { name: true, email: true } },
      acceptedUser: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      invites: refreshed.map((i) => ({
        id: i.id,
        invitedEmail: i.invitedEmail,
        status: i.status,
        canEditLists: i.canEditLists,
        staffTitle: normalizeTitle(i.staffTitle),

        // IMPORTANT:
        // Existing invite links cannot be reconstructed from tokenHash.
        // A fresh rawToken is only available immediately after POST/resend.
        inviteToken: invitePublicToken(i),

        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
        expiresAt: i.expiresAt ? i.expiresAt.toISOString() : null,
        acceptedAt: i.acceptedAt ? i.acceptedAt.toISOString() : null,
        createdBy: i.createdByUser
          ? { name: i.createdByUser.name ?? null, email: i.createdByUser.email }
          : null,
        acceptedUser: i.acceptedUser
          ? { name: i.acceptedUser.name ?? null, email: i.acceptedUser.email }
          : null,
      })),
    },
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const gate = requireCollegeCoach(user);
  if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => ({} as any));
  const invitedEmail = normalizeEmail(body?.invitedEmail);
  const canEditLists = !!body?.canEditLists;
  const staffTitle = normalizeTitle(body?.staffTitle);

  if (!invitedEmail || !invitedEmail.includes("@")) {
    return NextResponse.json<Err>({ ok: false, error: "Valid invitedEmail is required." }, { status: 400 });
  }

  const token = makeToken();
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const existing = await prisma.coachInvite.findFirst({
    where: {
      collegeId: gate.collegeId,
      invitedEmail,
      status: "PENDING" as any,
    },
    select: { id: true },
  });

  const invite = existing
    ? await prisma.coachInvite.update({
        where: { id: existing.id },
        data: {
          tokenHash,
          expiresAt,
          canEditLists,
          staffTitle,
          status: "PENDING" as any,
        },
      })
    : await prisma.coachInvite.create({
        data: {
          collegeId: gate.collegeId,
          invitedEmail,
          tokenHash,
          expiresAt,
          canEditLists,
          staffTitle,
          createdByUserId: gate.userId,
          status: "PENDING" as any,
        },
      });

  return NextResponse.json({
    ok: true,
    data: {
      invite: {
        id: invite.id,
        invitedEmail: invite.invitedEmail,
        status: invite.status,
        canEditLists: invite.canEditLists,
        staffTitle: normalizeTitle(invite.staffTitle),
        inviteToken: token,
        createdAt: invite.createdAt.toISOString(),
        updatedAt: invite.updatedAt.toISOString(),
        expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
        acceptedAt: invite.acceptedAt ? invite.acceptedAt.toISOString() : null,
      },
      rawToken: token,
    },
  });
}