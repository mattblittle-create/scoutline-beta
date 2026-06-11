// app/dashboard/player/suggested-programs/page.tsx

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";
import { calculateOpportunityScore } from "@/lib/recommendations/opportunityScore";
import { buildOpportunityNarrative } from "@/lib/recommendations/opportunityNarrative";
import { buildRecruitingStrategy } from "@/lib/recommendations/recruitingStrategy";
import { ACADEMIC_AREA_OPTIONS } from "@/app/lib/academics/academicAreas";

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
    return "D3 / JUCO Fit";
  }

  if (f === "Possible Match") {
    return "Emerging Prospect";
  }

  return "Developmental Prospect";
}

function getPriorityFromFit(label: string) {
  if (label === "Strong Fit") return "HIGH";
  if (label === "Match") return "MEDIUM";
  return "LOW";
}

function getCollegeDivision(item: any) {
  return String(item?.college?.baseballProgram?.division || "").trim();
}

function getDivisionIdentity(division?: string | null) {
  const d = String(division || "").toUpperCase();

  if (d === "NCAA_D1") {
    return {
      label: "NCAA D1",
      border: "#1e3a8a",
      background: "#eff6ff",
      text: "#1e3a8a",
      accent: "#caa042",
    };
  }

  if (d === "NCAA_D2") {
    return {
      label: "NCAA D2",
      border: "#16a34a",
      background: "#f0fdf4",
      text: "#166534",
      accent: "#22c55e",
    };
  }

  if (d === "NCAA_D3") {
    return {
      label: "NCAA D3",
      border: "#64748b",
      background: "#f8fafc",
      text: "#334155",
      accent: "#94a3b8",
    };
  }

  if (d === "NAIA") {
    return {
      label: "NAIA",
      border: "#7e22ce",
      background: "#faf5ff",
      text: "#6b21a8",
      accent: "#a855f7",
    };
  }

  if (d.includes("NJCAA")) {
    return {
      label: pretty(d),
      border: "#ea580c",
      background: "#fff7ed",
      text: "#9a3412",
      accent: "#fb923c",
    };
  }

  return {
    label: pretty(d),
    border: "#cbd5e1",
    background: "#f8fafc",
    text: "#334155",
    accent: "#94a3b8",
  };
}

function getDistanceMiles(item: any) {
  const raw =
    item?.college?.distance?.miles ??
    item?.distance?.miles ??
    item?.distanceMiles ??
    null;

  const miles = Number(raw);
  return Number.isFinite(miles) ? miles : null;
}

function getGeographyRank(item: any) {
  const miles = getDistanceMiles(item);

  // Best possible source: true lat/lng distance.
  if (typeof miles === "number") return miles;

  const geo = [
    item?.geographyLabel,
    item?.distance?.label,
    item?.priorityReason,
    ...(Array.isArray(item?.truthFit?.reasons) ? item.truthFit.reasons : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  // Fallback hierarchy when exact miles are not available.
  if (geo.includes("ZIP")) return 25;
  if (geo.includes("LOCAL") || geo.includes("CITY")) return 50;
  if (geo.includes("IN-STATE") || geo.includes("IN STATE") || geo.includes("STATE")) return 150;
  if (geo.includes("NEARBY") || geo.includes("REGIONAL") || geo.includes("REGION")) return 400;
  if (geo.includes("DRIVABLE")) return 700;
  if (geo.includes("NATIONAL")) return 2000;

  return 9999;
}

function getRecruitingAnchors(
  item: any,
  allItems: any[],
  bestLaneDivision?: string | null
) {
  const anchors: string[] = [];

  const score = Number(item?.truthFit?.score ?? 0);

  const distance =
    item?.college?.distance?.miles ??
    item?.distance?.miles ??
    999999;

  const metricStrength = Array.isArray(item?.truthFit?.metricComparisons)
    ? item.truthFit.metricComparisons.filter(
        (m: any) => m.status === "ABOVE"
      ).length
    : 0;

  const bestScore = Math.max(
    ...allItems.map((i) => Number(i?.truthFit?.score ?? 0))
  );

  const closestDistance = Math.min(
    ...allItems.map(
      (i) =>
        i?.college?.distance?.miles ??
        i?.distance?.miles ??
        999999
    )
  );

  const bestMetricStrength = Math.max(
    ...allItems.map((i) =>
      Array.isArray(i?.truthFit?.metricComparisons)
        ? i.truthFit.metricComparisons.filter(
            (m: any) => m.status === "ABOVE"
          ).length
        : 0
    )
  );

  if (score === bestScore) {
    anchors.push("Highest Match Score");
  }

  if (distance === closestDistance && distance < 999999) {
    anchors.push("Best Local Match");
  }

const academicScore = Number(item?.truthFit?.academicFit?.score ?? 0);

if (academicScore >= 90) {
  anchors.push("Best Academic Match");
} else if (academicScore >= 50) {
  anchors.push("Academic Match");
}

  if (metricStrength === bestMetricStrength && metricStrength > 0) {
    anchors.push("Best Athletic Match");
  }

  if (
    bestLaneDivision &&
    getCollegeDivision(item) === bestLaneDivision &&
    score >= 75
  ) {
    anchors.push("Best Lane Target");
  }

  return anchors.slice(0, 3);
}

function getSuggestedProgramGroup(item: any, bestLaneDivision?: string | null) {
  const bestLane = String(bestLaneDivision || "").trim();
  const division = getCollegeDivision(item);
  const score = Number(item?.truthFit?.score ?? 0);
  const label = String(item?.truthFit?.label || "");

  if (bestLane && division === bestLane) {
    return {
      key: "BEST_LANE",
      title: `Best Fit — ${pretty(bestLane)}`,
      description:
        "Primary recruiting targets aligned with your current best lane, match score, and available program data.",
    };
  }

  if (score >= 70 || label === "Strong Fit" || label === "Match") {
    return {
      key: "STRONG_SECONDARY",
      title: "Strong Secondary Fits",
      description:
        "Programs outside your best lane that still show strong profile alignment or meaningful recruiting opportunity.",
    };
  }

  if (score >= 55 || label === "Possible Match") {
    return {
      key: "DEVELOPMENTAL",
      title: "Developmental Options",
      description:
        "Programs worth monitoring as your metrics, video, academics, or recruiting profile continue to improve.",
    };
  }

  return {
    key: "LONG_TERM",
    title: "Long-Term / Reach Targets",
    description:
      "Programs that may require additional development, stronger verified metrics, or a broader recruiting strategy.",
  };
}

function getAcademicMatchScore(item: any) {
  const score = Number(item?.truthFit?.academicFit?.score ?? 0);
  return Number.isFinite(score) ? score : 0;
}

function getRosterNeedScore(item: any) {
  const baseball = item?.college?.baseballProgram || {};
  const needs = Array.isArray(baseball?.rosterNeeds) ? baseball.rosterNeeds : [];

  const needLevels = needs
    .map((need: any) => String(need?.needLevel || "").toUpperCase())
    .filter(Boolean);

  if (needLevels.includes("HIGH")) return 100;
  if (needLevels.includes("MEDIUM")) return 70;
  if (needLevels.includes("LOW")) return 40;

  return 0;
}

function getVerifiedProgramScore(item: any) {
  const college = item?.college || {};
  const baseball = college?.baseballProgram || {};

  const collegeVerified =
    String(college?.verificationStatus || "").toUpperCase() === "VERIFIED";

  const programVerified =
    String(baseball?.verificationStatus || "").toUpperCase() === "VERIFIED" ||
    baseball?.isVerified === true;

  return collegeVerified || programVerified ? 100 : 0;
}

function getDistanceScore(item: any) {
  const miles = getDistanceMiles(item);

  if (typeof miles !== "number") return 20;

  if (miles <= 50) return 100;
  if (miles <= 150) return 85;
  if (miles <= 400) return 65;
  if (miles <= 700) return 45;
  if (miles <= 1200) return 30;

  return 15;
}

function getSuggestedProgramCompositeScore(
  item: any,
  bestLaneDivision?: string | null
) {
  const truthFitScore = Number(item?.truthFit?.score ?? 0);
  const opportunityScore = Number(item?.opportunityScore?.score ?? 0);
  const academicScore = getAcademicMatchScore(item);
  const rosterNeedScore = getRosterNeedScore(item);
  const verifiedScore = getVerifiedProgramScore(item);
  const distanceScore = getDistanceScore(item);

  const bestLane = String(bestLaneDivision || "").trim();
  const division = getCollegeDivision(item);
  const bestLaneBonus = bestLane && division === bestLane ? 5 : 0;

  const composite =
    truthFitScore * 0.4 +
    opportunityScore * 0.25 +
    academicScore * 0.15 +
    rosterNeedScore * 0.1 +
    distanceScore * 0.05 +
    verifiedScore * 0.05 +
    bestLaneBonus;

  return Math.round(Math.max(0, Math.min(105, composite)));
}

function compareSuggestedPrograms(a: any, b: any, bestLaneDivision?: string | null) {
  const bestLane = String(bestLaneDivision || "").trim();

  const aDivision = getCollegeDivision(a);
  const bDivision = getCollegeDivision(b);

  const aIsBestLane = bestLane && aDivision === bestLane ? 1 : 0;
  const bIsBestLane = bestLane && bDivision === bestLane ? 1 : 0;

  // 1. Best Lane Division still gets priority grouping.
  if (aIsBestLane !== bIsBestLane) {
    return bIsBestLane - aIsBestLane;
  }

  const aComposite = getSuggestedProgramCompositeScore(a, bestLaneDivision);
  const bComposite = getSuggestedProgramCompositeScore(b, bestLaneDivision);

  // 2. Smarter composite score.
  if (aComposite !== bComposite) {
    return bComposite - aComposite;
  }

  const aOpportunity = Number(a?.opportunityScore?.score ?? 0);
  const bOpportunity = Number(b?.opportunityScore?.score ?? 0);

  // 3. Opportunity as first tiebreaker.
  if (aOpportunity !== bOpportunity) {
    return bOpportunity - aOpportunity;
  }

  const aScore = Number(a?.truthFit?.score ?? 0);
  const bScore = Number(b?.truthFit?.score ?? 0);

  // 4. Truth Fit as second tiebreaker.
  if (aScore !== bScore) {
    return bScore - aScore;
  }

  const aAcademic = getAcademicMatchScore(a);
  const bAcademic = getAcademicMatchScore(b);

  // 5. Academic Match next.
  if (aAcademic !== bAcademic) {
    return bAcademic - aAcademic;
  }

  const aGeo = getGeographyRank(a);
  const bGeo = getGeographyRank(b);

  // 6. Closest geography.
  if (aGeo !== bGeo) {
    return aGeo - bGeo;
  }

  const aState = String(a?.college?.state || "");
  const bState = String(b?.college?.state || "");

  if (aState !== bState) {
    return aState.localeCompare(bState);
  }

  const aCity = String(a?.college?.city || "");
  const bCity = String(b?.college?.city || "");

  if (aCity !== bCity) {
    return aCity.localeCompare(bCity);
  }

  return String(a?.college?.name || "").localeCompare(String(b?.college?.name || ""));
}

function getBestRosterNeedLevel(item: any) {
  const baseball = item?.college?.baseballProgram || {};
  const needs = Array.isArray(baseball?.rosterNeeds) ? baseball.rosterNeeds : [];

  const levels = needs
    .map((need: any) => String(need?.needLevel || "").toUpperCase())
    .filter(Boolean);

  if (levels.includes("HIGH")) return "HIGH";
  if (levels.includes("MEDIUM")) return "MEDIUM";
  if (levels.includes("LOW")) return "LOW";

  return "";
}

function getRecommendationPills(item: any) {
  const c = item?.college || {};
  const fit = item?.truthFit || {};
  const baseball = c?.baseballProgram || {};
  const miles = c?.distance?.miles ?? item?.distance?.miles ?? null;

  const pills: string[] = [];

  if (item?.isTopRecommendation) pills.push("TOP RECOMMENDATION");

  if (typeof miles === "number") {
    if (miles <= 50) pills.push("LOCAL");
    else if (miles <= 150) pills.push("REGIONAL");
    else if (miles <= 400) pills.push("DRIVABLE");
    else pills.push("LONG DISTANCE");
  }

  if (baseball?.jucoFriendly) pills.push("JUCO FRIENDLY");
  if (baseball?.transferHeavy) pills.push("TRANSFER FRIENDLY");
  if (fit?.priority === "HIGH") pills.push("HIGH PRIORITY");

  const bestRosterNeed = getBestRosterNeedLevel(item);

if (bestRosterNeed === "HIGH") pills.push("HIGH ROSTER NEED");
else if (bestRosterNeed === "MEDIUM") pills.push("ROSTER NEED");
else if (bestRosterNeed === "LOW") pills.push("LOW ROSTER NEED");

  return Array.from(new Set(pills)).slice(0, 6);
}

function getRecommendationExplanation(item: any) {
  const c = item?.college || {};
  const fit = item?.truthFit || {};
  const baseball = c?.baseballProgram || {};
  const miles = c?.distance?.miles ?? item?.distance?.miles ?? null;

  const reasons: string[] = [];

  if (fit?.label === "Strong Fit") {
    reasons.push("strongly matches your current recruiting profile");
  } else if (fit?.label === "Match") {
    reasons.push("matches your current recruiting profile");
  } else if (fit?.label === "Possible Match") {
    reasons.push("could be a realistic developmental target");
  }

  if (typeof miles === "number") {
    if (miles <= 150) reasons.push("is within a close recruiting radius");
    else if (miles <= 400) reasons.push("is within a manageable travel range");
    else reasons.push("may require a broader travel strategy");
  }

  if (baseball?.jucoFriendly) reasons.push("shows JUCO-friendly program signals");
  if (baseball?.transferHeavy) reasons.push("has transfer-heavy roster tendencies");

  if (!reasons.length) {
    return "Recommended based on your profile data and available school/program information.";
  }

  return `Recommended because this program ${reasons.slice(0, 3).join(", ")}.`;
}

function getRecruitingConfidence(item: any) {
  const fit = item?.truthFit || {};
  const metrics = Array.isArray(fit.metricComparisons) ? fit.metricComparisons : [];
  const reasons = Array.isArray(fit.reasons) ? fit.reasons : [];
  const gaps = Array.isArray(fit.gaps) ? fit.gaps : [];

  const confidence = String(fit?.benchmarkSource?.metrics?.confidence || "").toUpperCase();
  const sourceLabel = String(fit?.benchmarkSource?.metrics?.label || "").toUpperCase();

  const hasStrongSource =
    sourceLabel.includes("SCHOOL") ||
    sourceLabel.includes("CONFERENCE") ||
    confidence === "HIGH";

  const hasEnoughMetrics = metrics.length >= 3;
  const hasSomeMetrics = metrics.length > 0;
  const hasReasons = reasons.length >= 2;
  const hasGaps = gaps.length > 0;

  if (hasStrongSource && hasEnoughMetrics && hasReasons) {
    return {
      label: "High Confidence",
      title:
        "ScoutLine has strong supporting data for this recommendation, including benchmark data and multiple fit signals.",
    };
  }

  if ((hasSomeMetrics && hasReasons) || confidence === "MEDIUM") {
    return {
      label: "Medium Confidence",
      title:
        "ScoutLine has enough supporting data to make a useful recommendation, but more verified player or program data would improve accuracy.",
    };
  }

  if (hasGaps || confidence === "LOW") {
    return {
      label: "Early Projection",
      title:
        "This recommendation is based on limited or developing data. More player metrics and verified program data may change the fit.",
    };
  }

  return {
    label: "Limited Data",
    title:
      "ScoutLine has limited data for this recommendation. Treat this as a starting point, not a final recruiting conclusion.",
  };
}

function getRankingReasons(item: any) {
  const fit = item?.truthFit || {};
  const c = item?.college || {};
  const baseball = c?.baseballProgram || {};
  const reasons: string[] = [];
 
  if (item?.geographyLabel) reasons.push(item.geographyLabel);
  if (item?.distance?.label) reasons.push(item.distance.label);

  if (fit?.score >= 76) reasons.push("Strong match score");
  else if (fit?.score >= 62) reasons.push("Solid fit score");

const bestRosterNeed = getBestRosterNeedLevel(item);

if (bestRosterNeed === "HIGH") {
  reasons.push("High roster need");
} else if (bestRosterNeed === "MEDIUM") {
  reasons.push("Roster opportunity");
} else if (bestRosterNeed === "LOW") {
  reasons.push("Low roster need signal");
}

const academicScore = Number(fit?.academicFit?.score ?? 0);

if (academicScore >= 90) {
  reasons.push("Strong academic match");
} else if (academicScore >= 50) {
  reasons.push("Partial academic match");
}

  if (
    fit?.metricComparisons?.some(
      (m: any) => m.status === "ABOVE" || m.status === "IN_RANGE"
    )
  ) {
    reasons.push("Metric alignment");
  }

  if (baseball?.jucoFriendly) reasons.push("JUCO-friendly program");
  if (baseball?.transferHeavy) reasons.push("Transfer-friendly roster");

  return Array.from(new Set(reasons)).slice(0, 5);
}

const DIVISION_OPTIONS = [
  "ALL",
  "NCAA_D1",
  "NCAA_D2",
  "NCAA_D3",
  "NAIA",
  "NJCAA_D1",
  "NJCAA_D2",
  "NJCAA_D3",
];

const REGION_OPTIONS = [
  "ALL",
  "NORTHEAST",
  "MID_ATLANTIC",
  "SOUTHEAST",
  "MIDWEST",
  "SOUTHWEST",
  "WEST",
  "PACIFIC",
];

const CONTROL_OPTIONS = ["ALL", "PUBLIC", "PRIVATE"];

const STATE_OPTIONS = [
  "ALL",
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
];

export default function PlayerSuggestedProgramsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading Suggested Programs...</div>}>
      <PlayerSuggestedProgramsContent />
    </Suspense>
  );
}

function PlayerSuggestedProgramsContent() {
const searchParams = useSearchParams();
const selectedCollegeId = searchParams.get("collegeId") || "";
const playerProfileId = searchParams.get("playerProfileId") || "";
const fromTeamRoster = searchParams.get("from") === "team-roster";

const backHref = fromTeamRoster ? "/dashboard/team/roster" : "/dashboard/player";
const backLabel = fromTeamRoster ? "Back to Team Roster" : "Back to Dashboard";
const returnTo = searchParams.get("returnTo") || "/dashboard/team/roster";

const toolQuery = playerProfileId
  ? `?playerProfileId=${encodeURIComponent(
      playerProfileId
    )}&from=team-roster&returnTo=${encodeURIComponent(returnTo)}`
  : "";
  const selectedCollegeRef = React.useRef<HTMLElement | null>(null);

  const [planTier, setPlanTier] = React.useState("REDSHIRT");
  const [truthFitResults, setTruthFitResults] = React.useState<any[]>([]);
  const [truthFitSummary, setTruthFitSummary] = React.useState<any>(null);
  const [selectedLaneDivision, setSelectedLaneDivision] = React.useState("");
  const [savedCollegeIds, setSavedCollegeIds] = React.useState<string[]>([]);
  const [savingCollegeId, setSavingCollegeId] = React.useState("");
  const [loadingTruthFit, setLoadingTruthFit] = React.useState(false);
  const [truthFitError, setTruthFitError] = React.useState("");
  const [hasLoadedTruthFit, setHasLoadedTruthFit] = React.useState(false);

  const [divisionFilter, setDivisionFilter] = React.useState("ALL");
  const [regionFilter, setRegionFilter] = React.useState("ALL");
  const [stateFilter, setStateFilter] = React.useState("ALL");
  const [controlFilter, setControlFilter] = React.useState("ALL");
  const [academicAreaFilter, setAcademicAreaFilter] = React.useState("ALL");
  const [visibleCount, setVisibleCount] = React.useState(25);
  const [expandedCollegeIds, setExpandedCollegeIds] = React.useState<string[]>([]);

const effectivePlanTier = fromTeamRoster ? "ALL_AMERICAN" : planTier;

const isRedshirt = effectivePlanTier === "REDSHIRT";
const isAllAmerican =
  effectivePlanTier === "ALL_AMERICAN" || effectivePlanTier === "TEAM";

const selectedLaneFit =
  truthFitSummary?.divisionFits?.find(
    (item: any) => item.division === selectedLaneDivision
  ) || truthFitSummary?.divisionFits?.[0] || null;

const selectedProjectionTier = selectedLaneFit
  ? projectionTierFromLane(selectedLaneFit.division, selectedLaneFit.fitTier)
  : truthFitSummary?.projectionTier || "Developmental Prospect";

const rankedTruthFitResults = React.useMemo(() => {
  const bestLaneDivision =
    selectedLaneFit?.division ||
    truthFitSummary?.recommendedLaneDivision ||
    "";

  return [...truthFitResults].sort((a, b) =>
    compareSuggestedPrograms(a, b, bestLaneDivision)
  );
}, [truthFitResults, selectedLaneFit?.division, truthFitSummary?.recommendedLaneDivision]);

const visibleTruthFitResults = isRedshirt
  ? rankedTruthFitResults.slice(0, 3)
  : rankedTruthFitResults.slice(0, visibleCount);

  const groupedVisibleTruthFitResults = React.useMemo(() => {
  const bestLaneDivision =
    selectedLaneFit?.division ||
    truthFitSummary?.recommendedLaneDivision ||
    "";

  const groupOrder = ["BEST_LANE", "STRONG_SECONDARY", "DEVELOPMENTAL", "LONG_TERM"];

  const map = new Map<
    string,
    {
      key: string;
      title: string;
      description: string;
      items: any[];
    }
  >();

  for (const item of visibleTruthFitResults) {
    const group = getSuggestedProgramGroup(item, bestLaneDivision);

    if (!map.has(group.key)) {
      map.set(group.key, {
        ...group,
        items: [],
      });
    }

    map.get(group.key)?.items.push(item);
  }

  return Array.from(map.values()).sort(
    (a, b) => groupOrder.indexOf(a.key) - groupOrder.indexOf(b.key)
  );
}, [
  visibleTruthFitResults,
  selectedLaneFit?.division,
  truthFitSummary?.recommendedLaneDivision,
]);

  React.useEffect(() => {
    async function loadPlanTier() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json().catch(() => null);

        const nextPlan = data?.user?.planTier || data?.planTier || "REDSHIRT";
        setPlanTier(String(nextPlan || "REDSHIRT"));
      } catch {
        setPlanTier("REDSHIRT");
      }
    }

    loadPlanTier();
  }, []);

  React.useEffect(() => {
    async function loadSaved() {
      try {
        const res = await fetch("/api/player/target-programs", { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (res.ok && data?.ok) {
          const ids = (data.saved || [])
            .map((item: any) => item?.collegeId)
            .filter(Boolean);

          setSavedCollegeIds(ids);
        }
      } catch {
        setSavedCollegeIds([]);
      }
    }

    loadSaved();
  }, []);

  const loadTruthFit = React.useCallback(async () => {
    try {
      setLoadingTruthFit(true);
      setTruthFitError("");

      const params = new URLSearchParams();

if (divisionFilter !== "ALL") params.set("division", divisionFilter);
if (regionFilter !== "ALL") params.set("region", regionFilter);
if (stateFilter !== "ALL") params.set("state", stateFilter);
if (controlFilter !== "ALL") params.set("control", controlFilter);

if (academicAreaFilter !== "ALL") {
  params.set("academicArea", academicAreaFilter);
}

if (playerProfileId) {
  params.set("playerProfileId", playerProfileId);
}

const qs = params.toString();
const url = qs ? `/api/player/truth-fit?${qs}` : "/api/player/truth-fit";

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load suggested programs.");
      }

      const rawResults = data.results || [];

      const enrichedResults = rawResults.map((item: any) => {
        const baseball = item?.college?.baseballProgram || {};
        const primaryRosterNeed = Array.isArray(baseball?.rosterNeeds)
          ? baseball.rosterNeeds[0]
          : null;

        const opportunityScore = calculateOpportunityScore({
            playerPrimaryPosition:
              item?.player?.primaryPosition ??
              item?.player?.primaryPos ??
              item?.profile?.primaryPosition ??
              item?.profile?.primaryPos ??
              data?.player?.primaryPosition ??
              data?.player?.primaryPos ??
              data?.summary?.player?.primaryPosition ??
              data?.summary?.player?.primaryPos ??
              null,

            playerGradYear:
              item?.player?.gradYear ??
              item?.profile?.gradYear ??
              data?.player?.gradYear ??
              data?.summary?.player?.gradYear ??
              null,

            playerSecondaryPositions:
              item?.player?.secondaryPositions ??
              item?.player?.secondaryPos ??
              item?.profile?.secondaryPositions ??
              item?.profile?.secondaryPos ??
              data?.player?.secondaryPositions ??
              data?.player?.secondaryPos ??
              data?.summary?.player?.secondaryPositions ??
              data?.summary?.player?.secondaryPos ??
              [],

            rosterNeedLevel: primaryRosterNeed?.needLevel ?? null,
            rosterTurnoverLevel: baseball?.rosterTurnoverLevel ?? null,
            recruitingAggressiveness: baseball?.recruitingAggressiveness ?? null,
            regionalRecruitingBias: baseball?.regionalRecruitingBias ?? null,
            transferHeavy: baseball?.transferHeavy ?? false,
            jucoFriendly: baseball?.jucoFriendly ?? false,
            currentRosterSize: baseball?.currentRosterSize ?? null,
            headCoachTenureYears: baseball?.headCoachTenureYears ?? null,
            recentWinPercentage: baseball?.recentWinPercentage ?? null,

            graduatingSeniors: baseball?.graduatingSeniors ?? null,
            graduatingPitchers: baseball?.graduatingPitchers ?? null,
            graduatingCatchers: baseball?.graduatingCatchers ?? null,
            graduatingInfielders: baseball?.graduatingInfielders ?? null,
            graduatingOutfielders: baseball?.graduatingOutfielders ?? null,
            returningPitchers: baseball?.returningPitchers ?? null,
            returningPositionPlayers: baseball?.returningPositionPlayers ?? null,
            rosterFreshmen: baseball?.rosterFreshmen ?? null,
            rosterSophomores: baseball?.rosterSophomores ?? null,
            rosterJuniors: baseball?.rosterJuniors ?? null,
            rosterSeniors: baseball?.rosterSeniors ?? null,
            portalTransfersIn: baseball?.portalTransfersIn ?? null,
            portalTransfersOut: baseball?.portalTransfersOut ?? null,
          });

        return {
          ...item,
          opportunityScore,
          opportunityNarrative: buildOpportunityNarrative({
            score: opportunityScore.score,
            label: opportunityScore.label,
            archetype: opportunityScore.archetype,
            confidenceLabel: opportunityScore.confidence?.label,
            reasons: opportunityScore.reasons,
            collegeName: item?.college?.name,
          }),

          recruitingStrategy: buildRecruitingStrategy({
            matchScore: item?.truthFit?.score,
            opportunityScore: opportunityScore.score,
            archetype: opportunityScore.archetype,
            confidenceLabel: opportunityScore.confidence?.label,
          }),
        };
      });

      const sortedResults = selectedCollegeId
        ? [...enrichedResults].sort((a: any, b: any) => {
            const aSelected = a?.college?.id === selectedCollegeId ? 1 : 0;
            const bSelected = b?.college?.id === selectedCollegeId ? 1 : 0;
            return bSelected - aSelected;
          })
        : enrichedResults;

      setTruthFitResults(sortedResults);
      setTruthFitSummary(data.summary || null);
      setHasLoadedTruthFit(true);
    } catch (err) {
      console.error("SUGGESTED_PROGRAMS_LOAD_ERROR", err);
      setTruthFitError("Could not load suggested programs.");
      setHasLoadedTruthFit(true);
    } finally {
      setLoadingTruthFit(false);
    }
}, [
  divisionFilter,
  regionFilter,
  stateFilter,
  controlFilter,
  academicAreaFilter,
  selectedCollegeId,
  playerProfileId,
]);

  React.useEffect(() => {
    loadTruthFit();
  }, [loadTruthFit]);

  React.useEffect(() => {
  setVisibleCount(25);
}, [divisionFilter, regionFilter, stateFilter, controlFilter, academicAreaFilter]);

  React.useEffect(() => {
  const recommendedDivision =
    truthFitSummary?.recommendedLaneDivision ||
    truthFitSummary?.divisionFits?.find((item: any) => item?.isRecommendedLane)?.division ||
    truthFitSummary?.divisionFits?.[0]?.division ||
    "";

  if (recommendedDivision) {
    setSelectedLaneDivision((prev) => prev || recommendedDivision);
  }
}, [truthFitSummary]);

  React.useEffect(() => {
    if (!selectedCollegeId || loadingTruthFit || !truthFitResults.length) return;

    const t = window.setTimeout(() => {
      selectedCollegeRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 150);

    return () => window.clearTimeout(t);
  }, [selectedCollegeId, loadingTruthFit, truthFitResults.length]);

  function toggleExpandedCollege(collegeId: string) {
  setExpandedCollegeIds((prev) =>
    prev.includes(collegeId)
      ? prev.filter((id) => id !== collegeId)
      : [...prev, collegeId]
  );
}

  async function toggleSavedCollege(item: any, fitLabel: string, fitPriority?: string) {
    const collegeId = item?.college?.id;

    if (!collegeId) return;

    const isSaved = savedCollegeIds.includes(collegeId);

    try {
      setSavingCollegeId(collegeId);

      const res = await fetch("/api/player/target-programs", {
        method: isSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSaved
            ? { collegeId }
            : {
                collegeId,
                priority: fitPriority || getPriorityFromFit(fitLabel),

                exportInclude: true,
                boardGroup:
                  item?.recruitingStrategy?.category ??
                  item?.opportunityScore?.archetype ??
                  null,

                strategyCategory: item?.recruitingStrategy?.category ?? null,
                strategyExplanation:
                  item?.recruitingStrategy?.explanation ?? null,

                opportunityScore: item?.opportunityScore?.score ?? null,
                opportunityLabel: item?.opportunityScore?.label ?? null,
                opportunityArchetype:
                  item?.opportunityScore?.archetype ?? null,

                matchScore: item?.truthFit?.score ?? null,
                matchLabel: item?.truthFit?.label ?? fitLabel ?? null,

                narrativeHeadline:
                  item?.opportunityNarrative?.headline ?? null,
                narrativeSummary:
                  item?.opportunityNarrative?.summary ?? null,
                narrativeStrategy:
                  item?.opportunityNarrative?.strategy ?? null,
              }
        ),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Save failed.");
      }

      setSavedCollegeIds((prev) =>
        isSaved ? prev.filter((id) => id !== collegeId) : [...prev, collegeId]
      );
    } catch (err) {
      console.error("SUGGESTED_PROGRAMS_SAVE_ERROR", err);
    } finally {
      setSavingCollegeId("");
    }
  }
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "8px 0 40px" }}>
      <section style={shellStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Suggested Programs</h1>

            <p style={subtitleStyle}>
              ScoutLine-recommended college programs based on your profile, metrics,
              academics, recruiting lane, and available program data.
            </p>

            <button
              type="button"
              onClick={loadTruthFit}
              disabled={loadingTruthFit}
              style={{
                ...primaryButtonStyle,
                opacity: loadingTruthFit ? 0.7 : 1,
                cursor: loadingTruthFit ? "not-allowed" : "pointer",
              }}
            >
              {loadingTruthFit ? "Refreshing Suggested Programs..." : "Refresh Suggested Programs"}
            </button>
          </div>

          <div style={buttonRowStyle}>
<Link
  href={`/dashboard/player/recruiting-tool${toolQuery}`}
  style={secondaryLinkButtonStyle}
>
  Recruiting Tool
</Link>

<Link
  href={`/dashboard/player/college-search${toolQuery}`}
  style={secondaryLinkButtonStyle}
>
  College Search
</Link>

<Link href={backHref} style={backToDashboardStyle}>
  {backLabel}
</Link>
          </div>
        </div>

        {truthFitSummary ? (
  <section
    style={{
      ...laneBoxStyle,
      border: "1px solid #dbeafe",
      background: "#eff6ff",
    }}
  >
    <div style={laneTitleStyle}>Your Recruiting Lane</div>

    <div style={laneGridStyle}>
      <div>
        <div style={laneLabelStyle}>Player Projection</div>
        <div style={projectionTierStyle}>{selectedProjectionTier}</div>
      </div>

      <div>
        <div style={laneLabelStyle}>Division</div>
        <select
          value={selectedLaneDivision}
          onChange={(e) => setSelectedLaneDivision(e.target.value)}
          style={laneSelectStyle}
        >
          {(truthFitSummary.divisionFits?.length
            ? truthFitSummary.divisionFits
            : [{ division: truthFitSummary.dominantDivision || "UNKNOWN" }]
          ).map((item: any) => (
            <option key={item.division} value={item.division}>
              {pretty(item.division)}
              {item.isRecommendedLane ? " — Best Lane" : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div style={laneLabelStyle}>Division Fit</div>
        <div style={laneValueStyle}>
          {selectedLaneFit?.fitTier || truthFitSummary.dominantFit || "—"}
        </div>
      </div>

      <div>
        <div style={laneLabelStyle}>Division Score</div>
        <div style={laneValueStyle}>
          {selectedLaneFit?.bestScore ? `${selectedLaneFit.bestScore}/100` : "—"}
        </div>
      </div>
    </div>
  </section>
) : null}

        <section style={filterPanelStyle}>
          <div style={filterHeaderStyle}>
            <div>
              <h2 style={filterTitleStyle}>Program Filters</h2>
              <p style={filterSubtitleStyle}>
                Narrow your Truth Fit list by division, region, state, and school type.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
setDivisionFilter("ALL");
setRegionFilter("ALL");
setStateFilter("ALL");
setControlFilter("ALL");
setAcademicAreaFilter("ALL");
              }}
              style={secondaryButtonStyle}
            >
              Clear Filters
            </button>
          </div>

<div style={filterGridStyle}>
  <FilterSelect
    label="Division"
    value={divisionFilter}
    onChange={setDivisionFilter}
    options={DIVISION_OPTIONS}
  />

  <FilterSelect
    label="Region"
    value={regionFilter}
    onChange={setRegionFilter}
    options={REGION_OPTIONS}
  />

  <FilterSelect
    label="State"
    value={stateFilter}
    onChange={setStateFilter}
    options={STATE_OPTIONS}
  />

  <FilterSelect
    label="School Type"
    value={controlFilter}
    onChange={setControlFilter}
    options={CONTROL_OPTIONS}
  />

  <FilterSelect
    label="Major"
    value={academicAreaFilter}
    onChange={setAcademicAreaFilter}
    options={["ALL", ...ACADEMIC_AREA_OPTIONS]}
  />
</div>
</section>

{truthFitError ? <div style={errorStyle}>{truthFitError}</div> : null}

        {loadingTruthFit && !truthFitResults.length ? (
          <div style={infoBannerStyle}>
            Generating your suggested programs from your current profile data...
          </div>
        ) : null}

        {!loadingTruthFit && hasLoadedTruthFit && truthFitResults.length === 0 ? (
          <div style={infoBannerStyle}>
            No suggested programs are available for the current filters. Try clearing filters or adding more profile metrics.
          </div>
        ) : null}

        {truthFitResults.length > 0 ? (
          <section style={{ marginTop: 28 }}>
            {selectedCollegeId ? (
              <div style={selectedCollegeBannerStyle}>
                Showing the selected school first, followed by your full Suggested Programs list.
              </div>
            ) : null}

            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Recommended For You</h2>
                <p style={sectionSubtitleStyle}>
                  Ranked by ScoutLine Truth Fit using your current profile data and available school/program data.
                </p>
              </div>

              <div style={countPillStyle}>
                Showing {visibleTruthFitResults.length} of {truthFitResults.length}
              </div>
            </div>

            {isRedshirt && truthFitResults.length > 3 ? (
              <div style={upgradeBoxStyle}>
                <div style={upgradeTitleStyle}>Unlock your full Suggested Programs list</div>
                <div style={upgradeTextStyle}>
                  Redshirt players can preview the top 3 recommendations. Upgrade to Walk-On for the full list, or All-American for full list plus performance comparison insights.
                </div>
                <Link href="/dashboard/player/profile/billing" style={upgradeButtonStyle}>
                  View Upgrade Options
                </Link>
              </div>
            ) : null}

<div
  style={{
    display: "grid",
    gap: 18,
  }}
>
  {groupedVisibleTruthFitResults.map((group) => (
    <section key={group.key} style={resultGroupStyle}>
      <div style={resultGroupHeaderStyle}>
        <div>
          <div style={resultGroupTitleStyle}>{group.title}</div>
          <div style={resultGroupDescriptionStyle}>{group.description}</div>
        </div>

        <div style={resultGroupCountStyle}>
          {group.items.length} program{group.items.length === 1 ? "" : "s"}
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {group.items.map((item) => {
const c = item.college;
const fit = item.truthFit;
const baseball = c.baseballProgram;
const divisionIdentity = getDivisionIdentity(baseball?.division);

const recruitingAnchors = getRecruitingAnchors(
  item,
  rankedTruthFitResults,
  selectedLaneFit?.division
);

const isExpanded = expandedCollegeIds.includes(c.id);

return (
  <article
              key={c.id}
                    ref={c.id === selectedCollegeId ? selectedCollegeRef : null}
style={{
  ...resultCardStyle,
  borderColor: c.id === selectedCollegeId ? "#caa042" : divisionIdentity.border,
  boxShadow:
    c.id === selectedCollegeId
      ? "0 8px 22px rgba(202,160,66,0.20)"
      : "0 1px 2px rgba(0,0,0,0.04)",
  borderLeft: `6px solid ${divisionIdentity.accent}`,
}}
                  >
<div style={resultTopRowStyle}>
  {/* Line 1 left */}
  <div style={{ minWidth: 0 }}>
    <Link href={`/college/${c.slug}`} style={collegeNameStyle}>
      {c.name}
    </Link>
  </div>

  {/* Line 1 right */}
  <div style={actionPillRowStyle}>
    <button
      type="button"
      title={savedCollegeIds.includes(c.id) ? "Remove from Target Programs" : "Save to Target Programs"}
      onClick={() => toggleSavedCollege(item, fit.label, fit.priority)}
      disabled={savingCollegeId === c.id}
      style={{
        width: 32,
        height: 32,
        borderRadius: 999,
        border: "2px solid #0ea5e9",
        background: savedCollegeIds.includes(c.id) ? "#caa042" : "transparent",
        color: savedCollegeIds.includes(c.id) ? "#0f172a" : "#0ea5e9",
        fontWeight: 900,
        cursor: savingCollegeId === c.id ? "not-allowed" : "pointer",
        opacity: savingCollegeId === c.id ? 0.6 : 1,
      }}
    >
      ★
    </button>

    {item.geographyLabel ? <div style={bluePillStyle}>{item.geographyLabel}</div> : null}

    <div style={goldPillStyle}>{getPriorityBadgeText(fit.priority)}</div>

    {item.fitType ? <div style={goldPillStyle}>{item.fitType}</div> : null}
  </div>

  {/* Line 2 left */}
  <div style={locationStyle}>
    {[c.city, c.state].filter(Boolean).join(", ") || "Location TBD"}
    {item.distance?.label ? ` · ${item.distance.label}` : ""}
  </div>

  {/* Line 2 right */}
  <div style={rightPillRowStyle}>
    {item.opportunityScore ? (
      <div
title={getOpportunityTooltip(
  item.opportunityScore.score,
  item.opportunityScore.reasons,
  item.opportunityScore.confidence,
  item.opportunityScore.archetype
)}
        style={{
          ...confidenceBadgeStyle,
          marginTop: 0,
          border: "1px solid rgba(202,160,66,0.45)",
          background: "#fffbeb",
          color: "#92400e",
        }}
      >
        {item.opportunityScore.archetype || "Opportunity Index"}{" "}
        {item.opportunityScore.score}/100
      </div>
    ) : null}

    <div
      title={getFitTooltip(fit.label, fit.score)}
      style={{
        ...confidenceBadgeStyle,
        border: `1px solid ${divisionIdentity.border}`,
        background: divisionIdentity.background,
        color: divisionIdentity.text,
        marginTop: 0,
      }}
    >
      Match Score {fit.score}/100
    </div>

    {(() => {
      const confidence = getRecruitingConfidence(item);

      return (
        <div title={confidence.title} style={{ ...confidenceBadgeStyle, marginTop: 0 }}>
          {confidence.label}
        </div>
      );
    })()}
  </div>

  {/* Line 3 left */}
  <div style={linkRowStyle}>
    {c.websiteUrl ? <ExternalLink href={c.websiteUrl}>School Site</ExternalLink> : null}
    {c.admissionsUrl ? <ExternalLink href={c.admissionsUrl}>Admissions</ExternalLink> : null}
    {baseball?.baseballWebsiteUrl ? (
      <ExternalLink href={baseball.baseballWebsiteUrl}>Baseball Site</ExternalLink>
    ) : null}
  </div>

  {/* Line 3 right */}
  <div style={rightPillRowStyle}>
    {recruitingAnchors.map((anchor) => (
      <div key={anchor} style={anchorPillStyle}>
        {anchor}
      </div>
    ))}
  </div>

  {/* Line 4 left */}
  <div style={recommendationExplanationStyle}>
    {getRecommendationExplanation(item)}
  </div>

  {/* Line 4 right */}
  <div style={rightPillRowStyle}>
    <button
      type="button"
      onClick={() => toggleExpandedCollege(c.id)}
      style={{
        borderRadius: 999,
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 900,
        border: "1px solid #cbd5e1",
        background: isExpanded ? "#0f172a" : "#ffffff",
        color: isExpanded ? "#ffffff" : "#334155",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {isExpanded ? "Hide Details" : "View Details"}
    </button>
  </div>
</div>

<div style={metaGridStyle}>
  <Info
    label="Suggested Rank"
    value={`${getSuggestedProgramCompositeScore(
      item,
      selectedLaneFit?.division
    )}/100`}
  />
  <Info label="Division" value={pretty(baseball?.division)} />
  <Info label="Conference" value={baseball?.conference || "—"} />
  <Info label="Nickname" value={baseball?.nickname || "—"} />
  <Info label="School Type" value={pretty(c.control)} />
</div>

{isExpanded ? (
  <>
    {item.priorityReason ? (
      <div style={priorityReasonStyle}>{item.priorityReason}</div>
    ) : null}

                    {getRankingReasons(item).length > 0 ? (
                      <div style={rankingReasonBoxStyle}>
                        <div style={rankingReasonTitleStyle}>Why this school is ranked high</div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {getRankingReasons(item).map((reason) => (
                            <span key={reason} style={rankingReasonPillStyle}>
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {Array.isArray(fit?.development) && fit.development.length > 0 ? (
                      <div style={highestImpactStyle}>
                        <div style={highestImpactTitleStyle}>Highest Impact Improvement</div>
                        {fit.development[0]}
                      </div>
                    ) : null}

                    <div style={reasonBoxStyle}>
                      <div style={reasonTitleStyle}>Why ScoutLine likes this fit</div>

                      {Array.isArray(fit.reasons) && fit.reasons.length > 0 ? (
                        fit.reasons.slice(0, 4).map((reason: string, index: number) => (
                          <div key={index} style={reasonLineStyle}>
                            ✓ {reason}
                          </div>
                        ))
                      ) : (
                        <div style={reasonLineStyle}>
                          ✓ This school matches available profile, program, and benchmark data.
                        </div>
                      )}

                      {item.priorityReason ? (
                        <div style={{ ...reasonLineStyle, marginTop: 6 }}>
                          ✓ {item.priorityReason}
                        </div>
                      ) : null}
                    </div>

                    {Array.isArray(fit.gaps) && fit.gaps.length > 0 ? (
                      <div style={gapBoxStyle}>
                        <div style={gapTitleStyle}>Development areas</div>
                        {fit.gaps.slice(0, 3).map((gap: string, index: number) => (
                          <div key={index} style={gapLineStyle}>
                            • {gap}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {Array.isArray(fit.development) && fit.development.length > 0 ? (
                      <div style={developmentBoxStyle}>
                        <div style={developmentTitleStyle}>What to do next</div>
                        {fit.development.slice(0, 3).map((tip: string, index: number) => (
                          <div key={index} style={developmentLineStyle}>
                            • {tip}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {isAllAmerican &&
                    Array.isArray(fit.metricComparisons) &&
                    fit.metricComparisons.length > 0 ? (
                      <div style={comparisonBoxStyle}>
                        <div style={comparisonTitleStyle}>Key Performance vs Benchmark</div>

                        <div style={{ display: "grid", gap: 8 }}>
                          {fit.metricComparisons.slice(0, 4).map((metric: any) => (
                            <div key={metric.key} style={comparisonRowStyle}>
                              <div style={{ fontWeight: 900 }}>{metric.label}</div>

                              <div style={comparisonValueStyle}>
                                You: {formatMetricValue(metric.playerValue, metric.unit)}
                              </div>

                              <div style={comparisonValueStyle}>
                                Benchmark: {formatMetricValue(metric.benchmarkValue, metric.unit)}
                              </div>

                              <div
                                style={{
                                  ...comparisonStatusStyle,
                                  background:
                                    metric.status === "ABOVE"
                                      ? "#f0fdf4"
                                      : metric.status === "IN_RANGE"
                                      ? "#fffbeb"
                                      : "#fef2f2",
                                  borderColor:
                                    metric.status === "ABOVE"
                                      ? "#bbf7d0"
                                      : metric.status === "IN_RANGE"
                                      ? "#fde68a"
                                      : "#fecaca",
                                  color:
                                    metric.status === "ABOVE"
                                      ? "#15803d"
                                      : metric.status === "IN_RANGE"
                                      ? "#b45309"
                                      : "#b91c1c",
                                }}
                              >
                                {metric.status === "ABOVE"
                                  ? "Above"
                                  : metric.status === "IN_RANGE"
                                  ? "In Range"
                                  : "Below"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

{fit?.benchmarkSource?.metrics?.label ? (
  <div style={benchmarkSourceStyle}>
    Data Source: {fit.benchmarkSource.metrics.label}{" "}
    <span style={confidenceTextStyle}>
      ({fit.benchmarkSource.metrics.confidence || "LOW"} confidence)
    </span>
  </div>
) : null}

{item.recruitingStrategy ? (
  <div
    title={item.recruitingStrategy.explanation}
    style={{
      marginTop: 10,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 10px",
      borderRadius: 999,
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      color: "#1d4ed8",
      fontSize: 12,
      fontWeight: 700,
    }}
  >
    Recruiting Strategy:{" "}
    {item.recruitingStrategy.category}
  </div>
) : null}

{item.opportunityNarrative ? (
  <details
    style={{
      marginTop: 12,
    }}
  >
    <summary
      style={{
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        color: "#92400e",
        userSelect: "none",
      }}
    >
      Why ScoutLine Likes This Program
    </summary>

    <div style={narrativeBoxStyle}>
      <div style={narrativeHeadlineStyle}>
        {item.opportunityNarrative.headline}
      </div>

      <div style={narrativeTextStyle}>
        {item.opportunityNarrative.summary}
      </div>

      <div style={narrativeStrategyStyle}>
        <strong>Suggested Strategy:</strong>{" "}
        {item.opportunityNarrative.strategy}
      </div>
    </div>
  </details>
) : null}

  </>
) : (
  <div style={collapsedHintStyle}>
    Click View Details to see recruiting reasons, development areas, and benchmark comparisons.
  </div>
)}
            </article>
          );
        })}
      </div>
    </section>
  ))}
</div>

            {!isRedshirt &&
            visibleTruthFitResults.length < rankedTruthFitResults.length ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: 18,
                }}
              >
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 25)}
                  style={{
                    borderRadius: 999,
                    padding: "12px 18px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Load More Programs
                  {" "}
                  ({rankedTruthFitResults.length - visibleTruthFitResults.length} remaining)
                </button>
              </div>
            ) : null}
          </section>
        ) : !loadingTruthFit && !hasLoadedTruthFit ? (
          <div style={infoBannerStyle}>
            Suggested Programs will generate automatically using your current player profile.
          </div>
        ) : null}
      </section>
    </main>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label style={filterLabelStyle}>
      <span style={filterLabelTextStyle}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "ALL" ? "All" : pretty(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoBoxStyle}>
      <div style={infoLabelStyle}>{label}</div>
      <div style={infoValueStyle}>{value}</div>
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={smallLinkStyle}>
      {children}
    </a>
  );
}

function pretty(value?: string | null) {
  if (!value) return "—";

  let raw = String(value).replace(/_/g, " ").toUpperCase();

  raw = raw
    .replace("NCAA D1", "NCAA D1")
    .replace("NCAA D2", "NCAA D2")
    .replace("NCAA D3", "NCAA D3")
    .replace("NJCAA D1", "NJCAA D1")
    .replace("NJCAA D2", "NJCAA D2")
    .replace("NJCAA D3", "NJCAA D3");

  return raw
    .split(" ")
    .map((word) => {
      if (["NCAA", "NAIA", "NJCAA", "SEC", "ACC"].includes(word)) return word;
      if (/^D[123]$/.test(word)) return word;
      if (/^[A-Z]{2}$/.test(word)) return word;
      return word.charAt(0) + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function formatMetricValue(value: number, unit?: string | null) {
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return unit ? `${rounded} ${unit}` : String(rounded);
}

function getPriorityBadgeText(priority?: string | null) {
  if (priority === "HIGH") return "Priority Target";
  if (priority === "MEDIUM") return "Worth Pursuing";
  if (priority === "LOW") return "Development Track";
  return "Priority TBD";
}

function getOpportunityTooltip(
  score: number,
  reasons?: string[],
  confidence?: {
    score: number;
    label: "High Confidence" | "Moderate Confidence" | "Limited Data";
    explanation: string;
  },
  archetype?: string
) {
  const base =
    "Opportunity Index = how realistic of a recruiting opportunity this program may be for this player based on roster needs, grad year, roster turnover, and available program intelligence.";

  const archetypeText = archetype
    ? `\n\nOpportunity Type: ${archetype}`
    : "";
  
  const confidenceText = confidence
    ? `\n\nConfidence Level: ${confidence.label} (${confidence.score}/100)\n${confidence.explanation}`
    : "";

  const reasonText = reasons?.length
    ? `\n\nKey signals:\n- ${reasons.join("\n- ")}`
    : "";

  if (score >= 80) {
    return `${base}\n\nHigh Opportunity = This program appears to have strong recruiting opportunity signals for this player.\nScore: ${score}/100${archetypeText}${confidenceText}${reasonText}`;
  }

  if (score >= 65) {
    return `${base}\n\nGood Opportunity = This program shows several positive recruiting opportunity signals, but it may still require active outreach and continued development.\nScore: ${score}/100${archetypeText}${confidenceText}${reasonText}`;
  }

  if (score >= 45) {
    return `${base}\n\nModerate Opportunity = This program may be worth monitoring, but the current opportunity signals are mixed or incomplete.\nScore: ${score}/100${archetypeText}${confidenceText}${reasonText}`;
  }

  return `${base}\n\nLow Opportunity = This program currently shows limited recruiting opportunity signals for this player, but it may still be useful as a long-term or watch-list target.\nScore: ${score}/100${archetypeText}${confidenceText}${reasonText}`;
}

function getFitTooltip(label: string, score: number) {
  const base =
    "Match Score = how well this player fits this program/division based on ability, academics, intended majors, metrics, and profile data.";

  if (label === "Strong Fit") {
    return `${base}\n\nStrong Fit = The player's current profile is tracking very well for this program level.\nScore: ${score}/100`;
  }

  if (label === "Match") {
    return `${base}\n\nMatch = The player's profile aligns well with this program based on available data.\nScore: ${score}/100`;
  }

  if (label === "Possible Match") {
    return `${base}\n\nPossible Match = This program may be worth tracking, especially if the player is still developing or some school-side data is incomplete.\nScore: ${score}/100`;
  }

  return `${base}\n\nReach / Not Yet = This program is currently a reach based on the player's profile and available benchmarks, but it can still be tracked as a longer-term target.\nScore: ${score}/100`;
}

const shellStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  padding: 28,
  background: "#ffffff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 24,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "2rem",
  fontWeight: 900,
  color: "#0f172a",
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 10,
  marginBottom: 0,
  color: "#475569",
  lineHeight: 1.6,
  maxWidth: 700,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};

const backToDashboardStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#0ea5e9",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #0ea5e9",
};

const secondaryLinkButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#ffffff",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #cbd5e1",
};

const primaryButtonStyle: React.CSSProperties = {
  marginTop: 16,
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #0ea5e9",
  background: "#0ea5e9",
  color: "#ffffff",
  fontWeight: 900,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontWeight: 900,
  cursor: "pointer",
};

const filterPanelStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 16,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const filterHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 12,
};

const filterTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1rem",
  fontWeight: 900,
  color: "#0f172a",
};

const filterSubtitleStyle: React.CSSProperties = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: 13,
};

const filterGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
};

const filterLabelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  minWidth: 0,
};

const filterLabelTextStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#475569",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  height: 36,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 800,
  padding: "0 8px",
  fontSize: 13,
};

const upgradeBoxStyle: React.CSSProperties = {
  marginBottom: 14,
  padding: 16,
  borderRadius: 16,
  background: "#fffaf0",
  border: "1px solid #f5d58b",
  color: "#7c5b12",
};

const upgradeTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  marginBottom: 6,
};

const upgradeTextStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.5,
  marginBottom: 12,
};

const upgradeButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#caa042",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #caa042",
};

const infoBannerStyle: React.CSSProperties = {
  marginTop: 28,
  padding: 18,
  borderRadius: 16,
  background: "#e0f2fe",
  border: "1px solid #bae6fd",
  color: "#0c4a6e",
  fontWeight: 700,
  lineHeight: 1.6,
};

const selectedCollegeBannerStyle: React.CSSProperties = {
  marginBottom: 14,
  padding: 14,
  borderRadius: 14,
  background: "#fffaf0",
  border: "1px solid #f5d58b",
  color: "#7c5b12",
  fontWeight: 900,
  lineHeight: 1.5,
};

const errorStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 14,
  borderRadius: 14,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#b91c1c",
  fontWeight: 800,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 14,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.35rem",
  fontWeight: 900,
  color: "#0f172a",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.5,
};

const countPillStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  borderRadius: 999,
  padding: "7px 11px",
  fontSize: 12,
  fontWeight: 900,
  color: "#334155",
};

const resultCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
  background: "#ffffff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const resultTopRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1fr) minmax(360px, auto)",
  gap: "8px 16px",
  alignItems: "center",
};

const actionPillRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "nowrap",
  justifyContent: "flex-end",
  justifySelf: "end",
};

const rightPillRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  justifySelf: "end",
  minWidth: 360,
};

const anchorPillStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "5px 10px",
  background: "#caa042",
  color: "#0f172a",
  fontSize: 11,
  fontWeight: 950,
  letterSpacing: "0.01em",
  whiteSpace: "nowrap",
};

const collegeNameStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#0f172a",
  textDecorationColor: "#caa042",
  fontSize: "1.12rem",
};

const locationStyle: React.CSSProperties = {
  marginTop: 5,
  fontSize: 13,
  color: "#64748b",
  fontWeight: 700,
};

const topRecommendationBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "4px 9px",
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  color: "#15803d",
  fontSize: 11,
  fontWeight: 900,
};

const bluePillStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 900,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1e3a8a",
  whiteSpace: "nowrap",
};

const goldPillStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 900,
  border: "1px solid #facc15",
  background: "#fffbeb",
  color: "#92400e",
  whiteSpace: "nowrap",
};

const recommendationExplanationStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.45,
  color: "#64748b",
  maxWidth: 680,
  minWidth: 0,
};

const matchScoreWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  justifySelf: "end",
  width: "100%",
};

const matchScoreStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "6px 14px",
  fontSize: 12,
  fontWeight: 900,
  border: "1px solid #86efac",
  background: "#f0fdf4",
  color: "#166534",
  whiteSpace: "nowrap",
};

const confidenceBadgeStyle: React.CSSProperties = {
  marginTop: 6,
  borderRadius: 999,
  padding: "5px 12px",
  fontSize: 11,
  fontWeight: 900,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#334155",
  whiteSpace: "nowrap",
  textAlign: "center",
};

const narrativeBoxStyle: React.CSSProperties = {
  marginTop: 12,
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid rgba(15,23,42,0.08)",
  background: "#fafaf9",
  display: "grid",
  gap: 8,
};

const narrativeHeadlineStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#111827",
};

const narrativeTextStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  color: "#374151",
};

const narrativeStrategyStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.45,
  color: "#6b7280",
  paddingTop: 4,
  borderTop: "1px dashed rgba(15,23,42,0.08)",
};

const smallNeutralPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "4px 8px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  color: "#334155",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.2,
};

const linkRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 8,
};

const smallLinkStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#0369a1",
  fontWeight: 900,
  textDecoration: "underline",
  textDecorationColor: "#bae6fd",
};

const priorityReasonStyle: React.CSSProperties = {
  marginTop: 10,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#78350f",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.45,
};

const rankingReasonBoxStyle: React.CSSProperties = {
  marginTop: 10,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
};

const rankingReasonTitleStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 950,
  color: "#334155",
  marginBottom: 6,
};

const rankingReasonPillStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "5px 9px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  color: "#334155",
  fontSize: 12,
  fontWeight: 800,
};

const highestImpactStyle: React.CSSProperties = {
  marginTop: 10,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1e3a8a",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.45,
};

const highestImpactTitleStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 950,
  color: "#1d4ed8",
  marginBottom: 4,
};

const metaGridStyle: React.CSSProperties = {
  marginTop: 12,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
};

const infoBoxStyle: React.CSSProperties = {
  border: "1px solid #eef2f7",
  background: "#f8fafc",
  borderRadius: 12,
  padding: "10px 12px",
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  fontWeight: 800,
};

const infoValueStyle: React.CSSProperties = {
  marginTop: 3,
  fontWeight: 900,
  color: "#0f172a",
};

const reasonBoxStyle: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid #dcfce7",
  background: "#f0fdf4",
  borderRadius: 12,
  padding: 12,
};

const reasonTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#166534",
  marginBottom: 6,
};

const reasonLineStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#14532d",
  lineHeight: 1.45,
};

const gapBoxStyle: React.CSSProperties = {
  marginTop: 10,
  border: "1px solid #fed7aa",
  background: "#fff7ed",
  borderRadius: 12,
  padding: 12,
};

const gapTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#9a3412",
  marginBottom: 6,
};

const gapLineStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7c2d12",
  lineHeight: 1.45,
};

const developmentBoxStyle: React.CSSProperties = {
  marginTop: 10,
  border: "1px solid #e0e7ff",
  background: "#eef2ff",
  borderRadius: 12,
  padding: 12,
};

const developmentTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#3730a3",
  marginBottom: 6,
};

const developmentLineStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#312e81",
  lineHeight: 1.45,
};

const comparisonBoxStyle: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  borderRadius: 12,
  padding: 12,
};

const comparisonTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#334155",
  marginBottom: 8,
};

const comparisonRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr 1fr auto",
  gap: 8,
  alignItems: "center",
  fontSize: 12,
};

const comparisonValueStyle: React.CSSProperties = {
  color: "#475569",
  fontWeight: 800,
};

const comparisonStatusStyle: React.CSSProperties = {
  border: "1px solid",
  borderRadius: 999,
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 900,
  textAlign: "center",
};

const benchmarkSourceStyle: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  borderRadius: 999,
  padding: "7px 11px",
  width: "fit-content",
  color: "#475569",
  fontSize: 12,
  fontWeight: 900,
};

const confidenceTextStyle: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 800,
};

const collapsedHintStyle: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 12px",
  borderRadius: 12,
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.45,
};

const resultGroupStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 14,
  background: "#f8fafc",
};

const resultGroupHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const resultGroupTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 950,
  color: "#0f172a",
};

const resultGroupDescriptionStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  fontWeight: 750,
  color: "#64748b",
  lineHeight: 1.45,
  maxWidth: 680,
};

const resultGroupCountStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "6px 10px",
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  color: "#334155",
  fontSize: 12,
  fontWeight: 900,
};

const laneBoxStyle: React.CSSProperties = {
  marginBottom: 18,
  padding: 18,
  borderRadius: 16,
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
};

const laneTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  marginBottom: 10,
  color: "#14532d",
};

const laneGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
  gridTemplateColumns: "1fr 1fr 1fr 1fr",
  alignItems: "start",
  width: "100%",
};

const laneLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#166534",
};

const projectionTierStyle: React.CSSProperties = {
  marginTop: 6,
  display: "inline-flex",
  width: "100%",
  justifyContent: "center",
  borderRadius: 999,
  padding: "8px 12px",
  background: "#dcfce7",
  border: "1px solid #86efac",
  color: "#14532d",
  fontWeight: 900,
  fontSize: 14,
};

const laneSelectStyle: React.CSSProperties = {
  marginTop: 4,
  width: "100%",
  minHeight: 42,
  height: 42,
  border: "1px solid #86efac",
  borderRadius: 10,
  padding: "8px 10px",
  background: "#ffffff",
  color: "#052e16",
  fontWeight: 900,
  fontSize: 14,
  lineHeight: "20px",
  outline: "none",
};

const laneValueStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 14,
  fontWeight: 900,
  color: "#052e16",
};