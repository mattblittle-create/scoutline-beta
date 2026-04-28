// app/lib/truth-fit/scoreCollegeFit.ts

export type TruthFitLabel =
  | "Strong Fit"
  | "Match"
  | "Possible Match"
  | "Not Yet";

export type TruthFitInput = {
  player: {
    gpa?: number | null;
    gradYear?: number | null;
    primaryPos?: string | null;
    secondaryPos?: string | null;
  };
  college: {
    averageGpa?: number | null;
    division?: string | null;
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
};

function labelFromScore(score: number): TruthFitLabel {
  if (score >= 90) return "Strong Fit";
  if (score >= 75) return "Match";
  if (score >= 60) return "Possible Match";
  return "Not Yet";
}

function normalizePos(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function formatGpa(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function formatPositions(positions: string[]) {
  return positions.length ? positions.join("/") : "position";
}

export function scoreCollegeFit(input: TruthFitInput): TruthFitResult {
  const reasons: string[] = [];
  const gaps: string[] = [];

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
  const positions = [
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

  const highNeed = matchingNeeds.some((n) => n.needLevel === "HIGH");
  const mediumNeed = matchingNeeds.some((n) => n.needLevel === "MEDIUM");
  const lowNeed = matchingNeeds.some((n) => n.needLevel === "LOW");

  const posLabel = formatPositions(positions);

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

  // Metrics fit placeholder: 30 points
  possible += 30;

  earned += 18;
  reasons.push("Metrics fit is currently estimated until program, division, and conference benchmark data is fully loaded.");

  const score = Math.round((earned / possible) * 100);

  return {
    score,
    label: labelFromScore(score),
    reasons,
    gaps,
  };
}