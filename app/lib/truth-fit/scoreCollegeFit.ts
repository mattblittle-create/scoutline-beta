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
    reasons.push("GPA fit is estimated because school/program GPA data is incomplete.");
  } else if (playerGpa >= collegeGpa) {
    earned += 35;
    reasons.push("Player GPA meets or exceeds the program average.");
  } else if (playerGpa >= collegeGpa - 0.25) {
    earned += 27;
    reasons.push("Player GPA is close to the program average.");
    gaps.push("Raise GPA slightly to strengthen academic fit.");
  } else if (playerGpa >= collegeGpa - 0.5) {
    earned += 18;
    gaps.push("GPA is below the program average.");
  } else {
    earned += 8;
    gaps.push("GPA is significantly below the program average.");
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

  if (highNeed) {
    earned += 35;
    reasons.push("Program has a high roster need for this grad year and position.");
  } else if (mediumNeed) {
    earned += 27;
    reasons.push("Program has a medium roster need for this grad year and position.");
  } else if (lowNeed) {
    earned += 18;
    reasons.push("Program has a lower roster need match.");
  } else if (needs.length === 0) {
    earned += 18;
    reasons.push("Roster need fit is estimated because need data is not available yet.");
  } else {
    earned += 8;
    gaps.push("No confirmed roster need match for this grad year and position yet.");
  }

  // Metrics fit placeholder: 30 points
  possible += 30;

  earned += 18;
  reasons.push("Metrics fit is estimated until program/conference metric averages are fully loaded.");

  const score = Math.round((earned / possible) * 100);

  return {
    score,
    label: labelFromScore(score),
    reasons,
    gaps,
  };
}