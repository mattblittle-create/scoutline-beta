// app/api/coach/recruiting-lists/[listId]/members/[playerProfileId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

function requireCollegeCoach(user: any) {
  if (!user) return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  if (!user.collegeId) return { ok: false as const, status: 403 as const, error: "Coach is not linked to a college." };

  if (process.env.NODE_ENV === "production") {
    const type = user?.coachProfile?.coachAccountType ?? null;
    if (type !== "COLLEGE_COACH") {
      return { ok: false as const, status: 403 as const, error: "College Coach access required." };
    }
  }

  return { ok: true as const, collegeId: user.collegeId as string };
}

export async function DELETE(_req: Request, ctx: { params: { listId: string; playerProfileId: string } }) {
  const user = await getCurrentUser();
  const gate = requireCollegeCoach(user);
  if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: gate.status });

  const listId = String(ctx.params.listId || "").trim();
  const playerProfileId = String(ctx.params.playerProfileId || "").trim();

  if (!listId || !playerProfileId) {
    return NextResponse.json<Err>({ ok: false, error: "listId and playerProfileId are required." }, { status: 400 });
  }

  // Ensure list exists + belongs to this college
  const list = await prisma.recruitingList.findUnique({ where: { id: listId } });
  if (!list) return NextResponse.json<Err>({ ok: false, error: "List not found." }, { status: 404 });
  if (list.collegeId !== gate.collegeId) return NextResponse.json<Err>({ ok: false, error: "Forbidden." }, { status: 403 });

  // Delete membership (idempotent: if it's already gone, we still return ok:true)
  await prisma.recruitingListMember.deleteMany({
    where: { listId, playerProfileId },
  });

  return NextResponse.json({ ok: true });
}
