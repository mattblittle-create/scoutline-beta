// app/api/coach/staff/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

function requireCollegeCoach(user: any) {
  if (!user?.id) return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  if (!user?.collegeId) return { ok: false as const, status: 403 as const, error: "Coach is not linked to a college." };
  return { ok: true as const, collegeId: user.collegeId as string, userId: user.id as string };
}

export async function GET(_req: Request) {
  const user = await getCurrentUser();
  const gate = requireCollegeCoach(user);
  if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: gate.status });

  const staff = await prisma.user.findMany({
    where: { collegeId: gate.collegeId },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      slug: true,
      workPhone: true,
      workPhoneExt: true,
      coachProfile: {
        select: {
          coachAccountType: true,
          staffTitle: true,
          isProgramAdmin: true,
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      collegeId: gate.collegeId,
      currentUserId: gate.userId,
      staff: staff.map((s) => ({
        id: s.id,
        name: s.name ?? null,
        email: s.email,
        slug: s.slug ?? null,
        workPhone: s.workPhone ?? null,
        workPhoneExt: s.workPhoneExt ?? null,
        staffTitle: s.coachProfile?.staffTitle ?? null,
        isProgramAdmin: !!s.coachProfile?.isProgramAdmin,
      })),
    },
  });
}
