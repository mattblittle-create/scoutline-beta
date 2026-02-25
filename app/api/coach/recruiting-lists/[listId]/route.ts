// app/api/coach/recruiting-lists/[listId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

function requireCollegeCoach(user: any) {
  if (!user) return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  if (!user.collegeId) return { ok: false as const, status: 403 as const, error: "Coach is not linked to a college." };

  // Strictness in prod (optional)
  if (process.env.NODE_ENV === "production") {
    const type = user?.coachProfile?.coachAccountType ?? null;
    if (type !== "COLLEGE_COACH") {
      return { ok: false as const, status: 403 as const, error: "College Coach access required." };
    }
  }

  return { ok: true as const, collegeId: user.collegeId as string };
}

async function requireListAccess(user: any, listId: string) {
  const gate = requireCollegeCoach(user);
  if (!gate.ok) return gate;

  const list = await prisma.recruitingList.findUnique({
    where: { id: listId },
  });

  if (!list) return { ok: false as const, status: 404 as const, error: "List not found." };
  if (list.collegeId !== gate.collegeId) return { ok: false as const, status: 403 as const, error: "Forbidden." };

  return { ok: true as const, list, collegeId: gate.collegeId };
}

export async function GET(_req: Request, ctx: { params: { listId: string } }) {
  try {
    const user = await getCurrentUser();

    const listId = ctx.params.listId;
    const gate = await requireListAccess(user, listId);
    if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: gate.status });

const members = await prisma.recruitingListMember.findMany({
  where: { listId },
  orderBy: { createdAt: "desc" },
  include: {
    playerProfile: {
      select: {
        id: true,
        email: true,
        data: true, // ✅ player-entered phone lives here
        user: {
          select: {
            name: true,
            email: true,
            slug: true,
            photoUrl: true,
            phonePrivate: true,
            emailPrivate: true,
            Player: {
              select: {
                gradYear: true,
                primaryPos: true,
                secondaryPos: true,
                bats: true,
                throws: true,
                isCommitted: true,
                committedProgram: true,
              },
            },
          },
        },
      },
    },
  },
});

    return NextResponse.json({
      ok: true,
      data: {
        list: {
          id: gate.list.id,
          name: gate.list.name,
          description: gate.list.description ?? null,
          createdAt: gate.list.createdAt.toISOString(),
          updatedAt: gate.list.updatedAt.toISOString(),
        },
members: members.map((m) => {
  const u = m.playerProfile.user;
  const p = u?.Player ?? null;
  const data = (m.playerProfile as any)?.data ?? {};
  const phone = typeof data?.phone === "string" ? data.phone : null;
  const phonePrivate =
    typeof data?.phonePrivate === "boolean"
      ? data.phonePrivate
      : (u as any)?.phonePrivate ?? true;


return {
  playerProfileId: m.playerProfileId,
  label: m.label ?? null,
  addedAt: m.createdAt.toISOString(),

  name: u?.name ?? null,
  email: u?.email ?? m.playerProfile.email,
  slug: u?.slug ?? null,
  photoUrl: u?.photoUrl ?? null,

  // ✅ player contact
  phone,
  phonePrivate,

  gradYear: p?.gradYear ?? null,
  primaryPos: p?.primaryPos ?? null,
  secondaryPos: p?.secondaryPos ?? null,
  bats: p?.bats ?? null,
  throws: p?.throws ?? null,
  isCommitted: p?.isCommitted ?? false,
  committedProgram: p?.committedProgram ?? null,
};
}),
      },
    });
  } catch (e: any) {
    return NextResponse.json<Err>({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: { params: { listId: string } }) {
  const user = await getCurrentUser();

  const listId = ctx.params.listId;
  const gate = await requireListAccess(user, listId);
  if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => ({} as any));
  const name = String(body?.name || "").trim();
  const description = String(body?.description || "").trim();

  if (!name) return NextResponse.json<Err>({ ok: false, error: "List name is required." }, { status: 400 });

  try {
    const updated = await prisma.recruitingList.update({
      where: { id: listId },
      data: { name, description: description || null },
    });

    return NextResponse.json({
      ok: true,
      data: {
        list: {
          id: updated.id,
          name: updated.name,
          description: updated.description ?? null,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      },
    });
  } catch (e: any) {
    if (String(e?.code || "") === "P2002") {
      return NextResponse.json<Err>({ ok: false, error: "A list with that name already exists." }, { status: 409 });
    }
    return NextResponse.json<Err>({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: { listId: string } }) {
  const user = await getCurrentUser();

  const listId = ctx.params.listId;
  const gate = await requireListAccess(user, listId);
  if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: gate.status });

  await prisma.recruitingList.delete({ where: { id: listId } });
  return NextResponse.json({ ok: true });
}
