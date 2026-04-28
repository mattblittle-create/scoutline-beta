// app/api/player/target-programs/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Supported recruiting statuses
 */
const VALID_STATUSES = [
  "SAVED",
  "INTERESTED",
  "CONTACTED",
  "APPLIED",
  "VISITED",
  "OFFERED",
  "NOT_PURSUING",
] as const;

type RecruitingStatus = (typeof VALID_STATUSES)[number];

async function getCurrentPlayerProfile() {
  const userId = cookies().get("scoutline_uid")?.value || "";

  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      PlayerProfile: {
        select: { id: true },
      },
    },
  });

  if (!user?.email) return null;

  if (user.PlayerProfile?.id) {
    return user.PlayerProfile;
  }

  return prisma.playerProfile.findUnique({
    where: { email: user.email },
    select: { id: true },
  });
}

/**
 * GET - Load saved target programs
 */
export async function GET() {
  try {
    const profile = await getCurrentPlayerProfile();

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Not logged in or player profile not found." },
        { status: 401 }
      );
    }

    const saved = await prisma.collegeSavedSchool.findMany({
      where: { playerProfileId: profile.id },
      include: {
        college: {
          include: {
            baseballProgram: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, saved });
  } catch (err) {
    console.error("TARGET_PROGRAMS_GET_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Could not load target programs." },
      { status: 500 }
    );
  }
}

/**
 * POST - Save a college (default status: SAVED)
 */
export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentPlayerProfile();

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Not logged in or player profile not found." },
        { status: 401 }
      );
    }

    const { collegeId } = await req.json();

    if (!collegeId || typeof collegeId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing collegeId." },
        { status: 400 }
      );
    }

    const saved = await prisma.collegeSavedSchool.upsert({
      where: {
        playerProfileId_collegeId: {
          playerProfileId: profile.id,
          collegeId,
        },
      },
      update: {},
      create: {
        playerProfileId: profile.id,
        collegeId,
        listName: "Target Programs",
        status: "SAVED",
      },
    });

    return NextResponse.json({ ok: true, saved });
  } catch (err) {
    console.error("TARGET_PROGRAMS_POST_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Could not save target program." },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update recruiting status
 */
export async function PATCH(req: NextRequest) {
  try {
    const profile = await getCurrentPlayerProfile();

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Not logged in or player profile not found." },
        { status: 401 }
      );
    }

    const { collegeId, status, notes } = await req.json();

    if (!collegeId || typeof collegeId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing collegeId." },
        { status: 400 }
      );
    }

const dataToUpdate: {
  status?: RecruitingStatus;
  notes?: string | null;
} = {};

if (typeof status !== "undefined") {
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { ok: false, error: "Invalid status value." },
      { status: 400 }
    );
  }

  dataToUpdate.status = status;
}

if (typeof notes !== "undefined") {
  dataToUpdate.notes =
    typeof notes === "string" && notes.trim()
      ? notes.trim().slice(0, 1000)
      : null;
}

if (Object.keys(dataToUpdate).length === 0) {
  return NextResponse.json(
    { ok: false, error: "No updates provided." },
    { status: 400 }
  );
}

    const updated = await prisma.collegeSavedSchool.update({
      where: {
        playerProfileId_collegeId: {
          playerProfileId: profile.id,
          collegeId,
        },
      },
data: dataToUpdate,
    });

    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    console.error("TARGET_PROGRAMS_PATCH_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Could not update status." },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove saved college
 */
export async function DELETE(req: NextRequest) {
  try {
    const profile = await getCurrentPlayerProfile();

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Not logged in or player profile not found." },
        { status: 401 }
      );
    }

    const { collegeId } = await req.json();

    if (!collegeId || typeof collegeId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing collegeId." },
        { status: 400 }
      );
    }

    await prisma.collegeSavedSchool.deleteMany({
      where: {
        playerProfileId: profile.id,
        collegeId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("TARGET_PROGRAMS_DELETE_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Could not remove target program." },
      { status: 500 }
    );
  }
}