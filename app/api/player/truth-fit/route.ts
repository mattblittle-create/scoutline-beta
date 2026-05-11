// app/api/player/truth-fit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { scoreCollegeFit } from "@/app/lib/truth-fit/scoreCollegeFit";
import { getBestMetricBenchmarks } from "@/app/lib/truth-fit/getBestMetricBenchmarks";
import { getDistanceResult } from "@/lib/recommendations/distance";
import { getCoordinatesForZip } from "@/lib/recommendations/zipCoordinates";

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
      homeState:
        asString(normalized?.homeState) ??
        asString(normalized?.state) ??
        asString(normalized?.playerState) ??
        asString(normalized?.addressState),
      homeZip:
        asString(normalized?.homeZip) ??
        asString(normalized?.zip) ??
        asString(normalized?.zipcode) ??
        asString(normalized?.postalCode),
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

    const playerCoordinates = getCoordinatesForZip(profile.player.homeZip);

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
    OR: [
      { baseballWebsiteUrl: { not: null } },
      { currentRosterSize: { gt: 0 } },
    ],
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

          const distance = playerCoordinates
            ? getDistanceResult(
                playerCoordinates,
                {
                  latitude: college.latitude,
                  longitude: college.longitude,
                }
              )
            : null;

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
              distance,
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
            distance,
            truthFit: fit,
          };
        })
      )
).sort((a, b) => {
  const playerState = String(profile.player.homeState || "").toUpperCase();

  const regionalMap: Record<string, string[]> = {
    SOUTHEAST: ["SC", "NC", "GA", "FL", "AL", "MS", "TN", "KY", "AR", "LA", "VA"],
    MID_ATLANTIC: ["DE", "MD", "DC", "VA", "WV", "NC", "SC", "PA", "NJ"],
    NORTHEAST: ["ME", "NH", "VT", "MA", "RI", "CT", "NY", "NJ", "PA"],
    MIDWEST: ["OH", "MI", "IN", "IL", "WI", "MN", "IA", "MO", "ND", "SD", "NE", "KS"],
    SOUTHWEST: ["TX", "OK", "NM", "AZ"],
    WEST: ["CO", "UT", "ID", "MT", "WY", "NV"],
    PACIFIC: ["CA", "OR", "WA", "AK", "HI"],
  };

  const neighborStates: Record<string, string[]> = {
    SC: ["NC", "GA", "TN", "VA", "FL"],
    NC: ["SC", "VA", "GA", "TN"],
    GA: ["SC", "NC", "FL", "AL", "TN"],
    FL: ["GA", "AL", "SC"],
    TN: ["KY", "VA", "NC", "GA", "AL", "MS", "AR", "MO"],
    VA: ["NC", "TN", "KY", "WV", "MD", "DC", "SC"],
  };

  const playerRegion =
    Object.entries(regionalMap).find(([, states]) =>
      states.includes(playerState)
    )?.[0] || null;

  function geographyRank(item: any) {
    const schoolState = String(item.college?.state || "").toUpperCase();
    const schoolRegion = String(item.college?.region || "");

    if (playerState && schoolState === playerState) return 5;
    if (playerState && (neighborStates[playerState] || []).includes(schoolState)) return 4;
    if (playerRegion && schoolRegion === playerRegion) return 3;
    return 1;
  }

  function fitScore(item: any) {
    const label = item.truthFit?.label || "";
    const score = Number(item.truthFit?.score || 0);

    const labelBonus =
      label === "Strong Fit"
        ? 30
        : label === "Match"
        ? 20
        : label === "Possible Match"
        ? 10
        : 0;

    return labelBonus + score;
  }

  function programStrengthScore(item: any) {
    const division = String(item.college?.baseballProgram?.division || "");
    const conference = String(item.college?.baseballProgram?.conference || "").toUpperCase();
    const rosterSize = Number(item.college?.baseballProgram?.currentRosterSize || 0);

    const divisionScore =
      division === "NCAA_D1"
        ? 40
        : division === "NCAA_D2"
        ? 32
        : division === "NAIA"
        ? 28
        : division === "NJCAA_D1"
        ? 26
        : division === "NCAA_D3"
        ? 24
        : division === "NJCAA_D2"
        ? 18
        : division === "NJCAA_D3"
        ? 14
        : 8;

    const conferenceBonus =
      ["SEC", "ACC", "BIG TEN", "BIG 12", "PAC-12", "SUN BELT", "AMERICAN ATHLETIC", "AAC", "CONFERENCE USA"].some((name) =>
        conference.includes(name)
      )
        ? 10
        : 0;

    const rosterBonus =
      rosterSize >= 40 ? 5 : rosterSize >= 30 ? 3 : rosterSize >= 20 ? 1 : 0;

    return divisionScore + conferenceBonus + rosterBonus;
  }

  const filtersActive = Boolean(division || region || state || control);

  const aGeo = geographyRank(a);
  const bGeo = geographyRank(b);

  const aFit = fitScore(a);
  const bFit = fitScore(b);

  const aProgram = programStrengthScore(a);
  const bProgram = programStrengthScore(b);

  // Default mode: feel local and realistic first.
  if (!filtersActive) {
    if (bGeo !== aGeo) return bGeo - aGeo;
    if (bFit !== aFit) return bFit - aFit;
    if (bProgram !== aProgram) return bProgram - aProgram;
    return a.college.name.localeCompare(b.college.name);
  }

  // Filtered mode: respect the player's refined search intent first.
  if (bFit !== aFit) return bFit - aFit;
  if (bProgram !== aProgram) return bProgram - aProgram;
  if (bGeo !== aGeo) return bGeo - aGeo;

  return a.college.name.localeCompare(b.college.name);
});

const enrichedResults = results.map((item, index) => {
  const fit = item.truthFit;
  const baseball = item.college?.baseballProgram;

    const playerState = String(profile.player.homeState || "").toUpperCase();

  const regionalMap: Record<string, string[]> = {
    SOUTHEAST: ["SC", "NC", "GA", "FL", "AL", "MS", "TN", "KY", "AR", "LA", "VA"],
    MID_ATLANTIC: ["DE", "MD", "DC", "VA", "WV", "NC", "SC", "PA", "NJ"],
    NORTHEAST: ["ME", "NH", "VT", "MA", "RI", "CT", "NY", "NJ", "PA"],
    MIDWEST: ["OH", "MI", "IN", "IL", "WI", "MN", "IA", "MO", "ND", "SD", "NE", "KS"],
    SOUTHWEST: ["TX", "OK", "NM", "AZ"],
    WEST: ["CO", "UT", "ID", "MT", "WY", "NV"],
    PACIFIC: ["CA", "OR", "WA", "AK", "HI"],
  };

  const neighborStates: Record<string, string[]> = {
    SC: ["NC", "GA", "TN", "VA", "FL"],
    NC: ["SC", "VA", "GA", "TN"],
    GA: ["SC", "NC", "FL", "AL", "TN"],
    FL: ["GA", "AL", "SC"],
    TN: ["KY", "VA", "NC", "GA", "AL", "MS", "AR", "MO"],
    VA: ["NC", "TN", "KY", "WV", "MD", "DC", "SC"],
  };

  const playerRegion =
    Object.entries(regionalMap).find(([, states]) =>
      states.includes(playerState)
    )?.[0] || null;

  const schoolState = String(item.college?.state || "").toUpperCase();
  const schoolRegion = String(item.college?.region || "");

  const geographyLabel =
    playerState && schoolState === playerState
      ? "In-State Fit"
      : playerState && (neighborStates[playerState] || []).includes(schoolState)
      ? "Nearby Regional Fit"
      : playerRegion && schoolRegion === playerRegion
      ? "Regional Fit"
      : "National Opportunity";

  const fitScore = Number(fit?.score || 0);

  const fitType =
    fitScore >= 88 && String(fit?.label || "") === "Strong Fit"
      ? "Strong Fit"
      : fitScore >= 76
      ? "Competitive Fit"
      : fitScore >= 62
      ? "Developmental Fit"
      : fitScore >= 50
      ? "Stretch Fit"
      : "Reach School";

  const fitLabel = fit?.label || "Fit";
  const division = String(baseball?.division || "").replace(/_/g, " ");
  const state = item.college?.state || "";
  const conference = baseball?.conference || "";

  const hasHighRosterNeed = fit.reasons?.some((r) =>
    r.includes("HIGH roster need")
  );

  const hasAcademicFit = fit.reasons?.some((r) =>
    r.toLowerCase().includes("gpa")
  );

  const hasMetricStrength =
    fit.reasons?.some((r) => r.toLowerCase().includes("metrics")) ||
    fit.metricComparisons?.some((m) => m.status === "ABOVE");

  const topGap = Array.isArray(fit.gaps) ? fit.gaps[0] : null;

  let priorityReason = "";

  if (hasHighRosterNeed) {
    priorityReason = `${fitLabel} • ${division || "College"} program • immediate roster need for your profile.`;
  } else if (hasMetricStrength && hasAcademicFit) {
    priorityReason = `${fitLabel} • strong academic and athletic alignment with this program.`;
  } else if (hasMetricStrength) {
    priorityReason = `${fitLabel} • your metrics compare well with this program's benchmark data.`;
  } else if (hasAcademicFit) {
    priorityReason = `${fitLabel} • your academic profile strengthens this match.`;
  } else if (topGap) {
    priorityReason = `${fitLabel} • good school to track while improving: ${topGap}`;
  } else {
    priorityReason = `${fitLabel} • ${[division, conference, state]
      .filter(Boolean)
      .join(" • ") || "program fit based on your current profile"}.`;
  }

  return {
    ...item,
    isTopRecommendation: index === 0,
    priorityReason,
    geographyLabel,
    fitType,
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

const divisionPrestigeRank: Record<string, number> = {
  NCAA_D1: 7,
  NCAA_D2: 6,
  NCAA_D3: 5,
  NAIA: 4,
  NJCAA_D1: 3,
  NJCAA_D2: 2,
  NJCAA_D3: 1,
};

const recommendedLaneDivision =
  [...divisionFits]
    .filter((item) =>
      ["Strong Fit", "Match", "Possible Match"].includes(item.fitTier)
    )
    .sort((a, b) => {
      const aRank = divisionPrestigeRank[a.division] || 0;
      const bRank = divisionPrestigeRank[b.division] || 0;

      if (bRank !== aRank) return bRank - aRank;
      return b.bestScore - a.bestScore;
    })[0]?.division ||
  rankedDivisionFits[0]?.division ||
  null;

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

const recommendedDivisionResults = [...enrichedResults].sort((a, b) => {
  const aDivision = String(a.college?.baseballProgram?.division || "");
  const bDivision = String(b.college?.baseballProgram?.division || "");

  const aIsRecommendedDivision = aDivision === recommendedLaneDivision ? 1 : 0;
  const bIsRecommendedDivision = bDivision === recommendedLaneDivision ? 1 : 0;

  if (bIsRecommendedDivision !== aIsRecommendedDivision) {
    return bIsRecommendedDivision - aIsRecommendedDivision;
  }

  const aGeo =
    a.geographyLabel === "In-State Fit"
      ? 3
      : a.geographyLabel === "Nearby Regional Fit"
      ? 2
      : a.geographyLabel === "Regional Fit"
      ? 1
      : 0;

  const bGeo =
    b.geographyLabel === "In-State Fit"
      ? 3
      : b.geographyLabel === "Nearby Regional Fit"
      ? 2
      : b.geographyLabel === "Regional Fit"
      ? 1
      : 0;

  if (bGeo !== aGeo) return bGeo - aGeo;

  const aScore = Number(a.truthFit?.score || 0);
  const bScore = Number(b.truthFit?.score || 0);

  if (bScore !== aScore) return bScore - aScore;

  return a.college.name.localeCompare(b.college.name);
});

const finalResults = recommendedDivisionResults.map((item, index) => {
  const score = Number(item.truthFit?.score || 0);
  const fitType = String(item.fitType || "");
  const geo = String(item.geographyLabel || "");

  const isTopRecommendation =
    index < 3 &&
    score >= 60 &&
    fitType !== "Reach School" &&
    ["In-State Fit", "Nearby Regional Fit", "Regional Fit"].includes(geo);

  return {
    ...item,
    isTopRecommendation,
  };
});

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
      results: finalResults,
    });
  } catch (err) {
    console.error("PLAYER_TRUTH_FIT_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Could not generate Truth Fit results." },
      { status: 500 }
    );
  }
}