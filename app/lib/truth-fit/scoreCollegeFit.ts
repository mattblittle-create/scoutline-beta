// app/lib/truth-fit/scoreCollegeFit.ts

import { getAcademicAreaMatches } from "@/app/lib/academics/getAcademicAreaMatches";

export type TruthFitLabel =
  | "Strong Fit"
  | "Match"
  | "Possible Match"
  | "Reach / Not Yet";

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
    homeState?: string | null;
    homeZip?: string | null;
    heightIn?: number | null;
    weightLb?: number | null;
    metrics?: Record<string, Array<{ value?: number | null }>>;
    academicAreas?: string[];
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
      confidence?: "HIGH" | "MEDIUM" | "LOW";
    };
    rosterNeeds?: Array<{
      gradYear?: number | null;
      position?: string | null;
      needLevel?: string | null;
    }>;
    academicAreas?: Array<{
      name?: string | null;
    }>;
  };
};

export type TruthFitResult = {
  score: number;
  label: TruthFitLabel;
  priority: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  gaps: string[];
  development: string[];
metricComparisons: Array<{
  key: string;
  label: string;
  playerValue: number;
  benchmarkValue: number;
  unit?: string | null;
  lowerIsBetter: boolean;
  delta: number;
  percentDelta: number;
  status: "ABOVE" | "IN_RANGE" | "BELOW";
}>;
  benchmarkSource: {
    metrics: {
      level: TruthFitBenchmarkSourceLevel;
      label: string;
      confidence: "HIGH" | "MEDIUM" | "LOW";
    };
  };

  projectionTag: string;
  academicFit: {
  score: number | null;
  label: string;
  playerAreas: string[];
  schoolAreas: string[];
  matchingAreas: string[];
  missingAreas: string[];
  relatedAreas: string[];
};
  projectionSummary: string;
};

function priorityFromScore(score: number): "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 75) return "HIGH";
  if (score >= 60) return "MEDIUM";
  return "LOW";
}

function labelFromScore(score: number, hasEstimatedSections = false): TruthFitLabel {
  if (score >= 90) return "Strong Fit";
  if (score >= 75) return "Match";
  if (score >= 60) return "Possible Match";

  // During beta, avoid overly harsh labels when major data sections are incomplete.
  if (hasEstimatedSections && score >= 50) return "Possible Match";

  return "Reach / Not Yet";
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
    if (pos !== "P") out.add("UTILITY");
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

function divisionLabel(value?: string | null) {
  const raw = String(value || "").replace(/_/g, " ").trim();
  return raw || "this level";
}

function formatMetricComparisonValue(value: number, unit?: string | null) {
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return unit ? `${rounded} ${unit}` : String(rounded);
}

function metricLabel(key: string) {
  if (key === "exitVelo") return "Exit Velocity";
  if (key === "sixtyYdDash") return "60-Yard Dash";
  if (key === "homeToFirst") return "Home-to-First";
  if (key === "rawThrowVelo") return "Raw Throwing Velocity";
  if (key === "infieldThrowVelo") return "Infield Throwing Velocity";
  if (key === "outfieldThrowVelo") return "Outfield Throwing Velocity";
  if (key === "catcherThrowVelo") return "Catcher Throwing Velocity";
  if (key === "avgFbVelo") return "Average Fastball Velocity";
  if (key === "avgChVelo") return "Average Changeup Velocity";
  if (key === "avgBbVelo") return "Average Breaking Ball Velocity";
  if (key === "popTime") return "Pop Time";
  if (key === "heightIn") return "Height";
  if (key === "weightLb") return "Weight";
  if (key === "gpa") return "GPA";
  return key;
}

function positionMetricKeys(positions: string[]) {
  const set = new Set<string>();

  const has = (pos: string) => positions.includes(pos);

  // Universal athletic / recruiting profile metrics
  set.add("exitVelo");
  set.add("sixtyYdDash");
  set.add("homeToFirst");
  set.add("heightIn");
  set.add("weightLb");

  // Strength / explosiveness metrics
  set.add("benchPress");
  set.add("squat");
  set.add("deadlift");

  // Academic profile
  set.add("gpa");

  // Pitchers
  if (has("P")) {
    set.add("avgFbVelo");
    set.add("avgChVelo");
    set.add("avgBbVelo");
    set.add("heightIn");
    set.add("weightLb");
    set.add("deadlift");
    set.add("squat");
  }

  // Catchers
  if (has("C")) {
    set.add("popTime");
    set.add("catcherThrowVelo");
    set.add("exitVelo");
    set.add("benchPress");
  }

  // Middle infield
  if (has("SS") || has("2B") || has("MIF")) {
    set.add("infieldThrowVelo");
    set.add("sixtyYdDash");
    set.add("homeToFirst");
    set.add("squat");
  }

  // Corner infield
  if (has("3B") || has("1B") || has("CIF")) {
    set.add("infieldThrowVelo");
    set.add("rawThrowVelo");
    set.add("exitVelo");
    set.add("heightIn");
    set.add("weightLb");
    set.add("benchPress");
  }

  // Outfield
  if (has("LF") || has("CF") || has("RF") || has("OF")) {
    set.add("outfieldThrowVelo");
    set.add("sixtyYdDash");
    set.add("homeToFirst");
    set.add("exitVelo");
    set.add("deadlift");
  }

  return Array.from(set);
}

function benchmarkConfidenceMultiplier(level?: TruthFitBenchmarkSourceLevel) {
  if (level === "SCHOOL") return 1;
  if (level === "CONFERENCE") return 0.98;
  if (level === "DIVISION") return 0.96;
  if (level === "GLOBAL") return 0.93;
  return 0.88;
}

function projectionFromFit({
  score,
  label,
  reasons,
  gaps,
  development,
  metricComparisons,
}: {
  score: number;
  label: TruthFitLabel;
  reasons: string[];
  gaps: string[];
  development: string[];
  metricComparisons: TruthFitResult["metricComparisons"];
}) {
  const hasStrongMetric = metricComparisons.some((item) => item.status === "ABOVE");
  const hasMetricGap = metricComparisons.some((item) => item.status === "BELOW");
  const hasAcademicStrength = reasons.some((reason) =>
    reason.toLowerCase().includes("gpa")
  );
  const hasRosterNeed = reasons.some((reason) =>
    reason.toLowerCase().includes("roster need")
  );

  if (score >= 88 && hasRosterNeed && hasStrongMetric) {
    return {
      projectionTag: "Immediate Impact Prospect",
      projectionSummary:
        "Your profile shows strong alignment with this program’s roster need and available benchmark data.",
    };
  }

  if (score >= 78 && (label === "Strong Fit" || label === "Match")) {
    return {
      projectionTag: "Strong Division Fit",
      projectionSummary:
        "Your current profile is tracking well for this program’s competitive level.",
    };
  }

  if (hasAcademicStrength && score >= 65) {
    return {
      projectionTag: "High Academic Fit",
      projectionSummary:
        "Your academic profile appears to strengthen this recruiting fit.",
    };
  }

  if (score >= 58 && hasMetricGap && development.length > 0) {
    return {
      projectionTag: "Developmental Upside",
      projectionSummary:
        "You are close enough to track this program, but your development areas should guide your next training focus.",
    };
  }

  if (score < 58 && gaps.length > 0) {
    return {
      projectionTag: "Stretch Opportunity",
      projectionSummary:
        "This program is currently more of a reach based on available profile and benchmark data.",
    };
  }

  return {
    projectionTag: "Emerging College Prospect",
    projectionSummary:
      "This fit is still developing as ScoutLine collects more profile, roster, and benchmark data.",
  };
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

  let academicFit: TruthFitResult["academicFit"] = {
  score: null,
  label: "No Major Preference",
  playerAreas: [],
  schoolAreas: [],
  matchingAreas: [],
  missingAreas: [],
  relatedAreas: [],
};

  let earned = 0;
  let possible = 0;

  const playerGpa = input.player.gpa ?? null;
  const collegeGpa = input.college.averageGpa ?? null;

// GPA fit: 25 points
possible += 25;

if (playerGpa == null && collegeGpa == null) {
  earned += 10;
  reasons.push("Academic fit is estimated because player GPA and program GPA benchmark data are incomplete.");
  development.push("Adding your GPA will make Truth Fit more accurate.");
} else if (playerGpa == null) {
  earned += 10;
  reasons.push("Academic fit is estimated because player GPA is incomplete.");
  development.push("Adding your GPA will make Truth Fit more accurate.");
} else if (collegeGpa == null) {
  earned += 13;
  reasons.push("Academic fit is estimated because this program does not have GPA benchmark data yet.");
} else if (playerGpa >= collegeGpa) {
    earned += 25;
    reasons.push(
      `Your GPA (${formatGpa(playerGpa)}) meets or exceeds this program's average GPA (${formatGpa(collegeGpa)}).`
    );
} else if (playerGpa >= collegeGpa - 0.25) {
    earned += 20;
    reasons.push(
      `Your GPA (${formatGpa(playerGpa)}) is within 0.25 of this program's average GPA (${formatGpa(collegeGpa)}).`
    );
    gaps.push("A small GPA bump could strengthen this academic fit.");
} else if (playerGpa >= collegeGpa - 0.5) {
    earned += 13;
    gaps.push(
      `Your GPA (${formatGpa(playerGpa)}) is below this program's average GPA (${formatGpa(collegeGpa)}).`
    );
  } else {
    earned += 6;
    gaps.push(
      `Your GPA (${formatGpa(playerGpa)}) is significantly below this program's average GPA (${formatGpa(collegeGpa)}).`
    );
  }

// Position / grad-year need fit: 30 points
possible += 30;

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
    earned += 30;
    reasons.push(
      `This program has a HIGH roster need matching your ${playerGradYear} class and ${posLabel} position profile.`
    );
  } else if (mediumNeed) {
    earned += 23;
    reasons.push(
      `This program has a MEDIUM roster need matching your ${playerGradYear} class and ${posLabel} position profile.`
    );
  } else if (lowNeed) {
    earned += 15;
    reasons.push(
      `This program has a LOW roster need match for your ${playerGradYear} class and ${posLabel} position profile.`
    );
  } else if (needs.length === 0) {
    earned += 10;
    reasons.push("Roster need fit is estimated because program need data is not available yet.");
  } else {
    earned += 6;
    gaps.push(
      `No confirmed roster need currently matches your ${playerGradYear || "grad year"} class and ${posLabel} position profile.`
    );
  }

  // Academic area / intended major fit: 15 points
  possible += 15;

  const playerAcademicAreas = (input.player.academicAreas || [])
    .map((area) => String(area || "").trim())
    .filter(Boolean);

  const collegeAcademicAreas = (input.college.academicAreas || [])
    .map((area) => String(area?.name || "").trim())
    .filter(Boolean);

  academicFit = {
    score: null,
    label: "No Major Preference",
    playerAreas: playerAcademicAreas,
    schoolAreas: collegeAcademicAreas,
    matchingAreas: [],
    missingAreas: [],
    relatedAreas: [],
  };

  if (!playerAcademicAreas.length) {
    earned += 6;
    reasons.push(
      "Academic major fit is estimated because the player has not added intended major(s) yet."
    );
    development.push("Adding intended major(s) will improve academic fit accuracy.");
  } else if (!collegeAcademicAreas.length) {
    earned += 6;
    academicFit = {
      ...academicFit,
      label: "Academic Data Pending",
      missingAreas: playerAcademicAreas,
    };
    reasons.push(
      "Academic major fit is estimated because this school does not have academic area data yet."
    );
  } else {
    const academicMatches = getAcademicAreaMatches(
      playerAcademicAreas,
      collegeAcademicAreas
    );

    const collegeAreaSet = new Set(
  collegeAcademicAreas.map((area) => area.toLowerCase())
);

const exactAcademicMatches = playerAcademicAreas.filter((area) =>
  collegeAreaSet.has(area.toLowerCase())
);

const relatedAcademicMatches = academicMatches.filter(
  (area) => !exactAcademicMatches.some((exact) => exact.toLowerCase() === area.toLowerCase())
);

    const matchSet = new Set(academicMatches.map((area) => area.toLowerCase()));

    const missingAreas = playerAcademicAreas.filter(
      (area) => !matchSet.has(area.toLowerCase())
    );

    const academicScore = Math.round(
      (academicMatches.length / playerAcademicAreas.length) * 100
    );

    const academicPoints = Math.round((academicScore / 100) * 15);

    earned += academicPoints > 0 ? academicPoints : 2;

    let academicLabel = "Low Academic Match";
    if (academicScore === 100) academicLabel = "Strong Academic Match";
    else if (academicScore >= 50) academicLabel = "Partial Academic Match";

    academicFit = {
      score: academicScore,
      label: academicLabel,
      playerAreas: playerAcademicAreas,
      schoolAreas: collegeAcademicAreas,
      matchingAreas: exactAcademicMatches,
      relatedAreas: relatedAcademicMatches,
      missingAreas,
    };

if (academicMatches.length === playerAcademicAreas.length) {
  if (exactAcademicMatches.length) {
    reasons.push(
      `Strong academic match: this school has confirmed academic area(s) matching your intended major(s): ${exactAcademicMatches.join(", ")}.`
    );
  } else {
    reasons.push(
      `Strong academic match: this school has related academic area(s) aligned with your intended major(s).`
    );
  }
} else if (academicMatches.length > 0) {
  if (exactAcademicMatches.length) {
    reasons.push(
      `Partial academic match: this school has confirmed academic area(s) matching ${exactAcademicMatches.join(", ")}.`
    );
  } else {
    reasons.push(
      `Partial academic match: this school has related academic area(s) aligned with your intended major(s).`
    );
  }

      if (missingAreas.length) {
        gaps.push(
          `Academic gap: no confirmed match yet for ${missingAreas.join(", ")}.`
        );
      }
    } else {
      gaps.push(
        `No confirmed academic match yet for your intended major(s): ${playerAcademicAreas.join(", ")}.`
      );
    }
  }

  // Metrics fit: 30 points
  possible += 30;

  const metricAverages = input.college.metricAverages || [];

  const metricKeysToCheck = positionMetricKeys(positions);

  const matchedMetricScores: Array<{ score: number; weight: number }> = [];

  const metricComparisons: TruthFitResult["metricComparisons"] = [];

  const metricsBenchmarkSource: TruthFitResult["benchmarkSource"]["metrics"] = {
    level: input.college.metricBenchmarkSource?.level || "ESTIMATED",
    label:
      input.college.metricBenchmarkSource?.label ||
      "Estimated - benchmark data not available yet",
    confidence: input.college.metricBenchmarkSource?.confidence || "LOW",
  };

  for (const key of metricKeysToCheck) {
    const playerValue =
      key === "heightIn"
        ? input.player.heightIn ?? null
        : key === "weightLb"
        ? input.player.weightLb ?? null
        : key === "gpa"
        ? input.player.gpa ?? null
        : latestMetricValue(input.player.metrics, key);

    if (playerValue == null) continue;

    const benchmark =
      key === "gpa" && collegeGpa != null
        ? {
            position: "",
            metricKey: "gpa",
            averageValue: collegeGpa,
            minValue: null,
            maxValue: null,
            unit: "",
          }
        : metricAverages.find((metric) => {
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

if (key === "gpa") {
  if (playerValue >= avg) {
    metricScore = 1;
  } else if (playerValue >= avg - 0.25) {
    metricScore = 0.7;
  } else {
    metricScore = 0.35;
  }
} else if (lowerIsBetter) {
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

const delta = lowerIsBetter
  ? avg - playerValue
  : playerValue - avg;

const percentDelta =
  avg !== 0
    ? Math.abs(delta / avg)
    : Math.abs(delta);

metricComparisons.push({
  key,
  label: metricLabel(key),
  playerValue,
  benchmarkValue: avg,
  unit: benchmark.unit || null,
  lowerIsBetter,
  delta,
  percentDelta,
  status:
    metricScore === 1
      ? "ABOVE"
      : metricScore === 0.7
      ? "IN_RANGE"
      : "BELOW",
});

    if (metricScore === 1 && reasons.length < 5) {
      reasons.push(`${metricLabel(key)} is at or above the benchmark range for this fit.`);
    }

    if (metricScore === 0.35 && gaps.length < 5) {
      gaps.push(
        `${metricLabel(key)} is below benchmark: you are at ${formatMetricComparisonValue(
          playerValue,
          benchmark.unit
        )} vs benchmark ${formatMetricComparisonValue(avg, benchmark.unit)}.`
      );
    }
  }

  if (matchedMetricScores.length === 0) {
    earned += 10;
    reasons.push(
      "Metrics fit is estimated because matching player metrics or program benchmark data is not available yet."
    );
    development.push("Adding verified metrics will make your Truth Fit results more accurate and actionable.");
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
        `Your overall metric profile is currently below the ${metricsBenchmarkSource.label}.`
      );

development.push(
  `Improving your core athletic metrics will significantly increase your recruiting fit for ${divisionLabel(input.college.division)} programs.`
);
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
    const targetExitVelo = exitVelo < 85 ? 90 : 92;

    development.push(
      `Improving exit velocity from ${Math.round(exitVelo)} to ${targetExitVelo} mph would strengthen your offensive profile for ${divisionLabel(input.college.division)} programs.`
    );
  }

  if (sixty != null && sixty > 7.0) {
    const targetSixty = sixty > 7.25 ? 6.95 : 6.9;

    development.push(
      `Improving 60-yard from ${sixty.toFixed(2)} to ${targetSixty.toFixed(
        2
      )} would increase ${divisionLabel(input.college.division)} fit scores substantially, especially for infield and outfield opportunities.`
    );
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
development.push(
  `Increasing average fastball velocity will improve your pitching fit against ${divisionLabel(input.college.division)} benchmarks.`
);
  }

const rawScore = Math.round((earned / possible) * 100);

const hasEstimatedSections =
  playerGpa == null ||
  collegeGpa == null ||
  needs.length === 0 ||
  matchedMetricScores.length === 0;

const confidenceMultiplier = benchmarkConfidenceMultiplier(metricsBenchmarkSource.level);

const score = Math.max(
  0,
  Math.min(100, Math.round(rawScore * confidenceMultiplier))
);

if (confidenceMultiplier < 1) {
  reasons.push(
    `Truth Fit confidence is adjusted because this result uses ${metricsBenchmarkSource.label.toLowerCase()}.`
  );
}

const uniqueDevelopment = Array.from(new Set(development));

if (score >= 75 && gaps.length <= 1) {
  uniqueDevelopment.unshift("Next best action: add this school to Target Programs and prepare a personalized coach outreach email.");
} else if (score >= 60) {
  uniqueDevelopment.unshift("Next best action: track this school while improving the gaps listed above.");
} else {
  uniqueDevelopment.unshift("Next best action: keep this school on your radar, but prioritize stronger current-fit programs first.");
}

const sortedComparisons = [...metricComparisons].sort((a, b) => {
  const priority = (m: any) => {
    if (m.status === "BELOW") return 3;
    if (m.status === "IN_RANGE") return 2;
    return 1;
  };

  return priority(b) - priority(a);
});

const label = labelFromScore(score, hasEstimatedSections);

const projection = projectionFromFit({
  score,
  label,
  reasons: Array.from(new Set(reasons)),
  gaps: Array.from(new Set(gaps)),
  development: uniqueDevelopment,
  metricComparisons: sortedComparisons,
});

return {
  score,
  label,
  priority: priorityFromScore(score),
  reasons: Array.from(new Set(reasons)).slice(0, 6),
  gaps: Array.from(new Set(gaps)).slice(0, 5),
  development: uniqueDevelopment.slice(0, 4),
  metricComparisons: sortedComparisons.slice(0, 5),
  benchmarkSource: {
    metrics: metricsBenchmarkSource,
  },
  academicFit,
  projectionTag: projection.projectionTag,
  projectionSummary: projection.projectionSummary,
};
}