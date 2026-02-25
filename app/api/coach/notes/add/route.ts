// app/api/coach/notes/add/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  addCoachNote,
  CoachNotesError,
} from "@/lib/coachNotes";
// import { getCurrentUser } from "@/lib/auth"; // TODO: real auth

type AddNoteRequestBody = {
  playerProfileId?: string;
  noteText?: string;
  teamId?: string | null;     // optional; if omitted, will try college context
  sharedWithOrg?: boolean;    // default true
};

type AddNoteResponse =
  | {
      ok: true;
      data: {
        noteId: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

export async function POST(req: Request) {
  const coachUser = await getCurrentUserMock();
  if (!coachUser) {
    return NextResponse.json<AddNoteResponse>(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: AddNoteRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<AddNoteResponse>(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { playerProfileId, noteText, teamId, sharedWithOrg } = body;

  if (!playerProfileId) {
    return NextResponse.json<AddNoteResponse>(
      { ok: false, error: "playerProfileId is required" },
      { status: 400 }
    );
  }

  if (!noteText || !noteText.trim()) {
    return NextResponse.json<AddNoteResponse>(
      { ok: false, error: "noteText is required" },
      { status: 400 }
    );
  }

  try {
    const note = await addCoachNote({
      prisma,
      actingUser: coachUser,
      playerProfileId,
      teamId: teamId ?? undefined,
      noteText,
      sharedWithOrg: sharedWithOrg ?? true,
    });

    return NextResponse.json<AddNoteResponse>({
      ok: true,
      data: { noteId: note.id },
    });
  } catch (err: any) {
    if (err instanceof CoachNotesError) {
      return NextResponse.json<AddNoteResponse>(
        { ok: false, error: err.message },
        { status: err.status }
      );
    }

    console.error("Unexpected error adding coach note", err);
    return NextResponse.json<AddNoteResponse>(
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
  return null as unknown as {
    id: string;
    email: string | null;
    name: string | null;
    role: string | null;
    collegeId: string | null;
  } | null;
}
