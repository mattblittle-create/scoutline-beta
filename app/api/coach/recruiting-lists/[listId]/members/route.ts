// app/api/coach/recruiting-lists/[listId]/members/route.ts
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

export async function POST(req: Request, ctx: { params: { listId: string } }) {
  const user = await getCurrentUser();
  const gate = requireCollegeCoach(user);
  if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: gate.status });

  const listId = ctx.params.listId;

  const list = await prisma.recruitingList.findUnique({ where: { id: listId } });
  if (!list) return NextResponse.json<Err>({ ok: false, error: "List not found." }, { status: 404 });
  if (list.collegeId !== gate.collegeId) return NextResponse.json<Err>({ ok: false, error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => ({} as any));
  const playerProfileId = String(body?.playerProfileId || "").trim();
  const label = String(body?.label || "").trim();

  if (!playerProfileId) {
    return NextResponse.json<Err>({ ok: false, error: "playerProfileId is required." }, { status: 400 });
  }

  try {
    const created = await prisma.recruitingListMember.create({
      data: {
        listId,
        playerProfileId,
        label: label || null,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        member: {
          listId: created.listId,
          playerProfileId: created.playerProfileId,
          label: created.label ?? null,
          addedAt: created.createdAt.toISOString(),
        },
      },
    });
  } catch (e: any) {
    if (String(e?.code || "") === "P2002") {
      return NextResponse.json<Err>({ ok: false, error: "Player is already in this list." }, { status: 409 });
    }
    return NextResponse.json<Err>({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
