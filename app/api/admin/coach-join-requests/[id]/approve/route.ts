// app/api/admin/coach-join-requests/[id]/approve/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

function requireScoutLineAdmin(user: any) {
  if (!user?.id) return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  if (String(user.role || "").toUpperCase() !== "SCOUTLINE_ADMIN") {
    return { ok: false as const, status: 403 as const, error: "ScoutLine admin access required." };
  }
  return { ok: true as const };
}

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const user = await getCurrentUser();
  const gate = requireScoutLineAdmin(user);
  if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: gate.status });

  // ✅ TS narrowing: requireScoutLineAdmin does runtime checks, but TS can't infer that "user" is non-null here.
  const adminUser = user as NonNullable<typeof user>;

  const id = ctx.params.id;

  const reqRow = await prisma.coachJoinRequest.findUnique({
    where: { id },
    include: {
      requestedByUser: { select: { id: true, email: true, passwordHash: true } },
      college: { select: { id: true, name: true } },
    },
  });

  if (!reqRow) return NextResponse.json<Err>({ ok: false, error: "Join request not found." }, { status: 404 });
  if (reqRow.status !== ("PENDING" as any)) {
    return NextResponse.json<Err>({ ok: false, error: `Request is ${reqRow.status}.` }, { status: 400 });
  }

  const collegeId = reqRow.collegeId;

  // ✅ Bootstrap: first approved coach for this college becomes a program admin by default.
  const existingAdminCount = await prisma.coachProfile.count({
    where: {
      isProgramAdmin: true,
      user: { collegeId },
    },
  });
  const shouldBeAdmin = existingAdminCount === 0;

  // NOTE: We no longer write program roles to User.role (reserved for system roles like SCOUTLINE_ADMIN).
  // We store coach title on CoachProfile.staffTitle (handled elsewhere), and admin access on CoachProfile.isProgramAdmin.

  await prisma.$transaction(async (tx) => {
    // Attach user to college (grants access)
    await tx.user.update({
      where: { id: reqRow.requestedByUserId },
      data: {
        collegeId,
      },
    });

    // Ensure coach profile exists (free/no billing), and set admin flag for bootstrap if needed
    await tx.coachProfile.upsert({
      where: { userId: reqRow.requestedByUserId },
      create: {
        userId: reqRow.requestedByUserId,
        coachAccountType: "COLLEGE_COACH" as any,
        coachBillingStatus: "NONE" as any,
        recruitingTargets: [],
        isProgramAdmin: shouldBeAdmin,
      },
      update: shouldBeAdmin
        ? {
            coachAccountType: "COLLEGE_COACH" as any,
            coachBillingStatus: "NONE" as any,
            isProgramAdmin: true,
          }
        : {
            coachAccountType: "COLLEGE_COACH" as any,
            coachBillingStatus: "NONE" as any,
          },
    });

    // Mark request approved
    await tx.coachJoinRequest.update({
      where: { id: reqRow.id },
      data: {
        status: "APPROVED" as any,
        decidedAt: new Date(),
        decidedByUserId: adminUser.id,
      },
    });
  });

  return NextResponse.json({
    ok: true,
    data: {
      id: reqRow.id,
      status: "APPROVED",
      collegeId,
      isProgramAdmin: shouldBeAdmin,
    },
  });
}