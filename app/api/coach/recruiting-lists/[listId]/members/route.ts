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

async function notifyStaffOfRecruitingListActivity(params: {
  collegeId: string;
  actorUserId: string;
  listId: string;
  listName: string;
  playerProfileId: string;
}) {
  const actor = await prisma.user.findUnique({
    where: { id: params.actorUserId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const playerProfile = await prisma.playerProfile.findUnique({
    where: { id: params.playerProfileId },
    select: {
      id: true,
      email: true,
      data: true,
    },
  });

  const data = (playerProfile?.data || {}) as any;
  const normalized = data?.normalized || data;

  const actorName = actor?.name || actor?.email || "A staff member";
  const playerName =
    [normalized?.firstName, normalized?.lastName].filter(Boolean).join(" ") ||
    normalized?.name ||
    playerProfile?.email ||
    "a player";

  const staff = await prisma.user.findMany({
    where: {
      collegeId: params.collegeId,
      id: { not: params.actorUserId },
      coachProfile: {
        isNot: null,
      },
    },
    select: {
      id: true,
      notificationPreference: {
        select: {
          instantStaffActivity: true,
        },
      },
    },
  });

  const staffIds = staff
    .filter((member) => member.notificationPreference?.instantStaffActivity !== false)
    .map((member) => member.id);

  if (!staffIds.length) return;

  await prisma.notification.createMany({
    data: staffIds.map((userId) => ({
      userId,
      type: "COACH_PLAYER_LIST_ACTIVITY",
      message: `${actorName} added ${playerName} to ${params.listName}.`,
      data: {
        collegeId: params.collegeId,
        actorUserId: params.actorUserId,
        listId: params.listId,
        listName: params.listName,
        playerProfileId: params.playerProfileId,
        event: "PLAYER_ADDED_TO_RECRUITING_LIST",
      },
    })),
  });
}

export async function POST(req: Request, ctx: { params: { listId: string } }) {
const user = await getCurrentUser();
if (!user?.id) {
  return NextResponse.json<Err>(
    { ok: false, error: "Unauthorized" },
    { status: 401 }
  );
}

const gate = requireCollegeCoach(user);
if (!gate.ok) {
  return NextResponse.json<Err>(
    { ok: false, error: gate.error },
    { status: gate.status }
  );
}

const listId = ctx.params.listId;
const actorUserId = user.id;

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

    await notifyStaffOfRecruitingListActivity({
  collegeId: gate.collegeId,
  actorUserId,
  listId,
  listName: list.name,
  playerProfileId,
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
