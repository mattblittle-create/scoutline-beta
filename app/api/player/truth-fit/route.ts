// app/api/player/truth-fit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { scoreCollegeFit } from "@/app/lib/truth-fit/scoreCollegeFit";
import { getBestMetricBenchmarks } from "@/app/lib/truth-fit/getBestMetricBenchmarks";

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

function cleanFilter(value: string | null) {
  const s = String(value || "").trim();
  if (!s || s === "ALL") return null;
  return s;
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
    email: profile.email || user.email,
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
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const profile = await getCurrentPlayerProfile();

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Not logged in or player profile not found." },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;

    const division = cleanFilter(searchParams.get("division"));
    const region = cleanFilter(searchParams.get("region"));
    const state = cleanFilter(searchParams.get("state"))?.toUpperCase() || null;
    const control = cleanFilter(searchParams.get("control"));

    const colleges = await prisma.college.findMany({
      take: 250,
      orderBy: { name: "asc" },
      where: {
        ...(region ? { region: region as any } : {}),
        ...(state ? { state } : {}),
        ...(control ? { control: control as any } : {}),
        baseballProgram: {
          is: {
            ...(division ? { division: division as any } : {}),
          },
        },
      },
      include: {
        baseballProgram: {
          include: {
            rosterNeeds: true,
            metricAverages: true,
          },
        },
      },
    });

    const results = (
      await Promise.all(
        colleges.map(async (college) => {
          const baseball = college.baseballProgram;

          const bestMetrics = await getBestMetricBenchmarks({
            programId: baseball?.id || null,
            collegeName: college.name,
            conference: baseball?.conference || college.conference || null,
            division: String(baseball?.division || college.division || ""),
          });

          const fit = scoreCollegeFit({
            player: profile.player,
            college: {
              averageGpa: asNumber(baseball?.averageGpa),
              division: baseball?.division || college.division || null,
              metricAverages: bestMetrics.benchmarks,
              metricBenchmarkSource: {
                level: bestMetrics.level,
                label: bestMetrics.label,
                confidence: bestMetrics.confidence,
              },
              rosterNeeds:
                baseball?.rosterNeeds?.map((need) => ({
                  gradYear: need.gradYear,
                  position: need.position,
                  needLevel: need.needLevel,
                })) || [],
            },
          });

          return {
            college: {
              id: college.id,
              name: college.name,
              slug: college.slug,
              websiteUrl: college.websiteUrl,
              admissionsUrl: college.admissionsUrl,
              city: college.city,
              state: college.state,
              region: college.region,
              control: college.control,
              schoolType: college.schoolType,
              tuitionInState: college.tuitionInState,
              tuitionOutOfState: college.tuitionOutOfState,
              baseballProgram: baseball
                ? {
                    nickname: baseball.nickname,
                    division: baseball.division,
                    conference: baseball.conference,
                    baseballWebsiteUrl: baseball.baseballWebsiteUrl,
                    averageGpa: baseball.averageGpa,
                    currentRosterSize: baseball.currentRosterSize,
                    transferHeavy: baseball.transferHeavy,
                    jucoFriendly: baseball.jucoFriendly,
                  }
                : null,
            },
            truthFit: fit,
          };
        })
      )
).sort((a, b) => {
  const labelRank = (l: string) => {
    if (l === "Strong Fit") return 3;
    if (l === "Match") return 2;
    if (l === "Possible Match") return 1;
    return 0;
  };

  const aRank = labelRank(a.truthFit.label);
  const bRank = labelRank(b.truthFit.label);

  if (bRank !== aRank) return bRank - aRank;

  return b.truthFit.score - a.truthFit.score;
});

const enrichedResults = results.map((item, index) => {
  const fit = item.truthFit;

  let priorityReason = "";

  if (fit.reasons?.some((r) => r.includes("HIGH roster need"))) {
    priorityReason = "This program has an immediate roster need for your profile.";
  } else if (fit.reasons?.some((r) => r.includes("GPA"))) {
    priorityReason = "You are a strong academic fit for this program.";
  } else if (fit.reasons?.some((r) => r.includes("metrics"))) {
    priorityReason = "Your performance metrics align well with this program.";
  } else {
    priorityReason = "This program aligns well with your overall profile.";
  }

  return {
    ...item,
    isTopRecommendation: index === 0,
    priorityReason,
  };
});

const topResults = enrichedResults.slice(0, 25);

const divisionCounts: Record<string, number> = {};
const labelCounts: Record<string, number> = {};
const gapCounts: Record<string, number> = {};

for (const r of topResults) {
  const division = r.college?.baseballProgram?.division || "UNKNOWN";
  const label = r.truthFit?.label || "UNKNOWN";

  divisionCounts[division] = (divisionCounts[division] || 0) + 1;
  labelCounts[label] = (labelCounts[label] || 0) + 1;

  const gaps = Array.isArray(r.truthFit?.gaps) ? r.truthFit.gaps : [];
  for (const gap of gaps) {
    const key = String(gap || "").trim();
    if (!key) continue;
    gapCounts[key] = (gapCounts[key] || 0) + 1;
  }
}

function topKey(obj: Record<string, number>) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

const ALL_DIVISIONS = [
  "NCAA_D1",
  "NCAA_D2",
  "NCAA_D3",
  "NAIA",
  "NJCAA_D1",
  "NJCAA_D2",
  "NJCAA_D3",
];

function outlookForFit(fit: string) {
  if (fit === "Strong Fit") {
    return "You are tracking as a strong recruit for this division.";
  }
  if (fit === "Match") {
    return "You have solid alignment with programs at this division.";
  }
  if (fit === "Possible Match") {
    return "You are close to matching this division—development will unlock more opportunities.";
  }
  if (fit === "No Data Yet") {
    return "ScoutLine does not have enough matching program data for this division yet.";
  }
  return "This division is currently more of a reach based on available profile and benchmark data.";
}

const divisionFits = await Promise.all(
  ALL_DIVISIONS.map(async (division) => {
    const divisionResults = enrichedResults.filter(
      (r) => String(r.college?.baseballProgram?.division || "") === division
    );

    const bestMetrics = await getBestMetricBenchmarks({
      programId: null,
      collegeName: null,
      conference: null,
      division,
    });

    const benchmarkOnlyFit = scoreCollegeFit({
      player: profile.player,
      college: {
        averageGpa: null,
        division,
        metricAverages: bestMetrics.benchmarks,
        metricBenchmarkSource: {
          level: bestMetrics.level,
          label: bestMetrics.label,
          confidence: bestMetrics.confidence,
        },
        rosterNeeds: [],
      },
    });

    const actualBest = [...divisionResults].sort(
      (a, b) => (b.truthFit?.score || 0) - (a.truthFit?.score || 0)
    )[0];

    const laneFit =
      actualBest && actualBest.truthFit?.score > benchmarkOnlyFit.score
        ? actualBest.truthFit
        : benchmarkOnlyFit;

    return {
      division,
      fitTier: laneFit.label,
      bestScore: laneFit.score,
      count: divisionResults.length,
      outlook: outlookForFit(laneFit.label),
      topGaps: Array.isArray(laneFit.gaps) ? laneFit.gaps.slice(0, 2) : [],
      benchmarkSource: laneFit.benchmarkSource?.metrics || null,
    };
  })
);

const rankedDivisionFits = [...divisionFits].sort((a, b) => {
  const fitRank = (fit: string) => {
    if (fit === "Strong Fit") return 5;
    if (fit === "Match") return 4;
    if (fit === "Possible Match") return 3;
    if (fit === "Reach / Not Yet") return 2;
    return 1;
  };

  const aRank = fitRank(a.fitTier);
  const bRank = fitRank(b.fitTier);

  if (bRank !== aRank) return bRank - aRank;

  return b.bestScore - a.bestScore;
});

const recommendedLaneDivision = rankedDivisionFits[0]?.division || null;

const orderedDivisionFits = ALL_DIVISIONS.map((division) => {
  const fit = divisionFits.find((item) => item.division === division);
  return {
    ...fit,
    division,
    isRecommendedLane: division === recommendedLaneDivision,
  };
}).filter(Boolean);

const dominantDivision = rankedDivisionFits[0]?.division || topKey(divisionCounts);
const dominantFit = rankedDivisionFits[0]?.fitTier || topKey(labelCounts);

function projectionTierFromLane(division?: string | null, fit?: string | null) {
  const d = String(division || "");
  const f = String(fit || "");

  if (d === "NCAA_D1" && (f === "Strong Fit" || f === "Match")) {
    return "D1 Track";
  }

  if (
    (d === "NCAA_D2" || d === "NAIA" || d === "NJCAA_D1") &&
    (f === "Strong Fit" || f === "Match")
  ) {
    return "D2 / NAIA / JUCO Fit";
  }

  if (
    (d === "NCAA_D3" || d === "NJCAA_D2" || d === "NJCAA_D3") &&
    (f === "Strong Fit" || f === "Match" || f === "Possible Match")
  ) {
    return "D3 / JUCO Development Fit";
  }

  if (f === "Possible Match") {
    return "Emerging College Prospect";
  }

  return "Developmental Prospect";
}

const projectionTier = projectionTierFromLane(dominantDivision, dominantFit);

const topGaps = Object.entries(gapCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 2)
  .map(([gap]) => gap);

let outlook = "Balanced recruiting opportunity across multiple levels.";

if (dominantFit === "Strong Fit") {
  outlook = "You are tracking as a strong recruit with multiple program fits.";
} else if (dominantFit === "Match") {
  outlook = "You have solid alignment with several programs at your current level.";
} else if (dominantFit === "Possible Match") {
  outlook = "You are close to matching college benchmarks—development will unlock more opportunities.";
} else {
  outlook = "You are still developing toward college-level benchmarks—focus on growth areas.";
}

return NextResponse.json({
  ok: true,
  player: profile.player,
  summary: {
    dominantDivision,
    dominantFit,
    projectionTier,
    outlook,
    topGaps,
    divisionFits: orderedDivisionFits,
    recommendedLaneDivision,
  },
  filters: {
        division,
        region,
        state,
        control,
      },
      count: results.length,
      results: enrichedResults,
    });
  } catch (err) {
    console.error("PLAYER_TRUTH_FIT_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Could not generate Truth Fit results." },
      { status: 500 }
    );
  }
}