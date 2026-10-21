// app/api/coach/recruiting-board/remove/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { removeFromRecruitingBoard, RecruitingBoardError } from "@/lib/recruitingBoard";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RemoveRequestBody = {
  playerProfileId?: string;
};

type RemoveResponse =
  | { ok: true }
  | { ok: false; error: string };

async function requireActingUser() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.id) return null;

  const actingUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      coachProfile: true,
      college: true,
    },
  });

  return actingUser;
}

export async function POST(req: Request) {
  const actingUser = await requireActingUser();
  if (!actingUser) {
    return NextResponse.json<RemoveResponse>({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: RemoveRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<RemoveResponse>({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const playerProfileId = String(body?.playerProfileId || "").trim();
  if (!playerProfileId) {
    return NextResponse.json<RemoveResponse>({ ok: false, error: "playerProfileId is required" }, { status: 400 });
  }

  try {
    await removeFromRecruitingBoard({
      prisma,
      actingUser,
      playerProfileId,
    });

    return NextResponse.json<RemoveResponse>({ ok: true });
  } catch (err: any) {
    if (err instanceof RecruitingBoardError) {
      return NextResponse.json<RemoveResponse>({ ok: false, error: err.message }, { status: err.status });
    }

    console.error("Unexpected error removing from recruiting board", err);
    return NextResponse.json<RemoveResponse>({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}