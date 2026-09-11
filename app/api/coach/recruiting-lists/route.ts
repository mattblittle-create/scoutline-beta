// app/api/coach/recruiting-lists/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

function requireCollegeCoach(user: any) {
  // Allow college coaches if they have a collegeId.
  // In dev, coachProfile might be missing/null even though the user is a coach.
  if (!user?.collegeId) return { ok: false as const, error: "Coach is not linked to a college." };

  const type = user?.coachProfile?.coachAccountType ?? null;

  // Strict in prod, forgiving in dev
  if (process.env.NODE_ENV === "production") {
    if (type !== "COLLEGE_COACH") return { ok: false as const, error: "College Coach access required." };
  }

  return { ok: true as const, collegeId: user.collegeId as string };
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json<Err>({ ok: false, error: "Unauthorized" }, { status: 401 });

  const gate = requireCollegeCoach(user);
  if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const playerProfileId = String(searchParams.get("playerProfileId") || "").trim();

  const lists = await prisma.recruitingList.findMany({
    where: { collegeId: gate.collegeId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { members: true } },
      members: playerProfileId
        ? {
            where: { playerProfileId },
            select: {
              playerProfileId: true,
              createdAt: true,
              label: true,
            },
          }
        : false,
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      lists: lists.map((l) => ({
        id: l.id,
        name: l.name,
        description: l.description ?? null,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
        memberCount: (l as any)._count?.members ?? 0,
        containsPlayer: playerProfileId
          ? Array.isArray((l as any).members) && (l as any).members.length > 0
          : false,
        matchingMembers: playerProfileId && Array.isArray((l as any).members)
          ? (l as any).members.map((m: any) => ({
              playerProfileId: m.playerProfileId,
              label: m.label ?? null,
              addedAt: m.createdAt.toISOString(),
            }))
          : [],
      })),
    },
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json<Err>({ ok: false, error: "Unauthorized" }, { status: 401 });

  const gate = requireCollegeCoach(user);
  if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: 403 });

  const body = await req.json().catch(() => ({} as any));
  const name = String(body?.name || "").trim();
  const description = String(body?.description || "").trim();

  if (!name) return NextResponse.json<Err>({ ok: false, error: "List name is required." }, { status: 400 });

  try {
    const list = await prisma.recruitingList.create({
      data: {
        collegeId: gate.collegeId,
        name,
        description: description || null,
        createdByUserId: user.id,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        list: {
          id: list.id,
          name: list.name,
          description: list.description ?? null,
          createdAt: list.createdAt.toISOString(),
          updatedAt: list.updatedAt.toISOString(),
        },
      },
    });
  } catch (e: any) {
    // unique([collegeId,name]) collision
    if (String(e?.code || "") === "P2002") {
      return NextResponse.json<Err>({ ok: false, error: "A list with that name already exists." }, { status: 409 });
    }
    return NextResponse.json<Err>({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
