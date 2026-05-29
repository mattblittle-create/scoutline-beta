// app/api/coach/program-verifications/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

async function requireProgramAdmin() {
  const user = await getCurrentUser();

  if (!user?.id || !user.collegeId) return null;

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
    select: { isProgramAdmin: true },
  });

  if (!coachProfile?.isProgramAdmin) return null;

  return user;
}

export async function GET() {
  const user = await requireProgramAdmin();

  if (!user?.id || !user.collegeId) {
    return NextResponse.json<Err>(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const submissions = await prisma.collegeProgramVerificationSubmission.findMany({
    where: {
      collegeId: user.collegeId,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      college: {
        select: {
          id: true,
          name: true,
          slug: true,
          division: true,
          conference: true,
          state: true,
        },
      },
      submittedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      reviewedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      submissions: submissions.map((s) => ({
        id: s.id,
        status: s.status,
        submittedData: s.submittedData,
        adminNotes: s.adminNotes,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString() : null,
        college: s.college,
        submittedByUser: s.submittedByUser,
        reviewedByUser: s.reviewedByUser,
      })),
    },
  });
}