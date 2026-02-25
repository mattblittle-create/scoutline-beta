// app/api/coach/recruiting-board/remove/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  removeFromRecruitingBoard,
  RecruitingBoardError,
} from "@/lib/recruitingBoard";
// import { getCurrentUser } from "@/lib/auth"; // TODO: real auth

type RemoveRequestBody = {
  playerProfileId?: string;
};

type RemoveResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export async function POST(req: Request) {
  const coachUser = await getCurrentUserMock();
  if (!coachUser) {
    return NextResponse.json<RemoveResponse>(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: RemoveRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<RemoveResponse>(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { playerProfileId } = body;

  if (!playerProfileId) {
    return NextResponse.json<RemoveResponse>(
      { ok: false, error: "playerProfileId is required" },
      { status: 400 }
    );
  }

  try {
    await removeFromRecruitingBoard({
      prisma,
      actingUser: coachUser,
      playerProfileId,
    });

    return NextResponse.json<RemoveResponse>({ ok: true });
  } catch (err: any) {
    if (err instanceof RecruitingBoardError) {
      return NextResponse.json<RemoveResponse>(
        { ok: false, error: err.message },
        { status: err.status }
      );
    }

    console.error("Unexpected error removing from recruiting board", err);
    return NextResponse.json<RemoveResponse>(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * TEMP MOCK for getCurrentUser so this file is paste-able.
 *
 * Replace this with your real auth integration.
 */
async function getCurrentUserMock() {
  // TODO: replace with real implementation
  // e.g. const session = await getServerSession(authOptions);
  //       return session?.user ?? null;

  // For now, return null to force 401 if you accidentally hit this.
  return null as unknown as {
    id: string;
    email: string | null;
    name: string | null;
    role: string | null;
    collegeId: string | null;
  } | null;
}
