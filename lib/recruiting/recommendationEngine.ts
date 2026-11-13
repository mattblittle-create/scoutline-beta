// lib/recruiting/recommendationEngine.ts

export type RecommendationCategory =
  | "Profile"
  | "Metrics"
  | "Athleticism"
  | "Position Fit"
  | "Development"
  | "Academics"
  | "Exposure"
  | "Recruiting"
  | "Timeline";

export type RecommendationPriority = "High" | "Medium" | "Low";

export type Recommendation = {
  category: RecommendationCategory;
  title: string;
  description: string;
  priority: RecommendationPriority;
  priorityScore: number;
  metricKey?: string;
  currentValue?: number | null;
  targetValue?: number | null;
  unit?: string;
  benchmarkLabel?: string;
  percentileLabel?: string;
  benchmarkTier?: string;
};

export type PlayerGradeKey =
  | "hit"
  | "power"
  | "speed"
  | "arm"
  | "defense"
  | "projection"
  | "athleticism"
  | "recruitability";

export type PlayerGrade = {
  key: PlayerGradeKey;
  label: string;
  grade: string;
  score: number;
  description: string;
};

export type PlayerArchetype = {
  title: string;
  recruitabilityGrade: string;
  recruitabilityScore: number;
  summary: string;
  strongestTool: string;
};

export type PlayerBenchmarkBar = {
  key: string;
  label: string;
  score: number;
  percentileLabel: string;
  benchmarkTier: string;
  hasValue: boolean;
  missingMessage?: string;
};

export type PlayerScoutingReport = {
  headline: string;
  summary: string;
  strengths: string[];
  developmentAreas: string[];
  recruitingProjection: string;
};

export type RecommendationInput = {
  player?: any;
  summary?: any;
  laneFit?: any;
  truthFitResults?: any[];
};

type MetricDefinition = {
  key: string;
  label: string;
  unit: string;
  higherIsBetter: boolean;
};

type DivisionTarget = {
  division: string;
  label: string;
  value: number;
  rank: number;
};

const METRICS: Record<string, MetricDefinition> = {
  heightIn: { key: "heightIn", label: "Height", unit: "in", higherIsBetter: true },
  weightLb: { key: "weightLb", label: "Weight", unit: "lbs", higherIsBetter: true },
  gpa: { key: "gpa", label: "GPA", unit: "", higherIsBetter: true },
  benchPress: { key: "benchPress", label: "Bench Press", unit: "lbs", higherIsBetter: true },
  squat: { key: "squat", label: "Squat", unit: "lbs", higherIsBetter: true },
  deadLift: { key: "deadLift", label: "Dead Lift", unit: "lbs", higherIsBetter: true },
  sixty: { key: "sixty", label: "60 Yard Dash", unit: "sec", higherIsBetter: false },
  homeToFirst: { key: "homeToFirst", label: "Home to First", unit: "sec", higherIsBetter: false },
  exitVelo: { key: "exitVelo", label: "Exit Velocity", unit: "mph", higherIsBetter: true },
  infieldVelo: { key: "infieldVelo", label: "Infield Velocity", unit: "mph", higherIsBetter: true },
  outfieldVelo: { key: "outfieldVelo", label: "Outfield Velocity", unit: "mph", higherIsBetter: true },
  rawThrowVelo: { key: "rawThrowVelo", label: "Raw Throwing Velocity", unit: "mph", higherIsBetter: true },
  catcherVelo: { key: "catcherVelo", label: "Catcher Throwing Velocity", unit: "mph", higherIsBetter: true },
  popTime: { key: "popTime", label: "Pop Time", unit: "sec", higherIsBetter: false },
  avgFbVelo: { key: "avgFbVelo", label: "Fastball Velocity", unit: "mph", higherIsBetter: true },
  avgChVelo: { key: "avgChVelo", label: "Changeup Velocity", unit: "mph", higherIsBetter: true },
  avgBbVelo: { key: "avgBbVelo", label: "Breaking Ball Velocity", unit: "mph", higherIsBetter: true },
};

const POSITION_PRIORITY: Record<string, string[]> = {
  C: ["popTime", "catcherVelo", "exitVelo", "sixty"],
  "1B": ["exitVelo", "infieldVelo", "sixty"],
  "2B": ["sixty", "infieldVelo", "exitVelo"],
  "3B": ["exitVelo", "infieldVelo", "sixty"],
  SS: ["sixty", "infieldVelo", "exitVelo"],
  OF: ["sixty", "outfieldVelo", "exitVelo"],
  LF: ["sixty", "outfieldVelo", "exitVelo"],
  CF: ["sixty", "outfieldVelo", "exitVelo"],
  RF: ["outfieldVelo", "sixty", "exitVelo"],
  RHP: ["fbVelo", "exitVelo", "sixty"],
  LHP: ["fbVelo", "exitVelo", "sixty"],
  P: ["fbVelo", "exitVelo", "sixty"],
};

const FALLBACK_PRIORITY = ["exitVelo", "sixty", "infieldVelo"];

const DIVISION_TARGETS: Record<string, DivisionTarget[]> = {
  exitVelo: [
    { division: "NJCAA_D3", label: "NJCAA D3", value: 82, rank: 1 },
    { division: "NJCAA_D2", label: "NJCAA D2", value: 84, rank: 2 },
    { division: "NCAA_D3", label: "NCAA D3", value: 84, rank: 3 },
    { division: "NAIA", label: "NAIA", value: 86, rank: 4 },
    { division: "NJCAA_D1", label: "NJCAA D1", value: 88, rank: 5 },
    { division: "NCAA_D2", label: "NCAA D2", value: 88, rank: 6 },
    { division: "NCAA_D1", label: "NCAA D1", value: 92, rank: 7 },
  ],
  sixty: [
    { division: "NJCAA_D3", label: "NJCAA D3", value: 7.4, rank: 1 },
    { division: "NJCAA_D2", label: "NJCAA D2", value: 7.35, rank: 2 },
    { division: "NCAA_D3", label: "NCAA D3", value: 7.3, rank: 3 },
    { division: "NAIA", label: "NAIA", value: 7.2, rank: 4 },
    { division: "NJCAA_D1", label: "NJCAA D1", value: 7.15, rank: 5 },
    { division: "NCAA_D2", label: "NCAA D2", value: 7.1, rank: 6 },
    { division: "NCAA_D1", label: "NCAA D1", value: 6.9, rank: 7 },
  ],
  infieldVelo: [
    { division: "NJCAA_D3", label: "NJCAA D3", value: 76, rank: 1 },
    { division: "NJCAA_D2", label: "NJCAA D2", value: 78, rank: 2 },
    { division: "NCAA_D3", label: "NCAA D3", value: 78, rank: 3 },
    { division: "NAIA", label: "NAIA", value: 80, rank: 4 },
    { division: "NJCAA_D1", label: "NJCAA D1", value: 82, rank: 5 },
    { division: "NCAA_D2", label: "NCAA D2", value: 82, rank: 6 },
    { division: "NCAA_D1", label: "NCAA D1", value: 86, rank: 7 },
  ],
  outfieldVelo: [
    { division: "NJCAA_D3", label: "NJCAA D3", value: 78, rank: 1 },
    { division: "NJCAA_D2", label: "NJCAA D2", value: 80, rank: 2 },
    { division: "NCAA_D3", label: "NCAA D3", value: 80, rank: 3 },
    { division: "NAIA", label: "NAIA", value: 82, rank: 4 },
    { division: "NJCAA_D1", label: "NJCAA D1", value: 84, rank: 5 },
    { division: "NCAA_D2", label: "NCAA D2", value: 84, rank: 6 },
    { division: "NCAA_D1", label: "NCAA D1", value: 88, rank: 7 },
  ],
  catcherVelo: [
    { division: "NJCAA_D3", label: "NJCAA D3", value: 70, rank: 1 },
    { division: "NJCAA_D2", label: "NJCAA D2", value: 72, rank: 2 },
    { division: "NCAA_D3", label: "NCAA D3", value: 72, rank: 3 },
    { division: "NAIA", label: "NAIA", value: 74, rank: 4 },
    { division: "NJCAA_D1", label: "NJCAA D1", value: 75, rank: 5 },
    { division: "NCAA_D2", label: "NCAA D2", value: 75, rank: 6 },
    { division: "NCAA_D1", label: "NCAA D1", value: 78, rank: 7 },
  ],
  popTime: [
    { division: "NJCAA_D3", label: "NJCAA D3", value: 2.2, rank: 1 },
    { division: "NJCAA_D2", label: "NJCAA D2", value: 2.18, rank: 2 },
    { division: "NCAA_D3", label: "NCAA D3", value: 2.15, rank: 3 },
    { division: "NAIA", label: "NAIA", value: 2.1, rank: 4 },
    { division: "NJCAA_D1", label: "NJCAA D1", value: 2.1, rank: 5 },
    { division: "NCAA_D2", label: "NCAA D2", value: 2.08, rank: 6 },
    { division: "NCAA_D1", label: "NCAA D1", value: 2.0, rank: 7 },
  ],
  fbVelo: [
    { division: "NJCAA_D3", label: "NJCAA D3", value: 76, rank: 1 },
    { division: "NJCAA_D2", label: "NJCAA D2", value: 78, rank: 2 },
    { division: "NCAA_D3", label: "NCAA D3", value: 78, rank: 3 },
    { division: "NAIA", label: "NAIA", value: 80, rank: 4 },
    { division: "NJCAA_D1", label: "NJCAA D1", value: 82, rank: 5 },
    { division: "NCAA_D2", label: "NCAA D2", value: 82, rank: 6 },
    { division: "NCAA_D1", label: "NCAA D1", value: 86, rank: 7 },
  ],
};

function normalizePosition(position?: string | null) {
  if (!position) return "";
  const value = String(position).trim().toUpperCase();

  if (value.includes("CATCH")) return "C";
  if (value.includes("SHORT")) return "SS";
  if (value.includes("CENTER")) return "CF";
  if (value.includes("RIGHT")) return "RF";
  if (value.includes("LEFT")) return "LF";
  if (value.includes("OUTFIELD")) return "OF";
  if (value.includes("PITCH")) return "P";

  return value;
}

function prettyDivision(value?: string | null) {
  return String(value || "").replace(/_/g, " ");
}

function formatValue(value: number, unit: string) {
  if (unit === "sec") return `${Number(value).toFixed(2)} ${unit}`;
  return `${Math.round(value)} ${unit}`;
}

function getPrimaryPosition(player: any) {
  const raw =
    player?.primaryPos ||
    player?.primaryPosition ||
    player?.position ||
    player?.positions?.[0] ||
    player?.playerProfile?.primaryPos ||
    player?.playerProfile?.primaryPosition ||
    player?.playerProfile?.position ||
    "";

  return normalizePosition(raw);
}

function latestMetricEntryValue(value: any): number | null {
  if (Array.isArray(value)) {
    const last = value[value.length - 1];
    const numeric = Number(last?.value ?? last);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }

  const numeric = Number(value?.value ?? value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function getMetricAliases(key: string) {
  const aliases: Record<string, string[]> = {
    sixty: ["sixty", "sixtyYdDash", "sixtyYardDash", "sixtyTime"],
    homeToFirst: ["homeToFirst", "homeToFirstTime"],
    exitVelo: ["exitVelo", "exitVelocity"],
    infieldVelo: ["infieldVelo", "infieldThrowVelo", "ifVelo"],
    outfieldVelo: ["outfieldVelo", "outfieldThrowVelo", "ofVelo"],
    catcherVelo: ["catcherVelo", "catcherThrowVelo"],
    popTime: ["popTime"],
    fbVelo: ["fbVelo", "avgFbVelo", "fastballVelo", "averageFastballVelocity"],
  };

  return aliases[key] || [key];
}

function getMetricValue(player: any, key: string): number | null {
  const aliases = getMetricAliases(key);

  for (const alias of aliases) {
    const possibleValues = [
      player?.[alias],
      player?.metrics?.[alias],
      player?.playerMetrics?.[alias],
      player?.playerProfile?.[alias],
      player?.playerProfile?.metrics?.[alias],
    ];

    for (const value of possibleValues) {
      const numeric = latestMetricEntryValue(value);
      if (numeric != null) return numeric;
    }
  }

  return null;
}

function getBestLane(summary: any, laneFit: any) {
  return (
    laneFit?.division ||
    laneFit?.bestLane ||
    laneFit?.recommendedLane ||
    summary?.recommendedLaneDivision ||
    summary?.bestLane ||
    summary?.dominantFit ||
    summary?.divisionFit ||
    ""
  );
}

function getApproxTarget(metricKey: string, bestLane: string): number | null {
  const targets = DIVISION_TARGETS[metricKey];
  if (!targets?.length) return null;

  const normalizedLane = String(bestLane || "").toUpperCase();
  const exact = targets.find((item) => item.division === normalizedLane);
  if (exact) return exact.value;

  return targets.find((item) => item.division === "NCAA_D3")?.value ?? targets[0]?.value ?? null;
}

function getGapSeverity(metric: MetricDefinition, currentValue: number, targetValue: number) {
  const rawGap = metric.higherIsBetter
    ? targetValue - currentValue
    : currentValue - targetValue;

  if (rawGap <= 0) {
    return { score: 0, priority: "Low" as RecommendationPriority, gap: rawGap };
  }

  if (metric.unit === "mph") {
    if (rawGap >= 8) return { score: 95, priority: "High" as RecommendationPriority, gap: rawGap };
    if (rawGap >= 4) return { score: 75, priority: "Medium" as RecommendationPriority, gap: rawGap };
    return { score: 45, priority: "Low" as RecommendationPriority, gap: rawGap };
  }

  if (metric.unit === "sec") {
    if (rawGap >= 0.35) return { score: 95, priority: "High" as RecommendationPriority, gap: rawGap };
    if (rawGap >= 0.15) return { score: 75, priority: "Medium" as RecommendationPriority, gap: rawGap };
    return { score: 45, priority: "Low" as RecommendationPriority, gap: rawGap };
  }

  return { score: 50, priority: "Medium" as RecommendationPriority, gap: rawGap };
}

function getCurrentDivisionLevel(metric: MetricDefinition, currentValue: number) {
  const targets = DIVISION_TARGETS[metric.key] || [];

  const qualifying = targets
    .filter((target) =>
      metric.higherIsBetter ? currentValue >= target.value : currentValue <= target.value
    )
    .sort((a, b) => b.rank - a.rank);

  return qualifying[0] || null;
}

function getNextDivisionTarget(metric: MetricDefinition, currentValue: number) {
  const targets = DIVISION_TARGETS[metric.key] || [];

  const nextTargets = targets
    .filter((target) =>
      metric.higherIsBetter ? currentValue < target.value : currentValue > target.value
    )
    .sort((a, b) => a.rank - b.rank);

  return nextTargets[0] || null;
}

function clampPercent(value: number) {
  return Math.max(1, Math.min(100, Math.round(value)));
}

function getEstimatedPercentile(metric: MetricDefinition, currentValue: number) {
  const currentLevel = getCurrentDivisionLevel(metric, currentValue);
  const nextTarget = getNextDivisionTarget(metric, currentValue);

  if (!currentLevel && !nextTarget) return 50;
  if (currentLevel && !nextTarget) return 95;
  if (!currentLevel && nextTarget) return 35;

  const low = currentLevel as DivisionTarget;
  const high = nextTarget as DivisionTarget;

  const range = Math.abs(high.value - low.value);
  if (range === 0) return clampPercent(low.rank * 12);

  const progress = metric.higherIsBetter
    ? (currentValue - low.value) / range
    : (low.value - currentValue) / range;

  const base = low.rank * 12;
  const bonus = progress * 10;

  return clampPercent(base + bonus);
}

function formatBenchmarkTier(value?: string | null) {
  const raw = String(value || "").trim();

  return raw
    .replace(/\bncaa d1\b/gi, "NCAA D1")
    .replace(/\bncaa d2\b/gi, "NCAA D2")
    .replace(/\bncaa d3\b/gi, "NCAA D3")
    .replace(/\bnaia\b/gi, "NAIA")
    .replace(/\bnjcaa d1\b/gi, "NJCAA D1")
    .replace(/\bnjcaa d2\b/gi, "NJCAA D2")
    .replace(/\bnjcaa d3\b/gi, "NJCAA D3");
}

function getBenchmarkInfo(metric: MetricDefinition, currentValue: number) {
  const currentLevel = getCurrentDivisionLevel(metric, currentValue);
  const percentile = getEstimatedPercentile(metric, currentValue);

  const benchmarkTier = currentLevel
    ? `${currentLevel.label}-Level ${metric.label}`
    : `Developing ${metric.label}`;

  const percentileLabel =
    percentile >= 90
      ? `Top 10% benchmark range`
      : percentile >= 75
      ? `Top 25% benchmark range`
      : percentile >= 50
      ? `Above average benchmark range`
      : percentile >= 35
      ? `Developing benchmark range`
      : `Below target benchmark range`;

  const benchmarkLabel = currentLevel
    ? `Currently compares closest to ${currentLevel.label} benchmarks.`
    : `Currently building toward entry-level college benchmark ranges.`;

  return {
    benchmarkTier,
    percentileLabel,
    benchmarkLabel,
    percentile,
  };
}

function getDevelopmentJumpText(metric: MetricDefinition, currentValue: number) {
  const currentLevel = getCurrentDivisionLevel(metric, currentValue);
  const nextTarget = getNextDivisionTarget(metric, currentValue);

  if (!nextTarget) {
    return `This metric already compares well against the highest benchmark lane in the current ScoutLine model.`;
  }

  const currentLabel = currentLevel?.label || "current benchmark range";
  const directionText = metric.higherIsBetter ? "raising" : "lowering";

  return `${directionText} this from ${formatValue(currentValue, metric.unit)} toward ${formatValue(
    nextTarget.value,
    metric.unit
  )} is the clearest next jump from ${currentLabel} toward ${nextTarget.label}.`;
}

function scoreToLetterGrade(score: number) {
  if (score >= 90) return "Elite";
  if (score >= 80) return "High-Level";
  if (score >= 70) return "Recruitable";
  if (score >= 60) return "Emerging";
  return "Developmental";
}

function averageScores(scores: Array<number | null | undefined>, fallback = 70) {
  const valid = scores.filter((score): score is number => Number.isFinite(Number(score)));
  if (!valid.length) return fallback;
  return Math.round(valid.reduce((sum, score) => sum + score, 0) / valid.length);
}

function getMetricScore(player: any, metricKey: string) {
  const metric = METRICS[metricKey];
  if (!metric) return null;

  const value = getMetricValue(player, metricKey);
  if (!value) return null;

  return getEstimatedPercentile(metric, value);
}

function buildGrade(params: {
  key: PlayerGradeKey;
  label: string;
  score: number;
  description: string;
}): PlayerGrade {
  const roundedScore = Math.max(1, Math.min(100, Math.round(params.score)));

  return {
    key: params.key,
    label: params.label,
    score: roundedScore,
    grade: scoreToLetterGrade(roundedScore),
    description: params.description,
  };
}

export function buildPlayerGrades(input: RecommendationInput): PlayerGrade[] {
  const player = input.player || {};
  const summary = input.summary || {};
  const laneFit = input.laneFit || {};
  const position = getPrimaryPosition(player);

  const exitVeloScore = getMetricScore(player, "exitVelo");
  const sixtyScore = getMetricScore(player, "sixty");
  const homeToFirstScore = getMetricScore(player, "homeToFirst");
  const infieldVeloScore = getMetricScore(player, "infieldVelo");
  const outfieldVeloScore = getMetricScore(player, "outfieldVelo");
  const catcherVeloScore = getMetricScore(player, "catcherVelo");
  const popTimeScore = getMetricScore(player, "popTime");
  const fbVeloScore = getMetricScore(player, "fbVelo");

  const bestLaneScore = Number(laneFit?.bestScore || summary?.bestScore || 0);
  const normalizedLaneScore = bestLaneScore > 0 ? Math.min(95, Math.max(45, bestLaneScore)) : 70;

  const speedScore = averageScores([sixtyScore, homeToFirstScore], 68);
  const powerScore = averageScores([exitVeloScore], 68);

  const armScore =
    position === "C"
      ? averageScores([catcherVeloScore], 68)
      : position === "OF" || position === "LF" || position === "CF" || position === "RF"
      ? averageScores([outfieldVeloScore], 68)
      : position === "P" || position === "RHP" || position === "LHP"
      ? averageScores([fbVeloScore], 68)
      : averageScores([infieldVeloScore], 68);

  const defenseScore =
    position === "C"
      ? averageScores([catcherVeloScore, popTimeScore], 68)
      : position === "OF" || position === "LF" || position === "CF" || position === "RF"
      ? averageScores([speedScore, outfieldVeloScore], 68)
      : position === "P" || position === "RHP" || position === "LHP"
      ? averageScores([fbVeloScore], 68)
      : averageScores([speedScore, infieldVeloScore], 68);

  const hitScore = averageScores([exitVeloScore], 68);
  const athleticismScore = averageScores([speedScore, armScore], 68);
  const projectionScore = averageScores([normalizedLaneScore, athleticismScore, powerScore], 70);
  const recruitabilityScore = averageScores(
    [normalizedLaneScore, hitScore, powerScore, speedScore, armScore, defenseScore, projectionScore],
    70
  );

  return [
    buildGrade({
      key: "hit",
      label: "Offense",
      score: hitScore,
      description: "Based primarily on offensive impact indicators available in the current profile.",
    }),
    buildGrade({
      key: "power",
      label: "Power",
      score: powerScore,
      description: "Based primarily on exit velocity and offensive projection signals.",
    }),
    buildGrade({
      key: "speed",
      label: "Speed",
      score: speedScore,
      description: "Based on available run-speed metrics such as 60 yard dash and home-to-first.",
    }),
    buildGrade({
      key: "projection",
      label: "Projection",
      score: projectionScore,
      description: "Blends recruiting lane, athleticism, and physical tools to estimate future upside.",
    }),
    buildGrade({
      key: "defense",
      label: "Defense",
      score: defenseScore,
      description: "Position-adjusted defensive grade using speed, arm strength, and position-specific metrics.",
    }),
    buildGrade({
      key: "arm",
      label: "Arm",
      score: armScore,
      description: "Weighted by position using the most relevant throwing or pitching velocity metric.",
    }),
    buildGrade({
      key: "athleticism",
      label: "Athleticism",
      score: athleticismScore,
      description: "Combines speed and arm/tool strength into a general athletic profile grade.",
    }),
    buildGrade({
      key: "recruitability",
      label: "Recruitability",
      score: recruitabilityScore,
      description: "Overall ScoutLine-style grade combining fit, tools, projection, and current metrics.",
    }),
  ];
}

function buildMetricRecommendation(params: {
  metric: MetricDefinition;
  currentValue: number;
  targetValue: number;
  priority: RecommendationPriority;
  priorityScore: number;
  position: string;
  bestLane: string;
}): Recommendation {
  const { metric, currentValue, targetValue, priority, priorityScore, position, bestLane } =
    params;

  const actionVerb = metric.higherIsBetter ? "raise" : "lower";
  const jumpText = getDevelopmentJumpText(metric, currentValue);
  const benchmarkInfo = getBenchmarkInfo(metric, currentValue);

  return {
    category: "Metrics",
    title: `Improve ${metric.label}`,
    description: `For a ${position || "player"} tracking toward ${
      prettyDivision(bestLane) || "the next recruiting lane"
    }, the fastest way to move the meter is to ${actionVerb} ${metric.label.toLowerCase()} from ${formatValue(
      currentValue,
      metric.unit
    )} toward ${formatValue(targetValue, metric.unit)}. ${benchmarkInfo.benchmarkLabel} ${benchmarkInfo.percentileLabel}. Next-lane goal: ${jumpText}`,
    priority,
    priorityScore,
    metricKey: metric.key,
    currentValue,
    targetValue,
    unit: metric.unit,
    benchmarkLabel: benchmarkInfo.benchmarkLabel,
    percentileLabel: benchmarkInfo.percentileLabel,
    benchmarkTier: benchmarkInfo.benchmarkTier,
  };
}

export function buildPlayerScoutingReport(input: RecommendationInput): PlayerScoutingReport {
  const player = input.player || {};

  const rawName =
    player?.firstName ||
    player?.name ||
    player?.fullName ||
    player?.playerName ||
    "";

  const playerFirstName =
    String(rawName).trim().split(" ")[0] || "This player";

  const grades = buildPlayerGrades(input);
  const archetype = buildPlayerArchetype(input);
  const recommendations = buildRecommendations(input);
  const benchmarkBars = buildPlayerBenchmarkBars(input);

  const topGrades = grades
    .filter((grade) => grade.key !== "recruitability")
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const lowerGrades = grades
    .filter((grade) => grade.key !== "recruitability")
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  const strengths =
    topGrades.length > 0
      ? topGrades.map(
          (grade) => `${grade.label}: ${grade.grade} (${grade.score}/100)`
        )
      : ["Profile strength will improve as more verified metrics are added."];

  const developmentAreas =
    recommendations.length > 0
      ? recommendations.slice(0, 3).map((item) => item.title)
      : lowerGrades.map((grade) => `Continue developing ${grade.label.toLowerCase()}`);

  const bestBenchmark =
    benchmarkBars.sort((a, b) => b.score - a.score)[0];

  const headline = `${archetype.title} · Recruitability ${archetype.recruitabilityGrade}`;

const bestBenchmarkTier = formatBenchmarkTier(bestBenchmark?.benchmarkTier);

const summary = bestBenchmark
  ? `${archetype.summary} The strongest current benchmark signal is ${bestBenchmark.label.toLowerCase()}, where ${playerFirstName} is tracking in the ${bestBenchmark.percentileLabel.toLowerCase()} and compares closest to ${bestBenchmarkTier}.`
  : `${archetype.summary} Add more verified metrics to strengthen ScoutLine's evaluation confidence and unlock deeper benchmark analysis.`;

  const recruitingProjection =
  archetype.recruitabilityScore >= 85
    ? `${playerFirstName} is showing strong recruiting readiness. Continued outreach, verified video, and targeted school communication should be prioritized.`
    : archetype.recruitabilityScore >= 72
    ? `${playerFirstName} is recruitable with clear upside. The next step is closing one or two measurable development gaps while continuing targeted outreach.`
    : archetype.recruitabilityScore >= 60
    ? `${playerFirstName} is developing toward stronger recruiting alignment. Verified metrics, updated video, and focused development should be the near-term priority.`
    : `${playerFirstName} is still early in the recruiting evaluation process. More verified player data is needed before ScoutLine can assign a stronger projection.`;

  return {
    headline,
    summary,
    strengths,
    developmentAreas,
    recruitingProjection,
  };
}

function getBenchmarkMetricKeysForPlayer(player: any): string[] {
  const position = getPrimaryPosition(player);
  const secondary = normalizePosition(
    player?.secondaryPos ||
      player?.secondaryPosition ||
      player?.playerProfile?.secondaryPos ||
      ""
  );

const isPitcher =
  position === "P" ||
  secondary === "P" ||
  ["yes", "true", "1"].includes(String(player?.isPitcher || "").trim().toLowerCase()) ||
  ["RHP", "LHP"].includes(String(player?.pitcherHand || "").trim().toUpperCase());

const isCatcher =
  ["C", "CATCHER"].includes(String(position || "").toUpperCase()) ||
  ["C", "CATCHER"].includes(String(secondary || "").toUpperCase());
  const isInfielder = ["1B", "2B", "SS", "3B", "MIF", "CIF"].includes(position);
  const isOutfielder = ["LF", "CF", "RF", "OF"].includes(position);
  const isUtility = position === "UTILITY" || secondary === "UTILITY";

  const keys: string[] = [
    "heightIn",
    "weightLb",
    "gpa",
    "exitVelo",
    "sixty",
    "homeToFirst",
    "benchPress",
    "squat",
    "deadLift",
  ];

  if (isInfielder) keys.push("infieldVelo");
  if (isOutfielder) keys.push("outfieldVelo");
  if (isUtility) keys.push("rawThrowVelo");

  if (isCatcher) {
    keys.push("popTime");
    keys.push("catcherVelo");
  }

  if (isPitcher) {
    keys.push("avgFbVelo");
    keys.push("avgBbVelo");
    keys.push("avgChVelo");
  }

  return Array.from(new Set(keys));
}

export function buildPlayerBenchmarkBars(input: RecommendationInput): PlayerBenchmarkBar[] {
  const player = input.player || {};

  const rawName =
    player?.firstName ||
    player?.name ||
    player?.fullName ||
    player?.playerName ||
    "";

  const playerFirstName =
    String(rawName).trim().split(" ")[0] || "This player";

  const keys = getBenchmarkMetricKeysForPlayer(player);

  return keys
    .map((metricKey) => {
      const metric = METRICS[metricKey];
      if (!metric) return null;

      const currentValue = getMetricValue(player, metricKey);

      if (!currentValue) {
        return {
          key: metric.key,
          label: metric.label,
          score: 0,
          percentileLabel: "Data needed",
          benchmarkTier: "Profile data missing",
          hasValue: false,
          missingMessage: `${playerFirstName} has not input data for this benchmark yet. Adding this data to the player profile will improve recruitability score and benchmark accuracy.`,
        };
      }

      const benchmarkInfo = getBenchmarkInfo(metric, currentValue);

      return {
        key: metric.key,
        label: metric.label,
        score: getEstimatedPercentile(metric, currentValue),
        percentileLabel: benchmarkInfo.percentileLabel,
        benchmarkTier: benchmarkInfo.benchmarkTier,
        hasValue: true,
      };
    })
    .filter(Boolean) as PlayerBenchmarkBar[];
}

export function buildPlayerArchetype(input: RecommendationInput): PlayerArchetype {
  const player = input.player || {};

  const rawName =
    player?.firstName ||
    player?.name ||
    player?.fullName ||
    player?.playerName ||
    "";

  const playerFirstName =
    String(rawName).trim().split(" ")[0] || "This player";

  const grades = buildPlayerGrades(input);
  const position = getPrimaryPosition(player);

  const recruitability =
    grades.find((grade) => grade.key === "recruitability") ||
    buildGrade({
      key: "recruitability",
      label: "Recruitability",
      score: 70,
      description: "Overall recruitability estimate.",
    });

  const sortedTools = grades
    .filter((grade) => grade.key !== "recruitability")
    .sort((a, b) => b.score - a.score);

  const strongest = sortedTools[0];
  const second = sortedTools[1];

  const strongestTool = strongest?.label || "Projection";

  let title = "Projectable College Prospect";

  if (position === "C") {
    if (strongest?.key === "defense" || strongest?.key === "arm") {
      title = "Defensive Catching Prospect";
    } else if (strongest?.key === "power" || strongest?.key === "hit") {
      title = "Offensive Catching Prospect";
    } else {
      title = "Projectable Catching Prospect";
    }
  } else if (position === "SS" || position === "2B") {
    if (strongest?.key === "speed" || strongest?.key === "defense") {
      title = "Athletic Middle Infield Prospect";
    } else if (strongest?.key === "hit" || strongest?.key === "power") {
      title = "Offensive Middle Infield Prospect";
    } else {
      title = "Projectable Middle Infield Prospect";
    }
  } else if (position === "3B" || position === "1B") {
    if (strongest?.key === "power" || strongest?.key === "hit") {
      title = "Power Projection Corner Bat";
    } else if (strongest?.key === "arm" || strongest?.key === "defense") {
      title = "Defensive Corner Infield Prospect";
    } else {
      title = "Projectable Corner Infield Prospect";
    }
  } else if (position === "OF" || position === "LF" || position === "CF" || position === "RF") {
    if (strongest?.key === "speed") {
      title = "Speed-Driven Outfield Prospect";
    } else if (strongest?.key === "arm" || strongest?.key === "defense") {
      title = "Defensive Outfield Prospect";
    } else if (strongest?.key === "power" || strongest?.key === "hit") {
      title = "Offensive Outfield Prospect";
    } else {
      title = "Projectable Outfield Prospect";
    }
  } else if (position === "P" || position === "RHP" || position === "LHP") {
    if (strongest?.key === "arm") {
      title = "Velocity-Based Pitching Prospect";
    } else if (strongest?.key === "projection") {
      title = "Projectable Pitching Prospect";
    } else {
      title = "Developing Pitching Prospect";
    }
  }

  const scoreContext =
    recruitability.score >= 85
      ? `${playerFirstName} is showing strong current recruiting readiness.`
      : recruitability.score >= 72
      ? `${playerFirstName} is currently recruitable with clear upside.`
      : recruitability.score >= 60
      ? `${playerFirstName} is developing toward stronger recruiting alignment.`
      : `${playerFirstName} is still early in the recruiting evaluation process.`;

  const summary = second
    ? `${title}. ${scoreContext} Current ScoutLine profile is led by ${strongest.label.toLowerCase()} (${strongest.grade}) with ${second.label.toLowerCase()} also standing out (${second.grade}).`
    : `${title}. ${scoreContext} Continue building verified metrics, video, and game performance data to strengthen the projection.`;

  return {
    title,
    recruitabilityGrade: recruitability.grade,
    recruitabilityScore: recruitability.score,
    summary,
    strongestTool,
  };
}

function dedupeRecommendations(recommendations: Recommendation[]) {
  const seen = new Set<string>();

  return recommendations.filter((rec) => {
    const key = `${rec.category}-${rec.title}-${rec.metricKey || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getPlayerFirstName(player: any) {
  const rawName =
    player?.firstName ||
    player?.name ||
    player?.fullName ||
    player?.playerName ||
    "";

  return String(rawName).trim().split(" ")[0] || "The player";
}

function hasAnyMetric(player: any, keys: string[]) {
  return keys.some((key) => getMetricValue(player, key) != null);
}

function hasAnyVideo(player: any) {
  const externalVideos = Array.isArray(player?.externalVideos)
    ? player.externalVideos
    : [];

  const localVideos = Array.isArray(player?.localVideos)
    ? player.localVideos
    : [];

  const videoSocial = player?.videoSocial || {};

  const nestedExternal = Array.isArray(videoSocial?.externalVideos)
    ? videoSocial.externalVideos
    : [];

  const nestedLocal = Array.isArray(videoSocial?.localVideos)
    ? videoSocial.localVideos
    : [];

  return (
    externalVideos.length > 0 ||
    localVideos.length > 0 ||
    nestedExternal.length > 0 ||
    nestedLocal.length > 0 ||
    Boolean(player?.primary?.url || videoSocial?.primary?.url)
  );
}

function getGradYear(player: any): number | null {
  const n = Number(player?.gradYear || player?.graduationYear || player?.playerProfile?.gradYear);
  return Number.isFinite(n) ? n : null;
}

function getRecruitingTimelineLabel(gradYear: number | null) {
  if (!gradYear) return "Timeline";

  const currentYear = new Date().getFullYear();
  const yearsUntilGrad = gradYear - currentYear;

  if (yearsUntilGrad >= 3) return "Foundation Phase";
  if (yearsUntilGrad === 2) return "Build & Exposure Phase";
  if (yearsUntilGrad === 1) return "Active Outreach Phase";
  if (yearsUntilGrad <= 0) return "Urgent Opportunity Phase";

  return "Timeline";
}

function priorityFromScore(score: number): RecommendationPriority {
  if (score >= 80) return "High";
  if (score >= 55) return "Medium";
  return "Low";
}

function pushRecommendation(
  recommendations: Recommendation[],
  rec: Omit<Recommendation, "priority"> & { priority?: RecommendationPriority }
) {
  recommendations.push({
    ...rec,
    priority: rec.priority || priorityFromScore(rec.priorityScore),
  });
}

export function buildRecommendations(input: RecommendationInput): Recommendation[] {
  const player = input.player || {};
  const summary = input.summary || {};
  const laneFit = input.laneFit || {};
  const truthFitResults = Array.isArray(input.truthFitResults)
    ? input.truthFitResults
    : [];

  const playerFirstName = getPlayerFirstName(player);
  const position = getPrimaryPosition(player);
  const bestLane = getBestLane(summary, laneFit);
  const gradYear = getGradYear(player);
  const timelineLabel = getRecruitingTimelineLabel(gradYear);

  const laneScore = Number(laneFit?.bestScore || summary?.dominantScore || 0);
  const fitTier = String(laneFit?.fitTier || summary?.dominantFit || "");
  const gaps = Array.isArray(laneFit?.biggestGaps)
    ? laneFit.biggestGaps
    : Array.isArray(laneFit?.metricComparisons)
    ? laneFit.metricComparisons.filter((m: any) => m?.status === "BELOW")
    : [];

  const recommendations: Recommendation[] = [];

  // 1) Profile Completion
  const missingProfileItems: string[] = [];

  if (!player?.gpa) missingProfileItems.push("GPA");
  if (!hasAnyVideo(player)) missingProfileItems.push("video");
  if (!hasAnyMetric(player, ["exitVelo"])) missingProfileItems.push("exit velocity");
  if (!hasAnyMetric(player, ["sixty", "homeToFirst"])) missingProfileItems.push("speed metrics");

  const isPitcher =
    position === "P" ||
    ["yes", "true", "1"].includes(String(player?.isPitcher || "").trim().toLowerCase()) ||
    ["RHP", "LHP"].includes(String(player?.pitcherHand || "").trim().toUpperCase());

  const secondary = normalizePosition(
    player?.secondaryPos ||
      player?.secondaryPosition ||
      player?.playerProfile?.secondaryPos ||
      ""
  );

  const isCatcher = position === "C" || secondary === "C";

  if (isPitcher && !hasAnyMetric(player, ["avgFbVelo"])) {
    missingProfileItems.push("fastball velocity");
  }

  if (isCatcher && !hasAnyMetric(player, ["popTime", "catcherVelo"])) {
    missingProfileItems.push("catcher metrics");
  }

  if (missingProfileItems.length > 0) {
    pushRecommendation(recommendations, {
      category: "Profile",
      title: "Complete Key Profile Data",
      description: `${playerFirstName} should add ${missingProfileItems
        .slice(0, 4)
        .join(", ")} to improve ScoutLine recommendation accuracy, benchmark confidence, and recruiting readiness.`,
      priorityScore: missingProfileItems.length >= 3 ? 92 : 74,
    });
  }

  // 2) Metric Development from biggest lane gaps
  for (const gap of gaps.slice(0, 3)) {
    const metricKey = String(gap?.key || "");
    const metric = METRICS[metricKey];
    if (!metric) continue;

    const currentValue = Number(gap?.playerValue || getMetricValue(player, metricKey));
    const targetValue = Number(gap?.benchmarkValue || getApproxTarget(metricKey, bestLane));

    if (!Number.isFinite(currentValue) || !Number.isFinite(targetValue)) continue;

    const severity = getGapSeverity(metric, currentValue, targetValue);

    pushRecommendation(recommendations, {
      category: "Metrics",
      title: `Improve ${metric.label}`,
      description: `${playerFirstName}'s ${metric.label.toLowerCase()} is one of the clearest measurable gaps for the ${prettyDivision(
        bestLane
      ) || "target"} lane. Improving this benchmark can directly strengthen fit score and coach-facing profile confidence.`,
      priorityScore: Math.max(70, severity.score + 8),
      metricKey: metric.key,
      currentValue,
      targetValue,
      unit: metric.unit,
      benchmarkTier: gap?.label || metric.label,
      percentileLabel: "Development priority",
    });
  }

  // 3) Position-specific action
  if (position === "C") {
    pushRecommendation(recommendations, {
      category: "Position Fit",
      title: "Build Catcher-Specific Proof",
      description:
        "Add recent pop time, catcher throwing velocity, blocking, receiving, and game throwdown clips. Catchers need position-specific proof beyond general athletic metrics.",
      priorityScore: 78,
    });
  } else if (position === "P" || isPitcher) {
    pushRecommendation(recommendations, {
      category: "Position Fit",
      title: "Strengthen Pitching Evaluation Data",
      description:
        "Add recent fastball, changeup, breaking ball velocity, strike percentage, and bullpen or game video. Pitching profiles become much stronger when velocity, command, and pitch mix are visible together.",
      priorityScore: 82,
    });
  } else if (["SS", "2B", "MIF"].includes(position)) {
    pushRecommendation(recommendations, {
      category: "Position Fit",
      title: "Prove Up-the-Middle Defensive Value",
      description:
        "For middle infield profiles, prioritize lateral range, quick exchange, arm accuracy, footwork, and game-speed defensive video. Coaches need to see athletic actions, not just raw metrics.",
      priorityScore: 76,
    });
  } else if (["3B", "1B", "CIF"].includes(position)) {
    pushRecommendation(recommendations, {
      category: "Position Fit",
      title: "Strengthen Corner Profile Impact",
      description:
        "Corner infield profiles should show offensive impact, arm strength, reliable glove work, and physical projection. Prioritize exit velocity, infield velocity, and quality game swings.",
      priorityScore: 76,
    });
  } else if (["LF", "CF", "RF", "OF"].includes(position)) {
    pushRecommendation(recommendations, {
      category: "Position Fit",
      title: "Show Outfield Range and Arm Carry",
      description:
        "Outfield profiles benefit from route-running, first-step reads, arm carry, throwing accuracy, and offensive impact. Add video that shows game-speed outfield actions.",
      priorityScore: 74,
    });
  }

  // 4) Physical development action
  const hasStrengthData = hasAnyMetric(player, ["benchPress", "squat", "deadLift"]);
  const weight = Number(player?.weightLb || player?.weight || 0);

  if (!hasStrengthData) {
    pushRecommendation(recommendations, {
      category: "Athleticism",
      title: "Add Strength Benchmarks",
      description:
        "Add bench press, squat, and dead lift metrics so ScoutLine can better evaluate physical development, projection, and strength gains over time.",
      priorityScore: 66,
    });
  } else if (weight > 0 && weight < 170 && ["3B", "1B", "CIF", "P"].includes(position)) {
    pushRecommendation(recommendations, {
      category: "Athleticism",
      title: "Build Functional Strength and Mass",
      description:
        "For this position profile, adding functional strength and lean mass can support exit velocity, throwing velocity, durability, and projection.",
      priorityScore: 70,
    });
  }

  // 5) Academic action
  const gpa = Number(player?.gpa || 0);

  if (!gpa) {
    pushRecommendation(recommendations, {
      category: "Academics",
      title: "Add Academic Profile Data",
      description:
        "Add GPA, test scores if available, intended majors, and academic documents. Academic fit can expand recruiting options, especially for D3, high-academic D2, NAIA, and selective programs.",
      priorityScore: 80,
    });
  } else if (gpa < 3.0) {
    pushRecommendation(recommendations, {
      category: "Academics",
      title: "Improve Academic Recruiting Flexibility",
      description:
        "Raising GPA can expand the number of realistic college options and improve academic-fit confidence in ScoutLine recommendations.",
      priorityScore: 72,
    });
  }

  // 6) Recruiting strategy action
  const strongRegionalFits = truthFitResults.filter((item: any) => {
    const score = Number(item?.truthFit?.score || 0);
    const geo = String(item?.geographyLabel || "");
    return score >= 55 && ["In-State Fit", "Nearby Regional Fit", "Regional Fit"].includes(geo);
  });

  if (strongRegionalFits.length >= 5) {
    pushRecommendation(recommendations, {
      category: "Recruiting",
      title: "Build a Focused Regional Target List",
      description: `${playerFirstName} has enough regional fit signals to build a focused target list. Start with nearby programs that match the current recruiting lane, then expand outward as metrics improve.`,
      priorityScore: 84,
    });
  } else {
    pushRecommendation(recommendations, {
      category: "Recruiting",
      title: "Expand Target Program Research",
      description:
        "Use the college search and target programs tools to build a realistic list across division, region, academic fit, and roster opportunity. A broader list creates more paths to the right fit.",
      priorityScore: 68,
    });
  }

  // 7) Exposure action
  if (!hasAnyVideo(player)) {
    pushRecommendation(recommendations, {
      category: "Exposure",
      title: "Add Coach-Ready Video",
      description:
        "Upload short, recent video clips that show position actions, game swings, pitching looks, or measurable skills. Coaches need quick visual proof before investing deeper time.",
      priorityScore: 86,
    });
  } else if (laneScore >= 55) {
    pushRecommendation(recommendations, {
      category: "Exposure",
      title: "Start Targeted Coach Outreach",
      description:
        "Use the profile, player card, and target school list to begin targeted outreach. Prioritize programs where the player has realistic fit signals and clear reasons to connect.",
      priorityScore: 76,
    });
  }

  // 8) Timeline action
  if (timelineLabel === "Foundation Phase") {
    pushRecommendation(recommendations, {
      category: "Timeline",
      title: "Build the Foundation Early",
      description:
        "Focus on profile completeness, verified metrics, video habits, academic strength, and steady development. Early recruiting value comes from building a clean, trackable profile.",
      priorityScore: 62,
    });
  } else if (timelineLabel === "Build & Exposure Phase") {
    pushRecommendation(recommendations, {
      category: "Timeline",
      title: "Move From Development to Exposure",
      description:
        "This is the time to pair development with visibility. Keep metrics current, add fresh video, build a target list, and begin light outreach to realistic programs.",
      priorityScore: 74,
    });
  } else if (timelineLabel === "Active Outreach Phase") {
    pushRecommendation(recommendations, {
      category: "Timeline",
      title: "Begin Consistent Recruiting Outreach",
      description:
        "Prioritize targeted weekly outreach, follow-ups, updated video, and realistic program fit. This phase should be organized, consistent, and measurable.",
      priorityScore: 88,
    });
  } else if (timelineLabel === "Urgent Opportunity Phase") {
    pushRecommendation(recommendations, {
      category: "Timeline",
      title: "Prioritize Immediate Fit Opportunities",
      description:
        "Focus on programs with realistic fit, roster need, and quick communication paths. Keep outreach direct, current, and targeted.",
      priorityScore: 94,
    });
  }

  // Conservative fallback
  if (recommendations.length === 0) {
    pushRecommendation(recommendations, {
      category: "Development",
      title: "Keep Building Verified Data",
      description:
        "Continue adding verified metrics, updated video, academic information, and game performance data so ScoutLine can produce stronger recruiting guidance.",
      priorityScore: 60,
    });
  }

  // Tie recommendations to lane quality
  if (laneScore >= 70 || fitTier === "Match" || fitTier === "Strong Fit") {
    pushRecommendation(recommendations, {
      category: "Recruiting",
      title: "Convert Fit Into Action",
      description:
        "The current lane shows enough alignment to turn analysis into outreach. Save target programs, prepare a short coach message, and track follow-up activity.",
      priorityScore: 82,
    });
  }

  return dedupeRecommendations(recommendations)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 6);
}