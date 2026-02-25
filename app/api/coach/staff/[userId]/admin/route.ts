// app/api/coach/staff/[userId]/admin/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

function isScoutlineAdmin(user: any) {
  return String(user?.role || "").toUpperCase() === "SCOUTLINE_ADMIN";
}

export async function POST(req: Request, ctx: { params: { userId: string } }) {
  const session = await getCurrentUser();
  if (!session?.id) return NextResponse.json<Err>({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!session?.collegeId) return NextResponse.json<Err>({ ok: false, error: "Coach is not linked to a college." }, { status: 403 });

  const body = await req.json().catch(() => ({} as any));
  const nextVal = !!body?.isProgramAdmin;

  const me = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, collegeId: true, role: true, coachProfile: { select: { isProgramAdmin: true } } },
  });

  if (!me?.id) return NextResponse.json<Err>({ ok: false, error: "Unauthorized" }, { status: 401 });

  const allowed = isScoutlineAdmin(me) || !!me.coachProfile?.isProgramAdmin;
  if (!allowed) return NextResponse.json<Err>({ ok: false, error: "Program admin access required." }, { status: 403 });

  const targetUserId = String(ctx.params.userId || "").trim();
  if (!targetUserId) return NextResponse.json<Err>({ ok: false, error: "Missing userId." }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, collegeId: true, coachProfile: { select: { isProgramAdmin: true } } },
  });

  if (!target) return NextResponse.json<Err>({ ok: false, error: "User not found." }, { status: 404 });
  if (target.collegeId !== me.collegeId) return NextResponse.json<Err>({ ok: false, error: "Forbidden." }, { status: 403 });

  // Prevent unchecking the last remaining admin
  if (!nextVal && !!target.coachProfile?.isProgramAdmin) {
    const adminCount = await prisma.coachProfile.count({
      where: { isProgramAdmin: true, user: { collegeId: me.collegeId } },
    });
    if (adminCount <= 1) {
      return NextResponse.json<Err>({ ok: false, error: "At least one program admin is required." }, { status: 400 });
    }
  }

  await prisma.coachProfile.upsert({
    where: { userId: targetUserId },
    create: {
      userId: targetUserId,
      isProgramAdmin: nextVal,
      coachAccountType: "COLLEGE_COACH" as any,
      coachBillingStatus: "NONE" as any,
      recruitingTargets: [],
    },
    update: { isProgramAdmin: nextVal },
  });

  return NextResponse.json({ ok: true });
}
