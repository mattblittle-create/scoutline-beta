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

function normalizeRosterPosition(value: unknown): string {
  const v = String(value ?? "")
    .trim()
    .toUpperCase();

  if (!v) return "";

  if (v === "P") return "P";
  if (v === "RHP") return "RHP";
  if (v === "LHP") return "LHP";
  if (v === "C") return "C";
  if (v === "1B") return "1B";
  if (v === "2B") return "2B";
  if (v === "3B") return "3B";
  if (v === "SS") return "SS";
  if (v === "OF") return "OF";

  if (
    v === "INF" ||
    v === "IF" ||
    v === "MIF" ||
    v === "CIF"
  ) {
    return "INF";
  }

  if (
    v === "UTIL" ||
    v === "UTL" ||
    v === "UT"
  ) {
    return "UTIL";
  }

  return v;
}

function splitRosterPositions(
  positionRaw: string | null,
  primaryPosition: string | null
): string[] {
  const raw = String(positionRaw || primaryPosition || "")
    .toUpperCase()
    .trim();

  if (!raw) return [];

  return Array.from(
    new Set(
      raw
        .split(/[\/,&+]/)
        .map((value) => normalizeRosterPosition(value))
        .filter(Boolean)
    )
  );
}

function buildRosterIntelligence(
  snapshot: any,
  players: any[]
) {
  if (!snapshot) return null;

  const classBreakdown = {
    freshman: 0,
    sophomore: 0,
    junior: 0,
    senior: 0,
    graduate: 0,
    unknown: 0,
  };

  const positionMap = new Map<
    string,
    {
      total: number;
      freshman: number;
      sophomore: number;
      junior: number;
      senior: number;
      graduate: number;
      unknown: number;
    }
  >();

  for (const player of players) {
    const classBucket = String(player.classBucket || "")
      .trim()
      .toUpperCase();

    let classKey:
      | "freshman"
      | "sophomore"
      | "junior"
      | "senior"
      | "graduate"
      | "unknown" = "unknown";

    if (classBucket === "FRESHMAN") {
      classKey = "freshman";
    } else if (classBucket === "SOPHOMORE") {
      classKey = "sophomore";
    } else if (classBucket === "JUNIOR") {
      classKey = "junior";
    } else if (classBucket === "SENIOR") {
      classKey = "senior";
    } else if (classBucket === "GRADUATE") {
      classKey = "graduate";
    }

    classBreakdown[classKey] += 1;

    const positions = splitRosterPositions(
      player.positionRaw,
      player.primaryPosition
    );

    for (const position of positions) {
      const existing =
        positionMap.get(position) || {
          total: 0,
          freshman: 0,
          sophomore: 0,
          junior: 0,
          senior: 0,
          graduate: 0,
          unknown: 0,
        };

      existing.total += 1;
      existing[classKey] += 1;

      positionMap.set(position, existing);
    }
  }

  const positions = Array.from(positionMap.entries())
    .map(([position, counts]) => ({
      position,
      ...counts,
      departing:
        counts.senior +
        counts.graduate,
    }))
    .sort(
      (a, b) =>
        b.total - a.total ||
        a.position.localeCompare(b.position)
    );

  return {
    season: snapshot.season,

    rosterSize:
      snapshot.rosterSize ??
      players.length,

    sourceUrl:
      snapshot.sourceUrl || null,

    verifiedAt:
      snapshot.verifiedAt || null,

    classBreakdown,

    positions,
  };
}

function listParam(searchParams: URLSearchParams, key: string) {
  return (searchParams.get(key) || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function extractAcademicAreasFromProfileData(data: any): string[] {
  const normalized = data?.normalized || {};
  const academics = data?.academics || {};
  const normalizedAcademics = normalized?.academics || {};
  const tabs = data?.tabs || {};
  const tabAcademics = tabs?.academics || {};

  const candidates = [
    data?.areasOfStudy,
    data?.intendedMajors,

    academics?.areasOfStudy,
    academics?.intendedMajors,

    normalized?.areasOfStudy,
    normalized?.intendedMajors,

    normalizedAcademics?.areasOfStudy,
    normalizedAcademics?.intendedMajors,

    tabAcademics?.areasOfStudy,
    tabAcademics?.intendedMajors,

    data?.academic?.areasOfStudy,
    data?.academic?.intendedMajors,
    normalized?.academic?.areasOfStudy,
    normalized?.academic?.intendedMajors,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) {
      const cleaned = Array.from(
        new Set(
          value
            .map((v) => String(v || "").trim())
            .filter(Boolean)
        )
      ).slice(0, 12);

      if (cleaned.length) return cleaned;
    }

    if (typeof value === "string" && value.trim()) {
      const cleaned = Array.from(
        new Set(
          value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
        )
      ).slice(0, 12);

      if (cleaned.length) return cleaned;
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

    /*
     * -------------------------------------------------------
     * IMPORTED ROSTER INTELLIGENCE
     * -------------------------------------------------------
     *
     * Load roster data in bulk for all programs returned by
     * this search.
     *
     * Do not replace legacy baseballProgram.rosterNeeds.
     *
     * rosterNeeds:
     *   coach/program-entered recruiting intent
     *
     * rosterIntelligence:
     *   ScoutLine-derived composition from official rosters
     */

    const baseballProgramIds = results
      .map((college) => college.baseballProgram?.id)
      .filter((id): id is string => Boolean(id));

    const rosterSnapshots =
      baseballProgramIds.length
        ? await prisma.collegeBaseballRosterSnapshot.findMany({
            where: {
              programId: {
                in: baseballProgramIds,
              },
            },
            orderBy: [
              {
                programId: "asc",
              },
              {
                season: "desc",
              },
            ],
          })
        : [];

    /*
     * Keep only the newest imported season for each program.
     */
    const latestSnapshotByProgram =
      new Map<string, (typeof rosterSnapshots)[number]>();

    for (const snapshot of rosterSnapshots) {
      if (!latestSnapshotByProgram.has(snapshot.programId)) {
        latestSnapshotByProgram.set(
          snapshot.programId,
          snapshot
        );
      }
    }

    /*
     * Load player rows only for the selected latest season of
     * each program.
     */
    const selectedRosterScopes = Array.from(
      latestSnapshotByProgram.values()
    );

    const rosterPlayers =
      selectedRosterScopes.length
        ? await prisma.collegeBaseballRosterPlayer.findMany({
            where: {
              OR: selectedRosterScopes.map((snapshot) => ({
                programId: snapshot.programId,
                season: snapshot.season,
              })),
            },
            select: {
              programId: true,
              season: true,
              positionRaw: true,
              primaryPosition: true,
              classBucket: true,
            },
          })
        : [];

    const rosterPlayersByScope =
      new Map<string, typeof rosterPlayers>();

    for (const player of rosterPlayers) {
      const key =
        `${player.programId}|${player.season}`;

      const existing =
        rosterPlayersByScope.get(key) || [];

      existing.push(player);

      rosterPlayersByScope.set(
        key,
        existing
      );
    }

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

        /*
         * Build ScoutLine roster intelligence from the latest
         * approved imported roster season.
         *
         * Northwestern currently has no approved imported
         * snapshot, so it safely receives null.
         */
        let rosterIntelligence = null;

        if (baseball) {
          const latestSnapshot =
            latestSnapshotByProgram.get(
              baseball.id
            );

          if (latestSnapshot) {
            const scopeKey =
              `${baseball.id}|${latestSnapshot.season}`;

            rosterIntelligence =
              buildRosterIntelligence(
                latestSnapshot,
                rosterPlayersByScope.get(scopeKey) || []
              );
          }
        }

        if (!profile || !baseball) {
          return {
            ...college,
            distance,
            rosterIntelligence,
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

  verificationStatus: baseball.verificationStatus || null,
  transferHeavy: baseball.transferHeavy ?? null,
  jucoFriendly: baseball.jucoFriendly ?? null,
  recruitingAggressiveness: baseball.recruitingAggressiveness || null,
  regionalRecruitingBias: baseball.regionalRecruitingBias || null,
  rosterTurnoverLevel: baseball.rosterTurnoverLevel || null,
  currentRosterSize: baseball.currentRosterSize ?? null,

  nilAvailable: college.nilProfile?.nilAvailable ?? null,
  baseballNilStrength: college.nilProfile?.baseballNilStrength || null,

  academicAreas: college.academicAreas || [],
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
          rosterIntelligence,
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