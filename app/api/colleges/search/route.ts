// app/api/colleges/search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function listParam(searchParams: URLSearchParams, key: string) {
  return (searchParams.get(key) || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 25)));

    const states = listParam(searchParams, "state");
    const regions = listParam(searchParams, "region");
    const controls = listParam(searchParams, "control");
    const divisions = listParam(searchParams, "division");
    const conferences = listParam(searchParams, "conference");

    const rawMaxTuition = searchParams.get("maxTuition");
    const maxTuition = rawMaxTuition ? Number(rawMaxTuition) : undefined;

    const results = await prisma.college.findMany({
      where: {
        AND: [
          q.length >= 2
            ? { name: { contains: q, mode: "insensitive" } }
            : {},
          states.length ? { state: { in: states } } : {},
          regions.length ? { region: { in: regions as any[] } } : {},
          controls.length ? { control: { in: controls as any[] } } : {},
          maxTuition !== undefined
            ? {
                OR: [
                  { tuitionInState: { lte: maxTuition } },
                  { tuitionInState: null },
                ],
              }
            : {},
          divisions.length || conferences.length
            ? {
                baseballProgram: {
                  is: {
                    ...(divisions.length ? { division: { in: divisions as any[] } } : {}),
                    ...(conferences.length ? { conference: { in: conferences } } : {}),
                  },
                },
              }
            : {},
        ],
      },
      include: {
        baseballProgram: {
          select: {
            division: true,
            conference: true,
            nickname: true,
            baseballWebsiteUrl: true,
          },
        },
      },
      orderBy: { name: "asc" },
      take: limit,
    });

    return NextResponse.json({ ok: true, count: results.length, results });
  } catch (err) {
    console.error("COLLEGE_SEARCH_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Failed to search colleges." },
      { status: 500 }
    );
  }
}