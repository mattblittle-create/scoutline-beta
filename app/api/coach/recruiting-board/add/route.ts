// app/api/coach/recruiting-board/add/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  addToRecruitingBoard,
  RecruitingBoardError,
  NotifyPlayerAddedToBoardFn,
} from "@/lib/recruitingBoard";
// import { getCurrentUser } from "@/lib/auth"; // TODO: real auth

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

  // Example when you wire your mailer:
  // await sendEmail({
  //   to: playerEmail,
  //   subject: "A college program is tracking your ScoutLine profile",
  //   text: body,
  // });
};

export async function POST(req: Request) {
  // 🔐 Auth
  const coachUser = await getCurrentUserMock();
  if (!coachUser) {
    return NextResponse.json<AddResponse>(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: AddRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<AddResponse>(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { playerProfileId, label, notifyPlayer = false } = body;

  if (!playerProfileId) {
    return NextResponse.json<AddResponse>(
      { ok: false, error: "playerProfileId is required" },
      { status: 400 }
    );
  }

  try {
    const entry = await addToRecruitingBoard({
      prisma,
      actingUser: coachUser,
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
      return NextResponse.json<AddResponse>(
        { ok: false, error: err.message },
        { status: err.status }
      );
    }

    console.error("Unexpected error adding to recruiting board", err);
    return NextResponse.json<AddResponse>(
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
