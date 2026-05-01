// app/lib/truth-fit/scoreCollegeFit.ts

export type TruthFitLabel =
  | "Strong Fit"
  | "Match"
  | "Possible Match"
  | "Not Yet";

export type TruthFitBenchmarkSourceLevel =
  | "SCHOOL"
  | "CONFERENCE"
  | "DIVISION"
  | "GLOBAL"
  | "ESTIMATED";

export type TruthFitInput = {
  player: {
    gpa?: number | null;
    gradYear?: number | null;
    primaryPos?: string | null;
    secondaryPos?: string | null;
    heightIn?: number | null;
    weightLb?: number | null;
    metrics?: Record<string, Array<{ value?: number | null }>>;
  };
  college: {
    averageGpa?: number | null;
    division?: string | null;
    metricAverages?: Array<{
      position?: string | null;
      metricKey?: string | null;
      averageValue?: number | string | null;
      minValue?: number | string | null;
      maxValue?: number | string | null;
      unit?: string | null;
    }>;
    metricBenchmarkSource?: {
      level: TruthFitBenchmarkSourceLevel;
      label: string;
    };
    rosterNeeds?: Array<{
      gradYear?: number | null;
      position?: string | null;
      needLevel?: string | null;
    }>;
  };
};

export type TruthFitResult = {
  score: number;
  label: TruthFitLabel;
  reasons: string[];
  gaps: string[];
  development: string[]; // 👈 NEW
  benchmarkSource: {
    metrics: {
      level: TruthFitBenchmarkSourceLevel;
      label: string;
    };
  };
};

function labelFromScore(score: number, hasEstimatedSections = false): TruthFitLabel {
  if (score >= 90) return "Strong Fit";
  if (score >= 75) return "Match";
  if (score >= 60) return "Possible Match";

  // During beta, avoid overly harsh labels when major data sections are incomplete.
  if (hasEstimatedSections && score >= 50) return "Possible Match";

  return "Not Yet";
}

function normalizePos(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function expandedPositions(primary?: string | null, secondary?: string | null) {
  const raw = [normalizePos(primary), normalizePos(secondary)].filter(Boolean);
  const out = new Set<string>();

  for (const pos of raw) {
    out.add(pos);

    if (pos === "LF" || pos === "CF" || pos === "RF") out.add("OF");
    if (pos === "2B" || pos === "SS") out.add("MIF");
    if (pos === "1B" || pos === "3B") out.add("CIF");
    if (pos !== "P") out.add("Utility");
  }

  return Array.from(out);
}

function formatGpa(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function formatPositions(positions: string[]) {
  return positions.length ? positions.join("/") : "position";
}

function latestMetricValue(
  metrics: Record<string, Array<{ value?: number | null }>> | undefined,
  key: string
) {
  const entries = metrics?.[key];
  if (!Array.isArray(entries) || entries.length === 0) return null;

  const last = entries[entries.length - 1];
  const value = Number(last?.value);

  return Number.isFinite(value) ? value : null;
}

function toNumber(value: number | string | null | undefined) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function needLevel(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function metricWeight(key: string) {
  if (key === "avgFbVelo") return 1.35;
  if (key === "exitVelo") return 1.25;
  if (key === "popTime") return 1.2;
  if (
    key === "infieldThrowVelo" ||
    key === "outfieldThrowVelo" ||
    key === "catcherThrowVelo"
  ) {
    return 1.15;
  }
  if (key === "sixtyYdDash" || key === "homeToFirst") return 1.1;
  if (key === "avgChVelo" || key === "avgBbVelo") return 0.9;
  if (key === "heightIn" || key === "weightLb") return 0.55;
  return 1;
}

export function scoreCollegeFit(input: TruthFitInput): TruthFitResult {
  const reasons: string[] = [];
  const gaps: string[] = [];
  const development: string[] = [];

  let earned = 0;
  let possible = 0;

  const playerGpa = input.player.gpa ?? null;
  const collegeGpa = input.college.averageGpa ?? null;

  // GPA fit: 35 points
  possible += 35;

  if (playerGpa == null || collegeGpa == null) {
    earned += 20;
    reasons.push("Academic fit is estimated because player GPA or program GPA data is incomplete.");
  } else if (playerGpa >= collegeGpa) {
    earned += 35;
    reasons.push(
      `Your GPA (${formatGpa(playerGpa)}) meets or exceeds this program's average GPA (${formatGpa(collegeGpa)}).`
    );
  } else if (playerGpa >= collegeGpa - 0.25) {
    earned += 27;
    reasons.push(
      `Your GPA (${formatGpa(playerGpa)}) is within 0.25 of this program's average GPA (${formatGpa(collegeGpa)}).`
    );
    gaps.push("A small GPA bump could strengthen this academic fit.");
  } else if (playerGpa >= collegeGpa - 0.5) {
    earned += 18;
    gaps.push(
      `Your GPA (${formatGpa(playerGpa)}) is below this program's average GPA (${formatGpa(collegeGpa)}).`
    );
  } else {
    earned += 8;
    gaps.push(
      `Your GPA (${formatGpa(playerGpa)}) is significantly below this program's average GPA (${formatGpa(collegeGpa)}).`
    );
  }

  // Position / grad-year need fit: 35 points
  possible += 35;

  const playerGradYear = input.player.gradYear ?? null;
  const positions = expandedPositions(input.player.primaryPos, input.player.secondaryPos);
  const displayPositions = [
    normalizePos(input.player.primaryPos),
    normalizePos(input.player.secondaryPos),
  ].filter(Boolean);

  const needs = input.college.rosterNeeds || [];

  const matchingNeeds = needs.filter((need) => {
    const needYear = need.gradYear ?? null;
    const needPos = normalizePos(need.position);

    return (
      playerGradYear != null &&
      needYear === playerGradYear &&
      positions.includes(needPos)
    );
  });

  const highNeed = matchingNeeds.some((n) => needLevel(n.needLevel) === "HIGH");
  const mediumNeed = matchingNeeds.some((n) => needLevel(n.needLevel) === "MEDIUM");
  const lowNeed = matchingNeeds.some((n) => needLevel(n.needLevel) === "LOW");

  const posLabel = formatPositions(displayPositions);

  if (highNeed) {
    earned += 35;
    reasons.push(
      `This program has a HIGH roster need matching your ${playerGradYear} class and ${posLabel} position profile.`
    );
  } else if (mediumNeed) {
    earned += 27;
    reasons.push(
      `This program has a MEDIUM roster need matching your ${playerGradYear} class and ${posLabel} position profile.`
    );
  } else if (lowNeed) {
    earned += 18;
    reasons.push(
      `This program has a LOW roster need match for your ${playerGradYear} class and ${posLabel} position profile.`
    );
  } else if (needs.length === 0) {
    earned += 18;
    reasons.push("Roster need fit is estimated because program need data is not available yet.");
  } else {
    earned += 8;
    gaps.push(
      `No confirmed roster need currently matches your ${playerGradYear || "grad year"} class and ${posLabel} position profile.`
    );
  }

  // Metrics fit: 30 points
  possible += 30;

  const metricAverages = input.college.metricAverages || [];

  const metricKeysToCheck = [
    "exitVelo",
    "sixtyYdDash",
    "homeToFirst",
    "rawThrowVelo",
    "infieldThrowVelo",
    "outfieldThrowVelo",
    "catcherThrowVelo",
    "avgFbVelo",
    "avgChVelo",
    "avgBbVelo",
    "popTime",
    "heightIn",
    "weightLb",
  ];

  const matchedMetricScores: Array<{ score: number; weight: number }> = [];

  const metricsBenchmarkSource: TruthFitResult["benchmarkSource"]["metrics"] =
    input.college.metricBenchmarkSource || {
      level: "ESTIMATED",
      label: "Estimated - benchmark data not available yet",
    };

  for (const key of metricKeysToCheck) {
    const playerValue =
      key === "heightIn"
        ? input.player.heightIn ?? null
        : key === "weightLb"
        ? input.player.weightLb ?? null
        : latestMetricValue(input.player.metrics, key);

    if (playerValue == null) continue;

    const benchmark = metricAverages.find((metric) => {
      const metricKey = String(metric.metricKey || "").trim();
      const metricPos = normalizePos(metric.position);

      return metricKey === key && (!metricPos || positions.includes(metricPos));
    });

    if (!benchmark) continue;

    const avg = toNumber(benchmark.averageValue);
    const min = toNumber(benchmark.minValue);
    const max = toNumber(benchmark.maxValue);

    if (avg == null) continue;

    const lowerIsBetter =
      key === "sixtyYdDash" ||
      key === "homeToFirst" ||
      key === "popTime";

    let metricScore = 0;

    if (lowerIsBetter) {
      if (playerValue <= avg) {
        metricScore = 1;
      } else if (max != null && playerValue <= max) {
        metricScore = 0.7;
      } else {
        metricScore = 0.35;
      }
    } else {
      if (playerValue >= avg) {
        metricScore = 1;
      } else if (min != null && playerValue >= min) {
        metricScore = 0.7;
      } else {
        metricScore = 0.35;
      }
    }

    matchedMetricScores.push({
      score: metricScore,
      weight: metricWeight(key),
    });
  }

  if (matchedMetricScores.length === 0) {
    earned += 18;
    reasons.push(
      "Metrics fit is estimated because matching program benchmark data is not available yet."
    );
  } else {
    const weightedScoreTotal = matchedMetricScores.reduce(
      (sum, item) => sum + item.score * item.weight,
      0
    );

    const weightTotal = matchedMetricScores.reduce(
      (sum, item) => sum + item.weight,
      0
    );

    const metricAverage = weightTotal > 0 ? weightedScoreTotal / weightTotal : 0;

    const metricPoints = Math.round(metricAverage * 30);
    earned += metricPoints;

    if (metricAverage >= 0.9) {
      reasons.push(`Your available metrics compare strongly against ${metricsBenchmarkSource.label}.`);
    } else if (metricAverage >= 0.7) {
      reasons.push(`Your available metrics are within range of ${metricsBenchmarkSource.label}.`);
    } else {
      gaps.push(
        `Your available metrics are currently below the ${metricsBenchmarkSource.label.toLowerCase()}.`
      );

      development.push("Improving your core athletic metrics will significantly increase your recruiting fit.");
    }
  }

  // Targeted development suggestions based on current player metrics
  const exitVelo = latestMetricValue(input.player.metrics, "exitVelo");
  const sixty = latestMetricValue(input.player.metrics, "sixtyYdDash");
  const homeToFirst = latestMetricValue(input.player.metrics, "homeToFirst");
  const infieldThrowVelo = latestMetricValue(input.player.metrics, "infieldThrowVelo");
  const outfieldThrowVelo = latestMetricValue(input.player.metrics, "outfieldThrowVelo");
  const catcherThrowVelo = latestMetricValue(input.player.metrics, "catcherThrowVelo");
  const avgFbVelo = latestMetricValue(input.player.metrics, "avgFbVelo");

  const primaryPos = normalizePos(input.player.primaryPos);
  const secondaryPos = normalizePos(input.player.secondaryPos);

  if (exitVelo != null && exitVelo < 90) {
    development.push("Increasing exit velocity will help improve your offensive fit at most college levels.");
  }

  if (sixty != null && sixty > 7.0) {
    development.push("Improving your 60-yard dash time can raise your fit score, especially for infield and outfield opportunities.");
  }

  if (homeToFirst != null && homeToFirst > 4.5) {
    development.push("Improving home-to-first time can help show better game-speed athleticism.");
  }

  if (
    infieldThrowVelo != null &&
    infieldThrowVelo < 85 &&
    (primaryPos === "1B" ||
      primaryPos === "2B" ||
      primaryPos === "SS" ||
      primaryPos === "3B" ||
      secondaryPos === "1B" ||
      secondaryPos === "2B" ||
      secondaryPos === "SS" ||
      secondaryPos === "3B")
  ) {
    development.push("Adding infield throwing velocity will improve your defensive value on the left side or corner infield.");
  }

  if (
    outfieldThrowVelo != null &&
    outfieldThrowVelo < 88 &&
    (primaryPos === "LF" ||
      primaryPos === "CF" ||
      primaryPos === "RF" ||
      secondaryPos === "LF" ||
      secondaryPos === "CF" ||
      secondaryPos === "RF")
  ) {
    development.push("Improving outfield throwing velocity will strengthen your profile for college outfield roles.");
  }

  if (
    catcherThrowVelo != null &&
    catcherThrowVelo < 78 &&
    (primaryPos === "C" || secondaryPos === "C")
  ) {
    development.push("Improving catcher throwing velocity can raise your defensive fit behind the plate.");
  }

  if (
    avgFbVelo != null &&
    avgFbVelo < 82 &&
    (primaryPos === "P" || secondaryPos === "P")
  ) {
    development.push("Increasing average fastball velocity will improve your pitching fit against college benchmarks.");
  }

const score = Math.round((earned / possible) * 100);

const hasEstimatedSections =
  playerGpa == null ||
  collegeGpa == null ||
  needs.length === 0 ||
  matchedMetricScores.length === 0;

return {
  score,
  label: labelFromScore(score, hasEstimatedSections),
  reasons,
  gaps,
  development: Array.from(new Set(development)).slice(0, 4),
  benchmarkSource: {
    metrics: metricsBenchmarkSource,
  },
};
}