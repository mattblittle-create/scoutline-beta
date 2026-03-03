// app/api/coach/notes/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listCoachNotesForProfile } from "@/lib/coachNotes";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

type CoachNoteDTO = {
  id: string;
  noteText: string;
  sharedWithOrg: boolean;
  createdAt: string;
  coach: {
    id: string;
    name: string | null;
    email: string;
  };
  teamName?: string | null;
  collegeName?: string | null;
};

type ListNotesResponse =
  | {
      ok: true;
      data: { notes: CoachNoteDTO[] };
    }
  | Err;

type CreateNoteResponse =
  | {
      ok: true;
      data: { note: CoachNoteDTO };
    }
  | Err;

function toCoachNoteDTO(n: any): CoachNoteDTO {
  return {
    id: String(n.id),
    noteText: String(n.noteText ?? ""),
    sharedWithOrg: Boolean(n.sharedWithOrg),
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt || new Date().toISOString()),
    coach: {
      id: String(n.coachUser?.id ?? n.coachUserId ?? ""),
      name: (n.coachUser?.name ?? null) as string | null,
      email: String(n.coachUser?.email ?? ""),
    },
    teamName: null,
    collegeName: null,
  };
}

async function requireActingUser() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser?.id) return null;

  // ✅ Hydrate full Prisma User + coachProfile so we can derive team context safely
  const actingUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      coachProfile: true,
      college: true,
    },
  });

  return actingUser;
}

export async function GET(req: Request) {
  const actingUser = await requireActingUser();
  if (!actingUser) {
    return NextResponse.json<Err>({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const playerProfileId = String(searchParams.get("playerProfileId") || "").trim();

  if (!playerProfileId) {
    return NextResponse.json<Err>({ ok: false, error: "playerProfileId is required" }, { status: 400 });
  }

  try {
    const notes = await listCoachNotesForProfile({
      prisma,
      actingUser,
      playerProfileId,
    });

    return NextResponse.json<ListNotesResponse>({
      ok: true,
      data: { notes: (Array.isArray(notes) ? notes : []).map(toCoachNoteDTO) },
    });
  } catch (err: any) {
    console.error("Unexpected error listing coach notes", err);
    return NextResponse.json<Err>({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const actingUser = await requireActingUser();
  if (!actingUser) {
    return NextResponse.json<Err>({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as any));
  const playerProfileId = String(body?.playerProfileId || "").trim();
  const noteText = String(body?.noteText || "").trim();
  const sharedWithOrg = body?.sharedWithOrg === undefined ? true : Boolean(body.sharedWithOrg);

  if (!playerProfileId) {
    return NextResponse.json<Err>({ ok: false, error: "playerProfileId is required" }, { status: 400 });
  }
  if (!noteText) {
    return NextResponse.json<Err>({ ok: false, error: "noteText is required" }, { status: 400 });
  }

  // ✅ Derive team context from CoachProfile (User does NOT have teamId)
  const teamId =
    (actingUser as any)?.coachProfile?.teamId ? String((actingUser as any).coachProfile.teamId) : null;

  const collegeId = actingUser.collegeId ?? null;

  try {
    const created = await prisma.coachNote.create({
      data: {
        playerProfileId,
        noteText,
        sharedWithOrg,
        coachUserId: actingUser.id,
        teamId,
        collegeId,
      },
      include: {
        coachUser: true,
      },
    });

    return NextResponse.json<CreateNoteResponse>({
      ok: true,
      data: { note: toCoachNoteDTO(created) },
    });
  } catch (err: any) {
    console.error("Unexpected error creating coach note", err);
    return NextResponse.json<Err>({ ok: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}