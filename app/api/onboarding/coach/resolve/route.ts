// app/api/onboarding/coach/resolve/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = {
  ok: false;
  error: string;
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeName(value: unknown) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[.'’`-]/g, "")
    .replace(/\b(dr|coach|jr|sr|ii|iii|iv)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function publicCoach(coach: any) {
  return {
    id: coach.id,
    name: coach.name,
    title: coach.title ?? null,
    email: coach.email ?? null,
    phone: coach.phone ?? null,
    bioUrl: coach.bioUrl ?? null,
    headshotUrl: coach.headshotUrl ?? null,
    xUrl: coach.xUrl ?? null,
    instagramUrl: coach.instagramUrl ?? null,
    isHeadCoach: !!coach.isHeadCoach,
    claimed: !!coach.claimedByUserId,
    dataSource: coach.dataSource,
    manuallyVerifiedAt: coach.manuallyVerifiedAt
      ? coach.manuallyVerifiedAt.toISOString()
      : null,
  };
}

/**
 * GET /api/onboarding/coach/resolve?q=carolina
 *
 * Lightweight college autocomplete for coach onboarding.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = normalizeText(searchParams.get("q"));

    if (q.length < 2) {
      return NextResponse.json({
        ok: true,
        data: {
          colleges: [],
        },
      });
    }

    const colleges = await prisma.college.findMany({
      where: {
        name: {
          contains: q,
          mode: "insensitive",
        },
        baseballProgram: {
          isNot: null,
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        state: true,
        logoUrl: true,
        division: true,
        conference: true,
        baseballProgram: {
          select: {
            id: true,
            division: true,
            conference: true,
            coaches: {
              where: {
                isActive: true,
              },
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      take: 15,
    });

    return NextResponse.json({
      ok: true,
      data: {
        colleges: colleges.map((college) => ({
          id: college.id,
          name: college.name,
          slug: college.slug,
          city: college.city,
          state: college.state,
          logoUrl: college.logoUrl,
          division:
            college.baseballProgram?.division ??
            college.division ??
            null,
          conference:
            college.baseballProgram?.conference ??
            college.conference ??
            null,
          baseballProgramId: college.baseballProgram?.id ?? null,
          activeCoachCount:
            college.baseballProgram?.coaches.length ?? 0,
        })),
      },
    });
  } catch (error: any) {
    console.error("GET /api/onboarding/coach/resolve error:", error);

    return NextResponse.json<Err>(
      {
        ok: false,
        error: error?.message || "Could not search college programs.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/onboarding/coach/resolve
 *
 * Resolves the most likely imported coach record after a college is selected.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const collegeId = normalizeText(body?.collegeId);
    const email = normalizeEmail(body?.email);
    const name = normalizeText(body?.name);

    if (!collegeId) {
      return NextResponse.json<Err>(
        {
          ok: false,
          error: "collegeId is required.",
        },
        { status: 400 }
      );
    }

    const college = await prisma.college.findUnique({
      where: {
        id: collegeId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        state: true,
        logoUrl: true,
        division: true,
        conference: true,
        baseballProgram: {
          select: {
            id: true,
            division: true,
            conference: true,
            coaches: {
              where: {
                isActive: true,
              },
              orderBy: [
                { isHeadCoach: "desc" },
                { title: "asc" },
                { name: "asc" },
              ],
              select: {
                id: true,
                name: true,
                title: true,
                email: true,
                phone: true,
                bioUrl: true,
                headshotUrl: true,
                xUrl: true,
                instagramUrl: true,
                isHeadCoach: true,
                claimedByUserId: true,
                dataSource: true,
                manuallyVerifiedAt: true,
              },
            },
          },
        },
      },
    });

    if (!college) {
      return NextResponse.json<Err>(
        {
          ok: false,
          error: "College not found.",
        },
        { status: 404 }
      );
    }

    const coaches = college.baseballProgram?.coaches ?? [];

let matchedCoach: (typeof coaches)[number] | null = null;
let matchType: "EMAIL" | "NAME" | null = null;

if (email) {
  const emailMatches = coaches.filter(
    (coach) =>
      normalizeEmail(coach.email) === email
  );

  if (emailMatches.length > 1) {
    return NextResponse.json<Err>(
      {
        ok: false,
        error:
          "Multiple active coach records use this email. Contact ScoutLine support before continuing.",
      },
      { status: 409 }
    );
  }

  if (emailMatches.length === 1) {
    matchedCoach = emailMatches[0];
    matchType = "EMAIL";
  }
}

if (!matchedCoach && name) {
  const normalizedRequestedName =
    normalizeName(name);

  const nameMatches = coaches.filter(
    (coach) =>
      !normalizeEmail(coach.email) &&
      normalizeName(coach.name) ===
        normalizedRequestedName
  );

  if (nameMatches.length > 1) {
    return NextResponse.json<Err>(
      {
        ok: false,
        error:
          "Multiple active coach records match this name. Contact ScoutLine support before continuing.",
      },
      { status: 409 }
    );
  }

  if (nameMatches.length === 1) {
    matchedCoach = nameMatches[0];
    matchType = "NAME";
  }
}

    return NextResponse.json({
      ok: true,
      data: {
        college: {
          id: college.id,
          name: college.name,
          slug: college.slug,
          city: college.city,
          state: college.state,
          logoUrl: college.logoUrl,
          division:
            college.baseballProgram?.division ??
            college.division ??
            null,
          conference:
            college.baseballProgram?.conference ??
            college.conference ??
            null,
          baseballProgramId:
            college.baseballProgram?.id ?? null,
        },
        matchedCoach: matchedCoach
          ? publicCoach(matchedCoach)
          : null,
        matchType,
        activeCoachCount: coaches.length,
      },
    });
  } catch (error: any) {
    console.error("POST /api/onboarding/coach/resolve error:", error);

    return NextResponse.json<Err>(
      {
        ok: false,
        error:
          error?.message ||
          "Could not resolve existing coach information.",
      },
      { status: 500 }
    );
  }
}