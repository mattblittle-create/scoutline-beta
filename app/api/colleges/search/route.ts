// app/api/colleges/search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { scoreCollegeFit } from "@/app/lib/truth-fit/scoreCollegeFit";
import { getBestMetricBenchmarks } from "@/app/lib/truth-fit/getBestMetricBenchmarks";
import { getDistanceResult } from "@/lib/recommendations/distance";

export const dynamic = "force-dynamic";

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asString(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

function listParam(searchParams: URLSearchParams, key: string) {
  return (searchParams.get(key) || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function extractAcademicAreasFromProfileData(data: any): string[] {
  const normalized = data?.normalized || data || {};

  const candidates = [
    normalized?.areasOfStudy,
    normalized?.academics?.areasOfStudy,
    normalized?.academic?.areasOfStudy,
    normalized?.intendedMajors,
    normalized?.academics?.intendedMajors,
    data?.areasOfStudy,
    data?.academics?.areasOfStudy,
    data?.intendedMajors,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) {
      return Array.from(
        new Set(
          value
            .map((v) => String(v || "").trim())
            .filter(Boolean)
        )
      ).slice(0, 12);
    }

    if (typeof value === "string" && value.trim()) {
      return Array.from(
        new Set(
          value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
        )
      ).slice(0, 12);
    }
  }

  return [];
}

async function getCurrentPlayerProfile() {
  const userId = cookies().get("scoutline_uid")?.value || "";

  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      Player: {
        select: {
          gpa: true,
          gradYear: true,
          primaryPos: true,
          secondaryPos: true,
          heightIn: true,
          weightLb: true,
        },
      },
      PlayerProfile: {
        select: {
          id: true,
          email: true,
          data: true,
        },
      },
    },
  });

  if (!user?.email) return null;

  const profile =
    user.PlayerProfile ||
    (await prisma.playerProfile.findUnique({
      where: { email: user.email },
      select: {
        id: true,
        email: true,
        data: true,
      },
    }));

  if (!profile) return null;

  const data = (profile.data || {}) as any;
  const normalized = data?.normalized || data;

  const heightFt = asNumber(normalized?.heightFt);
  const heightInOnly = asNumber(normalized?.heightIn);
  const totalHeightIn =
    heightFt != null && heightInOnly != null
      ? heightFt * 12 + heightInOnly
      : asNumber(user.Player?.heightIn) ?? heightInOnly;

  return {
    id: profile.id,
    player: {
      gpa:
        asNumber(user.Player?.gpa) ??
        asNumber(normalized?.gpa),
      gradYear:
        asNumber(user.Player?.gradYear) ??
        asNumber(normalized?.gradYear),
      primaryPos:
        asString(user.Player?.primaryPos) ??
        asString(normalized?.primaryPos),
      secondaryPos:
        asString(user.Player?.secondaryPos) ??
        asString(normalized?.secondaryPos),
      heightIn: totalHeightIn,
      weightLb:
        asNumber(user.Player?.weightLb) ??
        asNumber(normalized?.weightLb),
      metrics:
        normalized?.metrics && typeof normalized.metrics === "object"
          ? normalized.metrics
          : {},
      academicAreas: extractAcademicAreasFromProfileData(data),
    },
  };
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
    const academicAreas = listParam(searchParams, "academicArea");

    const rawMaxTuition = searchParams.get("maxTuition");
    const maxTuition = rawMaxTuition ? Number(rawMaxTuition) : undefined;

    const userLatitude = asNumber(searchParams.get("userLat"));
    const userLongitude = asNumber(searchParams.get("userLng"));

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

          academicAreas.length
            ? {
                academicAreas: {
                  some: {
                    name: { in: academicAreas, mode: "insensitive" },
                  },
                },
              }
            : {},
        ],
      },
      include: {
        academicAreas: true,
        nilProfile: true,
        baseballProgram: {
          include: {
            rosterNeeds: true,
            metricAverages: true,
          },
        },
      },
      orderBy: { name: "asc" },
      take: limit,
    });

    const profile = await getCurrentPlayerProfile();

    const resultsWithTruthFit = await Promise.all(
      results.map(async (college) => {
        const baseball = college.baseballProgram;

        const distance =
          userLatitude != null && userLongitude != null
            ? getDistanceResult(
                { latitude: userLatitude, longitude: userLongitude },
                { latitude: college.latitude, longitude: college.longitude }
              )
            : null;

        if (!profile || !baseball) {
          return {
            ...college,
            distance,
            truthFit: null,
          };
        }

        const bestMetrics = await getBestMetricBenchmarks({
          programId: baseball.id,
          collegeName: college.name,
          conference: baseball.conference || college.conference || null,
          division: String(baseball.division || college.division || ""),
        });

        const truthFit = scoreCollegeFit({
          player: profile.player,
          college: {
            averageGpa: asNumber(baseball.averageGpa),
            division: baseball.division || college.division || null,
            metricAverages: bestMetrics.benchmarks,
            metricBenchmarkSource: {
              level: bestMetrics.level,
              label: bestMetrics.label,
            },
            rosterNeeds:
              baseball.rosterNeeds?.map((need) => ({
                gradYear: need.gradYear,
                position: need.position,
                needLevel: need.needLevel,
              })) || [],
          },
        });

        return {
          ...college,
          distance,
          truthFit,
        };
      })
    );

return NextResponse.json({
  ok: true,
  count: resultsWithTruthFit.length,
  profileAcademicAreas: profile?.player?.academicAreas || [],
  results: resultsWithTruthFit,
});
  } catch (err) {
    console.error("COLLEGE_SEARCH_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Failed to search colleges." },
      { status: 500 }
    );
  }
}