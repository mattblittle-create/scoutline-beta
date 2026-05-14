// app/dashboard/player/recruiting-tool/page.tsx

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { compareRecommendations } from "@/lib/recommendations/ranking";
import {
  buildPlayerArchetype,
  buildPlayerBenchmarkBars,
  buildPlayerGrades,
  buildPlayerScoutingReport,
  buildRecommendations,
} from "@/lib/recruiting/recommendationEngine";

function getRecruitingStrategy(summary: any, laneFit?: any) {
  const dominantFit = String(summary?.dominantFit || "");
  const projectionTier = String(summary?.projectionTier || "");
  const topGap = summary?.topGaps?.[0] || "";
  const recommendedLane = String(summary?.recommendedLaneDivision || "");

  const strongestMetric =
    laneFit?.metricComparisons?.find((m: any) => m.status === "ABOVE")
      ?.label || "";

  const hasHighAcademicFit =
    laneFit?.reasons?.some((r: string) =>
      r.toLowerCase().includes("gpa")
    ) || false;

  const hasRosterNeed =
    laneFit?.reasons?.some((r: string) =>
      r.toLowerCase().includes("roster need")
    ) || false;

  if (projectionTier === "D1 Track") {
    return "You currently project as a potential NCAA D1-level recruit. Prioritize high-exposure events, verified metrics, and direct communication with programs in your recruiting lane.";
  }

  if (
    recommendedLane === "NCAA_D2" ||
    recommendedLane === "NAIA" ||
    recommendedLane === "NJCAA_D1"
  ) {
    return "Your strongest recruiting opportunities currently appear within NCAA D2, NAIA, and upper-level JUCO programs. Focus on programs where your current metrics and roster fit create immediate opportunity.";
  }

  if (
    recommendedLane === "NCAA_D3" ||
    recommendedLane === "NJCAA_D2" ||
    recommendedLane === "NJCAA_D3"
  ) {
    return "Your current recruiting lane favors development-focused programs. Continued physical development and verified metrics could significantly expand future recruiting opportunities.";
  }

  if (hasHighAcademicFit) {
    return "Your academic profile strengthens your recruiting flexibility. Include academically selective schools and private programs in your recruiting strategy.";
  }

  if (hasRosterNeed) {
    return "Several programs currently show roster alignment with your graduation class and position group. Prioritize direct outreach to programs showing immediate positional need.";
  }

  if (strongestMetric) {
    return `Your ${strongestMetric} currently stands out most against benchmark data. Lead with this metric in recruiting outreach and player promotion materials.`;
  }

  if (dominantFit === "Possible Match" && topGap) {
    return `You are close to stronger recruiting alignment. Continued development in ${topGap.toLowerCase()} could significantly improve recruiting visibility.`;
  }

  return "Continue building verified metrics, athletic development, and recruiting exposure to expand your available recruiting opportunities.";
}

function getLaneConfidence(laneFit: any) {
  const confidence = String(laneFit?.benchmarkSource?.confidence || "").toUpperCase();
  const sourceLabel = String(laneFit?.benchmarkSource?.label || "").toUpperCase();
  const score = Number(laneFit?.bestScore || 0);
  const gaps = Array.isArray(laneFit?.topGaps) ? laneFit.topGaps : [];

  if (
    confidence === "HIGH" ||
    sourceLabel.includes("SCHOOL") ||
    sourceLabel.includes("CONFERENCE")
  ) {
    return {
      label: "High Confidence",
      title: "ScoutLine has strong benchmark data supporting this recruiting lane.",
    };
  }

  if (confidence === "MEDIUM" || score >= 70) {
    return {
      label: "Medium Confidence",
      title: "ScoutLine has useful benchmark data for this lane, but more verified player or program data may improve accuracy.",
    };
  }

  if (gaps.length > 0 || confidence === "LOW") {
    return {
      label: "Early Projection",
      title: "This lane is based on limited or developing data and may change as more metrics, video, and program data are added.",
    };
  }

  return {
    label: "Limited Data",
    title: "ScoutLine has limited data for this lane. Treat this as an early recruiting starting point.",
  };
}

function getRecruitabilityTimeline(laneFit: any) {
  const score = Number(laneFit?.bestScore || 0);
  const fitTier = String(laneFit?.fitTier || "");
  const gaps = Array.isArray(laneFit?.topGaps) ? laneFit.topGaps : [];
  const confidence = getLaneConfidence(laneFit).label;

  if (
    score >= 82 &&
    (fitTier === "Strong Fit" || fitTier === "Match") &&
    confidence !== "Limited Data"
  ) {
    return {
      label: "Ready Now",
      title:
        "This player currently shows strong enough alignment to begin targeted outreach in this lane.",
    };
  }

  if (score >= 65 || fitTier === "Possible Match") {
    return {
      label: "6–12 Month Development",
      title:
        "This player is close to this lane and should focus on the highest-impact development areas before expanding outreach.",
    };
  }

  if (gaps.length > 0) {
    return {
      label: "Development Track",
      title:
        "This player should treat this lane as a longer-term target while building metrics, video, and profile strength.",
    };
  }

  return {
    label: "Early Evaluation",
    title:
      "ScoutLine needs more player and benchmark data before assigning a stronger recruitability timeline.",
  };
}

function getRecruitabilityMeter(laneFit: any) {
  const score = Number(laneFit?.bestScore || 0);
  const fitTier = String(laneFit?.fitTier || "");
  const laneConfidence = getLaneConfidence(laneFit).label;

  let baseValue = 42;
  let label = "Early Stage Prospect";
  let title = "Still building toward this recruiting lane based on available data.";

  if (score >= 88 && fitTier === "Strong Fit") {
    baseValue = 92;
    label = "Highly Recruitable";
    title = "Strong current fit with this recruiting lane based on available benchmark and profile data.";
  } else if (score >= 76 || fitTier === "Match") {
    baseValue = 78;
    label = "Recruitable";
    title = "Solid current fit with this recruiting lane. Continued development can strengthen opportunity.";
  } else if (score >= 62 || fitTier === "Possible Match") {
    baseValue = 62;
    label = "Developing Recruit";
    title = "Close to stronger recruiting alignment. Key development areas will matter.";
  }

  const confidenceAdjustment =
    laneConfidence === "High Confidence"
      ? 0
      : laneConfidence === "Medium Confidence"
      ? -4
      : laneConfidence === "Early Projection"
      ? -8
      : -12;

  const value = Math.max(25, Math.min(100, baseValue + confidenceAdjustment));

  return {
    label,
    value,
    title: `${title} Confidence weighting applied: ${laneConfidence}.`,
    confidence: laneConfidence,
  };
}

function getRecruitabilityMeterColor(label: string) {
  if (label === "Highly Recruitable") {
    return {
      bar: "#16a34a",
      text: "#166534",
      border: "#bbf7d0",
      background: "#f0fdf4",
    };
  }

  if (label === "Recruitable") {
    return {
      bar: "#2563eb",
      text: "#1e3a8a",
      border: "#bfdbfe",
      background: "#eff6ff",
    };
  }

  if (label === "Developing Recruit") {
    return {
      bar: "#d97706",
      text: "#92400e",
      border: "#fde68a",
      background: "#fffbeb",
    };
  }

  return {
    bar: "#dc2626",
    text: "#991b1b",
    border: "#fecaca",
    background: "#fef2f2",
  };
}

function getMeterMovementTips(laneFit: any) {
  const tips: string[] = [];
  const gaps = Array.isArray(laneFit?.topGaps) ? laneFit.topGaps : [];
  const development = Array.isArray(laneFit?.development) ? laneFit.development : [];
  const comparisons = Array.isArray(laneFit?.metricComparisons)
    ? laneFit.metricComparisons
    : [];

  const fitTier = String(laneFit?.fitTier || "");
  const score = Number(laneFit?.bestScore || 0);
  const hasMetricComparisons = comparisons.length > 0;

  if (!hasMetricComparisons) {
    tips.push("Add verified metrics to unlock stronger benchmark comparisons for this lane.");
  }

  if (gaps.length > 0) {
    tips.push(`Improve ${String(gaps[0]).toLowerCase()} to strengthen this lane.`);
  }

  const bestDevelopmentTip = development.find((item: string) => {
    const text = String(item || "").toLowerCase();
    return (
      text &&
      !text.includes("next best action") &&
      !text.includes("add verified metrics")
    );
  });

  if (bestDevelopmentTip) {
    tips.push(bestDevelopmentTip);
  }

  if ((fitTier === "Possible Match" || score < 70) && gaps.length > 0) {
    tips.push("Closing one key development gap could move this lane closer to Recruitable.");
  }

  if (score >= 70 && score < 82) {
    tips.push("Raising one priority metric could move this from Recruitable to Highly Recruitable.");
  }

  if (!tips.length) {
    tips.push("Keep profile data current and continue building verified performance history.");
  }

  return Array.from(new Set(tips)).slice(0, 3);
}

function formatMetricValue(value: any, unit?: string | null) {
  const n = Number(value);

  if (!Number.isFinite(n)) return "—";

  const formatted = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.00$/, "");

  return unit ? `${formatted} ${unit}` : formatted;
}

function getMetricDeltaText(metric: any) {
  const delta = Number(metric?.delta || 0);
  const unit = metric?.unit || "";
  const absDelta = Math.abs(delta);
  const formattedDelta = Number.isInteger(absDelta)
    ? String(absDelta)
    : absDelta.toFixed(2).replace(/\.00$/, "");

  if (!Number.isFinite(delta) || delta === 0) {
    return "At benchmark";
  }

  if (metric?.lowerIsBetter) {
    return delta > 0
      ? `${formattedDelta}${unit ? ` ${unit}` : ""} faster than benchmark`
      : `${formattedDelta}${unit ? ` ${unit}` : ""} slower than benchmark`;
  }

  return delta > 0
    ? `${formattedDelta}${unit ? ` ${unit}` : ""} above benchmark`
    : `${formattedDelta}${unit ? ` ${unit}` : ""} below benchmark`;
}

function getLaneHighlights(laneFit: any) {
  const comparisons = Array.isArray(laneFit?.metricComparisons)
    ? laneFit.metricComparisons
    : [];

  const strongestMetrics = Array.isArray(laneFit?.strongestMetrics)
    ? laneFit.strongestMetrics
    : comparisons
        .filter((m: any) => m.status === "ABOVE")
        .sort((a: any, b: any) => Number(b.percentDelta || 0) - Number(a.percentDelta || 0))
        .slice(0, 3);

  const biggestGaps = Array.isArray(laneFit?.biggestGaps)
    ? laneFit.biggestGaps
    : comparisons
        .filter((m: any) => m.status === "BELOW")
        .sort((a: any, b: any) => Number(b.percentDelta || 0) - Number(a.percentDelta || 0))
        .slice(0, 3);

  return {
    strongestMetrics,
    biggestGaps,
  };
}

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
  const metrics = Array.isArray(fit.metricComparisons)
    ? fit.metricComparisons
    : [];

  const reasons = Array.isArray(fit.reasons) ? fit.reasons : [];
  const gaps = Array.isArray(fit.gaps) ? fit.gaps : [];

  const confidence = String(
    fit?.benchmarkSource?.metrics?.confidence || ""
  ).toUpperCase();

  const sourceLabel = String(
    fit?.benchmarkSource?.metrics?.label || ""
  ).toUpperCase();

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

  if (item?.geographyLabel) {
    reasons.push(item.geographyLabel);
  }

  if (item?.distance?.label) {
    reasons.push(item.distance.label);
  }

  if (fit?.score >= 76) {
    reasons.push("Strong match score");
  } else if (fit?.score >= 62) {
    reasons.push("Solid fit score");
  }

  if (fit?.reasons?.some((r: string) => r.toLowerCase().includes("roster need"))) {
    reasons.push("Roster opportunity");
  }

  if (fit?.reasons?.some((r: string) => r.toLowerCase().includes("gpa"))) {
    reasons.push("Academic alignment");
  }

  if (
    fit?.metricComparisons?.some(
      (m: any) => m.status === "ABOVE" || m.status === "IN_RANGE"
    )
  ) {
    reasons.push("Metric alignment");
  }

  if (baseball?.jucoFriendly) {
    reasons.push("JUCO-friendly program");
  }

  if (baseball?.transferHeavy) {
    reasons.push("Transfer-friendly roster");
  }

  return Array.from(new Set(reasons)).slice(0, 5);
}

const DIVISION_OPTIONS = ["ALL", "NCAA_D1", "NCAA_D2", "NCAA_D3", "NAIA", "NJCAA_D1", "NJCAA_D2", "NJCAA_D3"];
const REGION_OPTIONS = ["ALL", "NORTHEAST", "MID_ATLANTIC", "SOUTHEAST", "MIDWEST", "SOUTHWEST", "WEST", "PACIFIC"];
const CONTROL_OPTIONS = ["ALL", "PUBLIC", "PRIVATE"];
const STATE_OPTIONS = [
  "ALL",
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
];

export default function PlayerRecruitingToolPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading Recruiting Tool...</div>}>
      <PlayerRecruitingToolContent />
    </Suspense>
  );
}

function PlayerRecruitingToolContent() {
  const searchParams = useSearchParams();
  const selectedCollegeId = searchParams.get("collegeId") || "";
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
  
  const isRedshirt = planTier === "REDSHIRT";
  const isAllAmerican = planTier === "ALL_AMERICAN";

  const rankedTruthFitResults = React.useMemo(() => {
    return [...truthFitResults].sort((a, b) =>
      compareRecommendations(
        {
          name: a?.college?.name,
          recommendedDivisionRank: Number(a?.recommendationRank ?? 0),
          truthFitScore: Number(a?.truthFit?.score ?? 0),
          distanceMiles: a?.college?.distance?.miles ?? a?.distance?.miles ?? null,
        },
        {
          name: b?.college?.name,
          recommendedDivisionRank: Number(b?.recommendationRank ?? 0),
          truthFitScore: Number(b?.truthFit?.score ?? 0),
          distanceMiles: b?.college?.distance?.miles ?? b?.distance?.miles ?? null,
        }
      )
    );
  }, [truthFitResults]);

  const visibleTruthFitResults = isRedshirt
    ? rankedTruthFitResults.slice(0, 3)
    : rankedTruthFitResults;

  const selectedLaneFit =
    truthFitSummary?.divisionFits?.find(
      (item: any) => item.division === selectedLaneDivision
    ) || truthFitSummary?.divisionFits?.[0] || null;

const selectedProjectionTier = selectedLaneFit
  ? projectionTierFromLane(selectedLaneFit.division, selectedLaneFit.fitTier)
  : truthFitSummary?.projectionTier || "Developmental Prospect";

const meterRecommendations = buildRecommendations({
  player: truthFitSummary?.playerProfile,
  summary: truthFitSummary,
  laneFit: selectedLaneFit,
  truthFitResults,
});

const playerGrades = buildPlayerGrades({
  player: truthFitSummary?.playerProfile,
  summary: truthFitSummary,
  laneFit: selectedLaneFit,
  truthFitResults,
});

const playerRadarData = playerGrades.map((grade) => ({
  attribute: grade.label,
  score: grade.score,
}));

const playerArchetype = buildPlayerArchetype({
  player: truthFitSummary?.playerProfile,
  summary: truthFitSummary,
  laneFit: selectedLaneFit,
  truthFitResults,
});

const playerBenchmarkBars = buildPlayerBenchmarkBars({
  player: truthFitSummary?.playerProfile,
  summary: truthFitSummary,
  laneFit: selectedLaneFit,
  truthFitResults,
});

const playerScoutingReport = buildPlayerScoutingReport({
  player: truthFitSummary?.playerProfile,
  summary: truthFitSummary,
  laneFit: selectedLaneFit,
  truthFitResults,
});

React.useEffect(() => {
    async function loadPlanTier() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json().catch(() => null);

        const nextPlan =
          data?.user?.planTier ||
          data?.planTier ||
          "REDSHIRT";

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

      const qs = params.toString();
      const url = qs ? `/api/player/truth-fit?${qs}` : "/api/player/truth-fit";

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load Truth Fit.");
      }

      const rawResults = data.results || [];

      const sortedResults = selectedCollegeId
        ? [...rawResults].sort((a: any, b: any) => {
            const aSelected = a?.college?.id === selectedCollegeId ? 1 : 0;
            const bSelected = b?.college?.id === selectedCollegeId ? 1 : 0;
            return bSelected - aSelected;
          })
        : rawResults;

      setTruthFitResults(sortedResults);
      setTruthFitSummary(data.summary || null);
      setHasLoadedTruthFit(true);
    } catch (err) {
      console.error("TRUTH_FIT_LOAD_ERROR", err);
      setTruthFitError("Could not load Truth Fit results.");
      setHasLoadedTruthFit(true);
    } finally {
      setLoadingTruthFit(false);
    }
  }, [divisionFilter, regionFilter, stateFilter, controlFilter, selectedCollegeId]);

  React.useEffect(() => {
    loadTruthFit();
  }, [loadTruthFit]);

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

  async function toggleSavedCollege(collegeId: string, fitLabel: string, fitPriority?: string) {
    const isSaved = savedCollegeIds.includes(collegeId);

    try {
      setSavingCollegeId(collegeId);

      const res = await fetch("/api/player/target-programs", {
        method: isSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
body: JSON.stringify({
  collegeId,
  priority: fitPriority || getPriorityFromFit(fitLabel),
}),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Save failed.");
      }

      setSavedCollegeIds((prev) =>
        isSaved ? prev.filter((id) => id !== collegeId) : [...prev, collegeId]
      );
    } catch (err) {
      console.error("TRUTH_FIT_SAVE_ERROR", err);
    } finally {
      setSavingCollegeId("");
    }
  }
     
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "8px 0 40px" }}>
      <section style={shellStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Recruiting Tool</h1>

            <p style={subtitleStyle}>
              ScoutLine’s Recruiting Tool helps players better understand college fit,
              recruiting opportunities, skill gaps, division-level benchmarks, and
              where their profile best matches current college recruiting needs.
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
              {loadingTruthFit ? "Generating Truth Fit..." : "Refresh Truth Fit"}
            </button>
          </div>

          <Link href="/dashboard/player" style={backToDashboardStyle}>
            Back to Dashboard
          </Link>
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
          {selectedLaneFit?.fitTier || truthFitSummary.dominantFit}
          {selectedLaneFit?.isRecommendedLane ? (
            <span style={recommendedLaneBadgeStyle}>Best Lane</span>
          ) : null}
        </div>
      </div>

<div>
  <div style={laneLabelStyle}>Division Score</div>

  <div
    style={{
      ...laneValueStyle,
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "nowrap",
    }}
  >
    <span>{selectedLaneFit?.bestScore ? `${selectedLaneFit.bestScore}/100` : "—"}</span>

    {selectedLaneFit ? (
      <span
        title={getLaneConfidence(selectedLaneFit).title}
        style={scoreConfidenceBadgeStyle}
      >
        {getLaneConfidence(selectedLaneFit).label}
      </span>
    ) : null}
  </div>
</div>

{selectedLaneFit ? (() => {
  const meter = getRecruitabilityMeter(selectedLaneFit);
  const meterColor = getRecruitabilityMeterColor(meter.label);

  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <div style={laneLabelStyle}>Recruitability Meter</div>

      <div
        title={meter.title}
        style={{
          marginTop: 8,
          padding: 12,
          borderRadius: 14,
          background: meterColor.background,
          border: `1px solid ${meterColor.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 8,
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 950, color: meterColor.text }}>
            {meter.label}
          </div>

          <div style={{ fontSize: 12, fontWeight: 900, color: "#334155" }}>
            {meter.value}/100
          </div>
        </div>

        <div
          style={{
            height: 10,
            borderRadius: 999,
            background: "#e2e8f0",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${meter.value}%`,
              borderRadius: 999,
              background: meterColor.bar,
            }}
          />
        </div>
      </div>
    </div>
  );
})() : null}

<div style={{ gridColumn: "1 / -1" }}>

{selectedLaneFit && getMeterMovementTips(selectedLaneFit).length > 0 ? (
  <div
    style={{
      gridColumn: "1 / -1",
      marginTop: -2,
      padding: "10px 12px",
      borderRadius: 14,
      background: "#ffffff",
      border: "1px solid #bfdbfe",
    }}
  >
    <div style={laneLabelStyle}>What Moves the Meter?</div>

    <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
      {getMeterMovementTips(selectedLaneFit).map((tip, index) => (
        <div
          key={index}
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "#334155",
            lineHeight: 1.45,
          }}
        >
          ↗ {tip}
        </div>
      ))}
    </div>
  </div>
) : null}
  <div style={laneLabelStyle}>Recruiting Outlook</div>
  <div style={laneValueStyle}>
<>
  {selectedLaneFit?.outlook || truthFitSummary.outlook}

  {selectedLaneFit ? (
    <span
      title={getRecruitabilityTimeline(selectedLaneFit).title}
      style={{
        marginLeft: 8,
        color: "#1d4ed8",
        fontWeight: 900,
      }}
    >
      ({getRecruitabilityTimeline(selectedLaneFit).label})
    </span>
  ) : null}
</>
        </div>
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <div style={laneLabelStyle}>Recruiting Strategy</div>
        <div style={laneValueStyle}>
          {getRecruitingStrategy(truthFitSummary, selectedLaneFit)}
        </div>
      </div>

{selectedLaneFit ? (
  <div
    style={{
      gridColumn: "1 / -1",
      marginTop: 14,
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
    }}
  >
    <div
      style={{
        borderRadius: 14,
        border: "1px solid #bbf7d0",
        background: "#f0fdf4",
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 950,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "#166534",
          marginBottom: 8,
        }}
      >
        Strongest Metric(s)
      </div>

      {getLaneHighlights(selectedLaneFit).strongestMetrics.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          {getLaneHighlights(selectedLaneFit).strongestMetrics.map((metric: any) => (
            <div key={metric.key}>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#14532d" }}>
                {metric.label}
              </div>
              <div style={{ marginTop: 2, fontSize: 12, color: "#166534", lineHeight: 1.4 }}>
                {formatMetricValue(metric.playerValue, metric.unit)} vs{" "}
                {formatMetricValue(metric.benchmarkValue, metric.unit)} benchmark ·{" "}
                {getMetricDeltaText(metric)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "#166534", lineHeight: 1.4 }}>
          No standout above-benchmark metrics identified for this lane yet.
        </div>
      )}
    </div>

    <div
      style={{
        borderRadius: 14,
        border: "1px solid #fde68a",
        background: "#fffbeb",
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 950,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "#92400e",
          marginBottom: 8,
        }}
      >
        Biggest Development Gap(s)
      </div>

      {getLaneHighlights(selectedLaneFit).biggestGaps.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          {getLaneHighlights(selectedLaneFit).biggestGaps.map((metric: any) => (
            <div key={metric.key}>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#78350f" }}>
                {metric.label}
              </div>
              <div style={{ marginTop: 2, fontSize: 12, color: "#92400e", lineHeight: 1.4 }}>
                {formatMetricValue(metric.playerValue, metric.unit)} vs{" "}
                {formatMetricValue(metric.benchmarkValue, metric.unit)} benchmark ·{" "}
                {getMetricDeltaText(metric)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.4 }}>
          No major below-benchmark gaps identified for this lane.
        </div>
      )}
    </div>
  </div>
) : null}

{Array.isArray(selectedLaneFit?.topGaps) && selectedLaneFit.topGaps.length > 0 ? (
  <div style={{ gridColumn: "1 / -1" }}>
    <div style={laneLabelStyle}>Top Development Priorities</div>

    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {selectedLaneFit.topGaps.slice(0, 3).map((gap: string, index: number) => (
        <span
          key={index}
          style={{
            borderRadius: 999,
            padding: "5px 9px",
            background: "#fff",
            border: "1px solid #bfdbfe",
            color: "#334155",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {pretty(selectedLaneFit.division)}: {gap}
        </span>
      ))}
    </div>
  </div>
) : null}
    </div>
  </section>
) : null}

<section
  style={{
    marginTop: 18,
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#fff",
    padding: 18,
  }}
>
  <div style={laneLabelStyle}>ScoutLine Player Grades</div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
      gap: 10,
      marginTop: 12,
    }}
  >
    {playerGrades.map((grade) => (
      <div
        key={grade.key}
        title={grade.description}
        style={{
          borderRadius: 14,
          border: "1px solid #e5e7eb",
          background: "#f8fafc",
          padding: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            marginBottom: 6,
          }}
        >
          {grade.label}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 950,
              color: "#0f172a",
              lineHeight: 1,
            }}
          >
            {grade.grade}
          </div>

          <div
            style={{
              fontSize: 12,
              fontWeight: 900,
              color: "#475569",
            }}
          >
            {grade.score}/99
          </div>
        </div>
      </div>
    ))}
  </div>
</section>
  <section
  style={{
    marginTop: 18,
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#fff",
    padding: 18,
  }}
>
  <div style={laneLabelStyle}>ScoutLine Recruitability Snapshot</div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) auto",
      gap: 16,
      alignItems: "center",
      marginTop: 12,
    }}
  >
    <div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 950,
          color: "#0f172a",
          marginBottom: 6,
        }}
      >
        {playerArchetype.title}
      </div>

      <div
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: "#475569",
        }}
      >
        {playerArchetype.summary}
      </div>
    </div>

    <div
      style={{
        borderRadius: 16,
        border: "1px solid #dbeafe",
        background: "#eff6ff",
        padding: "14px 16px",
        textAlign: "center",
        minWidth: 120,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          color: "#1d4ed8",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 6,
        }}
      >
        Recruitability
      </div>

      <div
        style={{
          fontSize: 32,
          fontWeight: 950,
          color: "#0f172a",
          lineHeight: 1,
        }}
      >
        {playerArchetype.recruitabilityGrade}
      </div>

      <div
        style={{
          marginTop: 5,
          fontSize: 12,
          fontWeight: 900,
          color: "#475569",
        }}
      >
        {playerArchetype.recruitabilityScore}/99
      </div>
    </div>
  </div>
</section>

<section
  style={{
    marginTop: 18,
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#fff",
    padding: 18,
  }}
>
  <div style={laneLabelStyle}>ScoutLine Scouting Report</div>

  <div
    style={{
      marginTop: 10,
      fontSize: 18,
      fontWeight: 950,
      color: "#0f172a",
    }}
  >
    {playerScoutingReport.headline}
  </div>

  <div
    style={{
      marginTop: 8,
      fontSize: 13,
      lineHeight: 1.65,
      color: "#475569",
    }}
  >
    {playerScoutingReport.summary}
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 12,
      marginTop: 14,
    }}
  >
    <div
      style={{
        borderRadius: 14,
        border: "1px solid #bbf7d0",
        background: "#f0fdf4",
        padding: 12,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 950, color: "#166534", marginBottom: 6 }}>
        Strengths
      </div>

      {playerScoutingReport.strengths.map((item, index) => (
        <div key={index} style={{ fontSize: 13, fontWeight: 800, color: "#14532d", lineHeight: 1.5 }}>
          ✓ {item}
        </div>
      ))}
    </div>

    <div
      style={{
        borderRadius: 14,
        border: "1px solid #fde68a",
        background: "#fffbeb",
        padding: 12,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 950, color: "#92400e", marginBottom: 6 }}>
        Development Focus
      </div>

      {playerScoutingReport.developmentAreas.map((item, index) => (
        <div key={index} style={{ fontSize: 13, fontWeight: 800, color: "#78350f", lineHeight: 1.5 }}>
          ↗ {item}
        </div>
      ))}
    </div>
  </div>

  <div
    style={{
      marginTop: 12,
      borderRadius: 14,
      border: "1px solid #dbeafe",
      background: "#eff6ff",
      padding: 12,
      fontSize: 13,
      fontWeight: 800,
      color: "#1e3a8a",
      lineHeight: 1.55,
    }}
  >
    {playerScoutingReport.recruitingProjection}
  </div>
</section>

<section
  style={{
    marginTop: 18,
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#fff",
    padding: 18,
  }}
>
  <div style={laneLabelStyle}>Benchmark Percentile Ladders</div>

  <div
    style={{
      display: "grid",
      gap: 12,
      marginTop: 12,
    }}
  >
    {playerBenchmarkBars.length > 0 ? (
      playerBenchmarkBars.map((bar) => (
        <div key={bar.key}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: "#0f172a",
              }}
            >
              {bar.label}
            </div>

            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: "#475569",
              }}
            >
              {bar.score}th percentile
            </div>
          </div>

          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: "#e2e8f0",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${bar.score}%`,
                borderRadius: 999,
                background:
                  bar.score >= 85
                    ? "#16a34a"
                    : bar.score >= 70
                    ? "#2563eb"
                    : bar.score >= 50
                    ? "#d97706"
                    : "#dc2626",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 7,
            }}
          >
            <span
              style={{
                borderRadius: 999,
                padding: "4px 8px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                fontSize: 11,
                fontWeight: 900,
              }}
            >
              {bar.benchmarkTier}
            </span>

            <span
              style={{
                borderRadius: 999,
                padding: "4px 8px",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                color: "#334155",
                fontSize: 11,
                fontWeight: 900,
              }}
            >
              {bar.percentileLabel}
            </span>
          </div>
        </div>
      ))
    ) : (
      <div
        style={{
          borderRadius: 12,
          background: "#f8fafc",
          border: "1px solid #e5e7eb",
          padding: 12,
          fontSize: 13,
          color: "#475569",
          fontWeight: 800,
          lineHeight: 1.5,
        }}
      >
        Add verified metrics to unlock benchmark percentile ladders.
      </div>
    )}
  </div>
</section>

<section
  style={{
    marginTop: 18,
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#fff",
    padding: 18,
  }}
>
  <div style={laneLabelStyle}>Player Tools Radar</div>

  <div
    style={{
      marginTop: 12,
      height: 320,
      width: "100%",
    }}
  >
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={playerRadarData}>
        <PolarGrid />
        <PolarAngleAxis
          dataKey="attribute"
          tick={{
            fontSize: 11,
            fontWeight: 800,
            fill: "#475569",
          }}
        />
        <Radar
          name="ScoutLine Grade"
          dataKey="score"
          stroke="#1d4ed8"
          fill="#1d4ed8"
          fillOpacity={0.18}
        />
      </RadarChart>
    </ResponsiveContainer>
  </div>

  <div
    style={{
      marginTop: 8,
      fontSize: 12,
      lineHeight: 1.5,
      color: "#64748b",
    }}
  >
    Visualizes the same ScoutLine grades above on a 1–99 scale to show overall tool balance, strengths, and development areas.
  </div>
</section>

<section
  style={{
    marginTop: 18,
    border: "1px solid #dbeafe",
    borderRadius: 16,
    background: "#f8fbff",
    padding: 18,
  }}
>
  <div style={laneLabelStyle}>What Moves the Meter?</div>

  <div
    style={{
      display: "grid",
      gap: 12,
      marginTop: 12,
    }}
  >
    {meterRecommendations.map((item, index) => (
      <div
        key={`${item.title}-${index}`}
        style={{
          borderRadius: 12,
          background: "#fff",
          border: "1px solid #dbeafe",
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 900,
              color: "#0f172a",
            }}
          >
            {item.title}
          </div>

          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                borderRadius: 999,
                padding: "4px 8px",
                background:
                  item.priority === "High"
                    ? "#fee2e2"
                    : item.priority === "Medium"
                    ? "#fef3c7"
                    : "#dcfce7",
                color:
                  item.priority === "High"
                    ? "#991b1b"
                    : item.priority === "Medium"
                    ? "#92400e"
                    : "#166534",
                fontSize: 11,
                fontWeight: 900,
              }}
            >
              {item.priority} Priority
            </span>

            <span
              style={{
                borderRadius: 999,
                padding: "4px 8px",
                background: "#eff6ff",
                color: "#1d4ed8",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {item.category}
            </span>
          </div>
        </div>

        {(item.benchmarkTier || item.percentileLabel) ? (
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            {item.benchmarkTier ? (
              <span
                style={{
                  borderRadius: 999,
                  padding: "4px 8px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  fontSize: 11,
                  fontWeight: 900,
                }}
              >
                {item.benchmarkTier}
              </span>
            ) : null}

            {item.percentileLabel ? (
              <span
                style={{
                  borderRadius: 999,
                  padding: "4px 8px",
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  fontSize: 11,
                  fontWeight: 900,
                }}
              >
                {item.percentileLabel}
              </span>
            ) : null}
          </div>
        ) : null}

        <div
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: "#334155",
          }}
        >
          {item.description}
        </div>
      </div>
    ))}
  </div>
</section>
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

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div style={featureCardStyle}>
      <div style={featureTitleStyle}>{title}</div>
      <div style={featureDescriptionStyle}>{description}</div>
    </div>
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

  // 🔥 Normalize common division patterns first
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

function getPriorityBadgeText(priority?: string | null) {
  if (priority === "HIGH") return "Priority Target";
  if (priority === "MEDIUM") return "Worth Pursuing";
  if (priority === "LOW") return "Development Track";
  return "Priority TBD";
}

function getFitTooltip(label: string, score: number) {
  if (label === "Strong Fit") return `Strong Fit = Your profile is currently tracking very well for this program.\nScore: ${score}/100`;
  if (label === "Match") return `Match = Your profile aligns well with this program based on available data.\nScore: ${score}/100`;
  if (label === "Possible Match") return `Possible Match = This school may be worth tracking, especially if some school-side data is still incomplete.\nScore: ${score}/100`;
    return `Reach / Not Yet = This school is currently a reach based on your profile and available benchmarks, but it can still be tracked as a longer-term target.\nScore: ${score}/100`;
}

function getFitColor(label: string) {
  if (label === "Strong Fit") return "#15803d";
  if (label === "Match") return "#0369a1";
  if (label === "Possible Match") return "#b45309";
  if (label === "Reach / Not Yet") return "#b91c1c";
  return "#b91c1c";
}

function getFitBorderColor(label: string) {
  if (label === "Strong Fit") return "#bbf7d0";
  if (label === "Match") return "#bae6fd";
  if (label === "Possible Match") return "#fde68a";
  if (label === "Reach / Not Yet") return "#fecaca";
  return "#fecaca";
}

function getFitBackground(label: string) {
  if (label === "Strong Fit") return "#f0fdf4";
  if (label === "Match") return "#e0f2fe";
  if (label === "Possible Match") return "#fffbeb";
  if (label === "Reach / Not Yet") return "#fef2f2";
  return "#fef2f2";
}

const shellStyle: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 20, padding: 28, background: "#ffffff", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 24 };
const titleStyle: React.CSSProperties = { margin: 0, fontSize: "2rem", fontWeight: 900, color: "#0f172a" };
const subtitleStyle: React.CSSProperties = { marginTop: 10, marginBottom: 0, color: "#475569", lineHeight: 1.6, maxWidth: 700 };
const backToDashboardStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 999, padding: "9px 13px", background: "#0ea5e9", color: "#ffffff", textDecoration: "none", fontWeight: 900, border: "1px solid #0ea5e9" };
const primaryButtonStyle: React.CSSProperties = { marginTop: 16, padding: "10px 14px", borderRadius: 10, border: "1px solid #0ea5e9", background: "#0ea5e9", color: "#ffffff", fontWeight: 900 };
const secondaryButtonStyle: React.CSSProperties = { padding: "9px 12px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#ffffff", color: "#334155", fontWeight: 900, cursor: "pointer" };
const cardGridStyle: React.CSSProperties = { display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" };
const featureCardStyle: React.CSSProperties = { borderRadius: 16, padding: 20, background: "#f8fafc", border: "1px solid #e2e8f0" };
const featureTitleStyle: React.CSSProperties = { fontSize: 20, fontWeight: 900, color: "#0f172a", marginBottom: 10 };
const featureDescriptionStyle: React.CSSProperties = { color: "#475569", lineHeight: 1.5, fontSize: 14 };
const filterPanelStyle: React.CSSProperties = { marginTop: 20, padding: 16, borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" };
const filterHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 };
const filterTitleStyle: React.CSSProperties = { margin: 0, fontSize: "1rem", fontWeight: 900, color: "#0f172a" };
const filterSubtitleStyle: React.CSSProperties = { margin: "4px 0 0", color: "#64748b", fontSize: 13 };
const filterGridStyle: React.CSSProperties = { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" };
const filterLabelStyle: React.CSSProperties = { display: "grid", gap: 6 };
const filterLabelTextStyle: React.CSSProperties = { fontSize: 12, fontWeight: 900, color: "#475569" };
const selectStyle: React.CSSProperties = { height: 40, borderRadius: 10, border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontWeight: 800, padding: "0 10px" };
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
const infoBannerStyle: React.CSSProperties = { marginTop: 28, padding: 18, borderRadius: 16, background: "#e0f2fe", border: "1px solid #bae6fd", color: "#0c4a6e", fontWeight: 700, lineHeight: 1.6 };
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
const errorStyle: React.CSSProperties = { marginTop: 18, padding: 14, borderRadius: 14, background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", fontWeight: 800 };
const sectionHeaderStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 };
const sectionTitleStyle: React.CSSProperties = { margin: 0, fontSize: "1.35rem", fontWeight: 900, color: "#0f172a" };
const sectionSubtitleStyle: React.CSSProperties = { margin: "6px 0 0", color: "#64748b", fontSize: 14, lineHeight: 1.5 };
const countPillStyle: React.CSSProperties = { border: "1px solid #e5e7eb", background: "#f8fafc", borderRadius: 999, padding: "7px 11px", fontSize: 12, fontWeight: 900, color: "#334155" };
const resultCardStyle: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, background: "#ffffff", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" };
const resultTopRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 16,
  alignItems: "start",
};
const collegeNameStyle: React.CSSProperties = { fontWeight: 900, color: "#0f172a", textDecorationColor: "#caa042", fontSize: "1.12rem" };
const locationStyle: React.CSSProperties = { marginTop: 5, fontSize: 13, color: "#64748b", fontWeight: 700 };
const linkRowStyle: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 };
const smallLinkStyle: React.CSSProperties = { fontSize: 12, color: "#0369a1", fontWeight: 900, textDecoration: "underline", textDecorationColor: "#bae6fd" };
const fitBadgeStyle: React.CSSProperties = { border: "1px solid", borderRadius: 999, padding: "7px 11px", fontSize: 13, fontWeight: 900 };
const priorityBadgeStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 11,
  fontWeight: 900,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#334155",
  display: "inline-flex",
  alignItems: "center",
  lineHeight: 1.2,
};
const metaGridStyle: React.CSSProperties = { marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 };
const infoBoxStyle: React.CSSProperties = { border: "1px solid #eef2f7", background: "#f8fafc", borderRadius: 12, padding: "10px 12px" };
const infoLabelStyle: React.CSSProperties = { fontSize: 12, color: "#64748b", fontWeight: 800 };
const infoValueStyle: React.CSSProperties = { marginTop: 3, fontWeight: 900, color: "#0f172a" };
const reasonBoxStyle: React.CSSProperties = { marginTop: 12, border: "1px solid #dcfce7", background: "#f0fdf4", borderRadius: 12, padding: 12 };
const reasonTitleStyle: React.CSSProperties = { fontSize: 12, fontWeight: 900, color: "#166534", marginBottom: 6 };
const reasonLineStyle: React.CSSProperties = { fontSize: 13, color: "#14532d", lineHeight: 1.45 };
const gapBoxStyle: React.CSSProperties = { marginTop: 10, border: "1px solid #fed7aa", background: "#fff7ed", borderRadius: 12, padding: 12 };
const gapTitleStyle: React.CSSProperties = { fontSize: 12, fontWeight: 900, color: "#9a3412", marginBottom: 6 };
const gapLineStyle: React.CSSProperties = { fontSize: 13, color: "#7c2d12", lineHeight: 1.45 };
const benchmarkSourceStyle: React.CSSProperties = { marginTop: 12, border: "1px solid #e5e7eb", background: "#f8fafc", borderRadius: 999, padding: "7px 11px", width: "fit-content", color: "#475569", fontSize: 12, fontWeight: 900 };
const confidenceTextStyle: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 800,
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

const manageSavedLinkStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#0369a1",
  fontWeight: 900,
  textDecoration: "underline",
  textDecorationColor: "#bae6fd",
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

const recommendedLaneBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  marginLeft: 8,
  borderRadius: 999,
  padding: "4px 8px",
  background: "#dcfce7",
  border: "1px solid #86efac",
  color: "#14532d",
  fontSize: 11,
  fontWeight: 900,
};

const scoreConfidenceBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  whiteSpace: "nowrap",
  borderRadius: 999,
  padding: "3px 7px",
  background: "#ffffff",
  border: "1px solid #86efac",
  color: "#14532d",
  fontSize: 10,
  fontWeight: 900,
  lineHeight: 1,
};

const laneValueStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 14,
  fontWeight: 900,
  color: "#052e16",
};