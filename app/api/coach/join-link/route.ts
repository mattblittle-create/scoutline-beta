// app/api/coach/join-link/route.ts

import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

function code() {
  return crypto.randomBytes(8).toString("hex");
}

function requireCollegeCoach(user: any) {
  if (!user?.id) return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  if (!user?.collegeId) return { ok: false as const, status: 403 as const, error: "Coach is not linked to a college." };

  if (process.env.NODE_ENV === "production") {
    const t = user?.coachProfile?.coachAccountType ?? null;
    if (t !== "COLLEGE_COACH") return { ok: false as const, status: 403 as const, error: "College Coach access required." };
  }

  return { ok: true as const, collegeId: user.collegeId as string };
}

export async function GET() {
  const user = await getCurrentUser();
  const gate = requireCollegeCoach(user);
  if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: gate.status });

  let link = await prisma.coachJoinLink.findFirst({
    where: { collegeId: gate.collegeId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!link) {
    link = await prisma.coachJoinLink.create({
      data: {
        collegeId: gate.collegeId,
        code: code(),
        isActive: true,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    data: {
      link: {
        id: link.id,
        code: link.code,
        isActive: link.isActive,
        createdAt: link.createdAt.toISOString(),
        updatedAt: link.updatedAt.toISOString(),
      },
    },
  });
}

export async function POST() {
  const user = await getCurrentUser();
  const gate = requireCollegeCoach(user);
  if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: gate.status });

  await prisma.coachJoinLink.updateMany({
    where: { collegeId: gate.collegeId, isActive: true },
    data: { isActive: false },
  });

  const link = await prisma.coachJoinLink.create({
    data: {
      collegeId: gate.collegeId,
      code: code(),
      isActive: true,
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      link: {
        id: link.id,
        code: link.code,
        isActive: link.isActive,
        createdAt: link.createdAt.toISOString(),
        updatedAt: link.updatedAt.toISOString(),
      },
    },
  });
}