// app/api/coach/player-rating/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

function clampRating(v: any) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

function requireCollegeCoach(user: any) {
  if (!user?.id) return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  if (!user?.collegeId) return { ok: false as const, status: 403 as const, error: "Coach is not linked to a college." };

  // In prod you can keep this strict if you want, but we’ve kept it flexible elsewhere:
  if (process.env.NODE_ENV === "production") {
    const t = user?.coachProfile?.coachAccountType ?? null;
    if (t !== "COLLEGE_COACH") {
      return { ok: false as const, status: 403 as const, error: "College Coach access required." };
    }
  }

  return { ok: true as const, userId: user.id as string, collegeId: user.collegeId as string };
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const gate = requireCollegeCoach(user);
    if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: gate.status });

    const { searchParams } = new URL(req.url);
    const playerProfileId = String(searchParams.get("playerProfileId") || "").trim();
    if (!playerProfileId) {
      return NextResponse.json<Err>({ ok: false, error: "Missing playerProfileId." }, { status: 400 });
    }

    // (Optional) ensure the player profile exists; keeps response sane.
    const exists = await prisma.playerProfile.findUnique({
      where: { id: playerProfileId },
      select: { id: true },
    });
    if (!exists) return NextResponse.json<Err>({ ok: false, error: "Player profile not found." }, { status: 404 });

    const row = await prisma.coachPlayerRating.findUnique({
      where: {
        collegeId_coachUserId_playerProfileId: {
          collegeId: gate.collegeId,
          coachUserId: gate.userId,
          playerProfileId,
        },
      },
      select: { rating: true },
    });

    return NextResponse.json({
      ok: true,
      data: {
        rating: clampRating(row?.rating ?? 0),
      },
    });
  } catch (e: any) {
    console.error("GET /api/coach/player-rating error:", e);
    return NextResponse.json<Err>({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const gate = requireCollegeCoach(user);
    if (!gate.ok) return NextResponse.json<Err>({ ok: false, error: gate.error }, { status: gate.status });

    const body = await req.json().catch(() => ({} as any));
    const playerProfileId = String(body?.playerProfileId || "").trim();
    const rating = clampRating(body?.rating);

    if (!playerProfileId) {
      return NextResponse.json<Err>({ ok: false, error: "Missing playerProfileId." }, { status: 400 });
    }

    const exists = await prisma.playerProfile.findUnique({
      where: { id: playerProfileId },
      select: { id: true },
    });
    if (!exists) return NextResponse.json<Err>({ ok: false, error: "Player profile not found." }, { status: 404 });

    const saved = await prisma.coachPlayerRating.upsert({
      where: {
        collegeId_coachUserId_playerProfileId: {
          collegeId: gate.collegeId,
          coachUserId: gate.userId,
          playerProfileId,
        },
      },
      create: {
        collegeId: gate.collegeId,
        coachUserId: gate.userId,
        playerProfileId,
        rating,
      },
      update: {
        rating,
      },
      select: { rating: true },
    });

    return NextResponse.json({
      ok: true,
      data: {
        rating: clampRating(saved.rating),
      },
    });
  } catch (e: any) {
    console.error("POST /api/coach/player-rating error:", e);
    return NextResponse.json<Err>({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
