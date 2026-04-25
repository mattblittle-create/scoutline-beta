import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 25)));

    const state = searchParams.get("state") || "";
    const region = searchParams.get("region") || "";
    const control = searchParams.get("control") || "";
    const division = searchParams.get("division") || "";
    const conference = searchParams.get("conference") || "";

    const rawMinTuition = searchParams.get("minTuition");
    const rawMaxTuition = searchParams.get("maxTuition");

    const hasTuitionFilter = rawMinTuition !== null || rawMaxTuition !== null;

    const minTuition = rawMinTuition ? Number(rawMinTuition) : undefined;
    const maxTuition = rawMaxTuition ? Number(rawMaxTuition) : undefined;

    const results = await prisma.college.findMany({
      where: {
        AND: [
          q.length >= 2
            ? {
                name: {
                  contains: q,
                  mode: "insensitive",
                },
              }
            : {},
          state ? { state } : {},
          region ? { region: region as any } : {},
          control ? { control: control as any } : {},
          hasTuitionFilter
      ? {
          tuitionInState: {
            ...(minTuition !== undefined ? { gte: minTuition } : {}),
            ...(maxTuition !== undefined ? { lte: maxTuition } : {}),
          },
        }
      : {},
          division || conference
            ? {
                baseballProgram: {
                  is: {
                    ...(division ? { division: division as any } : {}),
                    ...(conference ? { conference } : {}),
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
      orderBy: {
        name: "asc",
      },
      take: limit,
    });

    return NextResponse.json({
      ok: true,
      count: results.length,
      results,
    });
  } catch (err) {
    console.error("COLLEGE_SEARCH_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Failed to search colleges." },
      { status: 500 }
    );
  }
}