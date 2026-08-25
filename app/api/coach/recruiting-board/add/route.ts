// app/api/coach/recruiting-board/add/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  addToRecruitingBoard,
  RecruitingBoardError,
  NotifyPlayerAddedToBoardFn,
} from "@/lib/recruitingBoard";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AddRequestBody = {
  playerProfileId?: string;
  label?: string | null;
  notifyPlayer?: boolean;
};

type AddResponse =
  | {
      ok: true;
      data: {
        entryId: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

// Simple notification implementation for now (console only)
// Later: plug into your actual mailer + bell alerts.
const notifyPlayerAddedToBoardImpl: NotifyPlayerAddedToBoardFn = async ({
  playerEmail,
  playerName,
  collegeName,
}) => {
  const greeting = playerName ?? "Player";

  const body = `${greeting},

${collegeName} has added you to their ScoutLine recruiting board.

This means their coaches are tracking your profile and may continue to follow your progress.

– ScoutLine`;

  console.log("[DEBUG] Would send 'added to board' email:", {
    to: playerEmail,
    subject: "A college program is tracking your ScoutLine profile",
    body,
  });
};

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
  // 🔐 Auth + full user hydration (matches helper expectations)
  const actingUser = await requireActingUser();
  if (!actingUser) {
    return NextResponse.json<AddResponse>({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: AddRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<AddResponse>({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { playerProfileId, label, notifyPlayer = false } = body;

  if (!playerProfileId) {
    return NextResponse.json<AddResponse>({ ok: false, error: "playerProfileId is required" }, { status: 400 });
  }

  try {
    const entry = await addToRecruitingBoard({
      prisma,
      actingUser,
      playerProfileId,
      label: label ?? undefined,
      notifyPlayer,
      notifyPlayerFn: notifyPlayerAddedToBoardImpl,
    });

    return NextResponse.json<AddResponse>({
      ok: true,
      data: { entryId: entry.id },
    });
  } catch (err: any) {
    if (err instanceof RecruitingBoardError) {
      return NextResponse.json<AddResponse>({ ok: false, error: err.message }, { status: err.status });
    }

    console.error("Unexpected error adding to recruiting board", err);
    return NextResponse.json<AddResponse>({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}