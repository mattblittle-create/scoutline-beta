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

const ROSTER_POSITION_ORDER = [
  "INF",
  "MIF",
  "CIF",
  "1B",
  "2B",
  "SS",
  "3B",
  "C",
  "OF",
  "LF",
  "CF",
  "RF",
  "UTL",
  "RHP",
  "LHP",
] as const;

function compactRosterPosition(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function normalizeSingleRosterPosition(
  value: unknown
): string {
  const raw = compactRosterPosition(value);

  if (!raw) return "";

  /*
   * Pitchers.
   */
  if (
    raw === "RHP" ||
    raw === "RIGHT HANDED PITCHER" ||
    raw === "RIGHT-HANDED PITCHER" ||
    raw.includes("RIGHT-HANDED PITCHER")
  ) {
    return "RHP";
  }

  if (
    raw === "LHP" ||
    raw === "LEFT HANDED PITCHER" ||
    raw === "LEFT-HANDED PITCHER" ||
    raw.includes("LEFT-HANDED PITCHER")
  ) {
    return "LHP";
  }

  /*
   * Catcher.
   */
  if (
    raw === "C" ||
    raw === "CATCHER" ||
    raw === "CATCHER C" ||
    raw === "CATCHER/C"
  ) {
    return "C";
  }

  /*
   * Exact infield positions.
   */
  if (
    raw === "1B" ||
    raw === "FIRST BASE" ||
    raw === "FIRST BASEMAN"
  ) {
    return "1B";
  }

  if (
    raw === "2B" ||
    raw === "SECOND BASE" ||
    raw === "SECOND BASEMAN"
  ) {
    return "2B";
  }

  if (
    raw === "SS" ||
    raw === "SHORTSTOP"
  ) {
    return "SS";
  }

  if (
    raw === "3B" ||
    raw === "THIRD BASE" ||
    raw === "THIRD BASEMAN"
  ) {
    return "3B";
  }

  /*
   * ScoutLine infield groups.
   */
  if (
    raw === "MIF" ||
    raw === "MIDDLE INFIELD" ||
    raw === "MIDDLE INFIELDER"
  ) {
    return "MIF";
  }

  if (
    raw === "CIF" ||
    raw === "CORNER INFIELD" ||
    raw === "CORNER INFIELDER"
  ) {
    return "CIF";
  }

  if (
    raw === "INF" ||
    raw === "IF" ||
    raw === "INFIELD" ||
    raw === "INFIELDER" ||
    raw === "INFIELD INF" ||
    raw === "INFIELDER INF"
  ) {
    return "INF";
  }

  /*
   * Exact outfield positions.
   */
  if (
    raw === "LF" ||
    raw === "LEFT FIELD" ||
    raw === "LEFT FIELDER"
  ) {
    return "LF";
  }

  if (
    raw === "CF" ||
    raw === "CENTER FIELD" ||
    raw === "CENTER FIELDER"
  ) {
    return "CF";
  }

  if (
    raw === "RF" ||
    raw === "RIGHT FIELD" ||
    raw === "RIGHT FIELDER"
  ) {
    return "RF";
  }

  if (
    raw === "OF" ||
    raw === "OUTFIELD" ||
    raw === "OUTFIELDER" ||
    raw === "OUTFIELD OF" ||
    raw === "OUTFIELDER OF"
  ) {
    return "OF";
  }

  /*
   * Utility.
   */
  if (
    raw === "UTL" ||
    raw === "UTIL" ||
    raw === "UTILITY" ||
    raw === "UTILITY PLAYER"
  ) {
    return "UTL";
  }

  /*
   * Generic P/PITCHER does not tell us handedness.
   */
  if (
    raw === "P" ||
    raw === "PITCHER"
  ) {
    return "";
  }

  return "";
}

function normalizeRosterPositionValue(
  value: unknown
): string[] {
  const raw = compactRosterPosition(value);

  if (!raw) return [];

  const compact =
    raw.replace(/\s+/g, "");

  /*
   * ScoutLine combination buckets.
   */
  if (
    compact === "3B/1B" ||
    compact === "1B/3B" ||
    compact === "3B-1B" ||
    compact === "1B-3B"
  ) {
    return ["CIF"];
  }

  if (
    compact === "SS/2B" ||
    compact === "2B/SS" ||
    compact === "SS-2B" ||
    compact === "2B-SS"
  ) {
    return ["MIF"];
  }

  /*
   * Split true multi-position values.
   */
  const pieces = raw
    .split(/[\/,&+]/)
    .map((piece) =>
      normalizeSingleRosterPosition(piece)
    )
    .filter(Boolean);

  if (pieces.length) {
    return Array.from(
      new Set(pieces)
    );
  }

  const single =
    normalizeSingleRosterPosition(raw);

  return single
    ? [single]
    : [];
}

function normalizePlayerPreferencePosition(
  value: unknown
): string {
  const positions =
    normalizeRosterPositionValue(value);

  return positions[0] || "";
}

function isPitcherPreference(
  value: unknown
): boolean {
  const raw =
    compactRosterPosition(value);

  return (
    raw === "P" ||
    raw === "RHP" ||
    raw === "LHP" ||
    raw.includes("PITCHER") ||
    normalizeRosterPositionValue(raw).some(
      (position) =>
        position === "RHP" ||
        position === "LHP"
    )
  );
}

function buildPlayerRosterPositionOrder(player: {
  primaryPos?: string | null;
  secondaryPos?: string | null;
  throws?: string | null;
} | null) {
  const ordered: string[] = [];

  function add(position: string) {
    if (
      position &&
      !ordered.includes(position)
    ) {
      ordered.push(position);
    }
  }

  if (player) {
    /*
     * 1. Player primary position.
     */
    add(
      normalizePlayerPreferencePosition(
        player.primaryPos
      )
    );

    /*
     * 2. Player secondary position.
     */
    add(
      normalizePlayerPreferencePosition(
        player.secondaryPos
      )
    );

    /*
     * 3. Pitcher handedness, but only if the player's
     * primary/secondary position identifies him as a pitcher.
     */
    if (
      isPitcherPreference(
        player.primaryPos
      ) ||
      isPitcherPreference(
        player.secondaryPos
      )
    ) {
      const throws =
        compactRosterPosition(
          player.throws
        );

      if (
        throws === "R" ||
        throws === "RIGHT" ||
        throws === "RHP"
      ) {
        add("RHP");
      }

      if (
        throws === "L" ||
        throws === "LEFT" ||
        throws === "LHP"
      ) {
        add("LHP");
      }
    }
  }

  /*
   * Standard ScoutLine roster-composition order.
   */
  for (
    const position
    of ROSTER_POSITION_ORDER
  ) {
    add(position);
  }

  return ordered;
}

function isRedshirtFreshmanClass(
  classYearRaw: unknown,
  classBucket: unknown
): boolean {
  if (
    String(classBucket || "")
      .trim()
      .toUpperCase() !==
    "FRESHMAN"
  ) {
    return false;
  }

  const raw =
    String(classYearRaw || "")
      .trim()
      .toUpperCase()
      .replace(/\./g, "")
      .replace(/\s+/g, " ");

  return (
    raw === "R-FR" ||
    raw === "RS-FR" ||
    raw === "RFR" ||
    raw === "RSFR" ||
    raw === "R FR" ||
    raw === "RS FR" ||
    raw === "REDSHIRT FRESHMAN" ||
    raw.includes(
      "REDSHIRT FRESHMAN"
    )
  );
}

function buildRosterIntelligence(
  snapshot: any,
  players: any[],
  playerProfile: {
    primaryPos?: string | null;
    secondaryPos?: string | null;
    throws?: string | null;
  } | null
) {
  if (!snapshot) return null;

  const classBreakdown = {
    freshman: 0,
    redshirtFreshman: 0,
    sophomore: 0,
    junior: 0,
    senior: 0,
    graduate: 0,
    unknown: 0,
  };

  type PositionCounts = {
    total: number;
    freshman: number;
    redshirtFreshman: number;
    sophomore: number;
    junior: number;
    senior: number;
    graduate: number;
    unknown: number;
  };

  const positionMap =
    new Map<
      string,
      PositionCounts
    >();

  for (const player of players) {
    const classBucket =
      String(
        player.classBucket || ""
      )
        .trim()
        .toUpperCase();

    let classKey:
      | "freshman"
      | "redshirtFreshman"
      | "sophomore"
      | "junior"
      | "senior"
      | "graduate"
      | "unknown" =
      "unknown";

    if (
      isRedshirtFreshmanClass(
        player.classYearRaw,
        player.classBucket
      )
    ) {
      classKey =
        "redshirtFreshman";
    } else if (
      classBucket ===
      "FRESHMAN"
    ) {
      classKey =
        "freshman";
    } else if (
      classBucket ===
      "SOPHOMORE"
    ) {
      classKey =
        "sophomore";
    } else if (
      classBucket ===
      "JUNIOR"
    ) {
      classKey =
        "junior";
    } else if (
      classBucket ===
      "SENIOR"
    ) {
      classKey =
        "senior";
    } else if (
      classBucket ===
      "GRADUATE"
    ) {
      classKey =
        "graduate";
    }

    classBreakdown[classKey] +=
      1;

    const positions =
      normalizeRosterPositionValue(
        player.positionRaw ||
        player.primaryPosition
      );

    for (
      const position
      of positions
    ) {
      const existing =
        positionMap.get(position) || {
          total: 0,
          freshman: 0,
          redshirtFreshman: 0,
          sophomore: 0,
          junior: 0,
          senior: 0,
          graduate: 0,
          unknown: 0,
        };

      existing.total += 1;
      existing[classKey] += 1;

      positionMap.set(
        position,
        existing
      );
    }
  }

  const orderedPositions =
    buildPlayerRosterPositionOrder(
      playerProfile
    );

  const positionRank =
    new Map(
      orderedPositions.map(
        (
          position,
          index
        ) => [
          position,
          index,
        ]
      )
    );

  const positions =
    Array.from(
      positionMap.entries()
    )
      .map(
        (
          [
            position,
            counts,
          ]
        ) => ({
          position,
          ...counts,

          departing:
            counts.senior +
            counts.graduate,
        })
      )
      .sort(
        (
          a,
          b
        ) => {
          const aRank =
            positionRank.get(
              a.position
            ) ??
            Number.MAX_SAFE_INTEGER;

          const bRank =
            positionRank.get(
              b.position
            ) ??
            Number.MAX_SAFE_INTEGER;

          if (
            aRank !==
            bRank
          ) {
            return (
              aRank -
              bRank
            );
          }

          return a.position.localeCompare(
            b.position
          );
        }
      );

  return {
    season:
      snapshot.season,

    rosterSize:
      snapshot.rosterSize ??
      players.length,

    sourceUrl:
      snapshot.sourceUrl ||
      null,

    verifiedAt:
      snapshot.verifiedAt ||
      null,

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
          throws: true,
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
      throws:
        asString(user.Player?.throws) ??
        asString(normalized?.throws),
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
              classYearRaw: true,
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
                rosterPlayersByScope.get(scopeKey) || [],
                profile?.player || null
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