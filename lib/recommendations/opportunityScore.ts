// lib/recommendations/opportunityScore.ts

type OpportunitySignalInput = {
  rosterNeedLevel?: string | null;
  rosterTurnoverLevel?: string | null;
  recruitingAggressiveness?: string | null;
  regionalRecruitingBias?: string | null;
  transferHeavy?: boolean | null;
  jucoFriendly?: boolean | null;
  currentRosterSize?: number | null;
  headCoachTenureYears?: number | null;
  recentWinPercentage?: unknown;

  // Roster-cycle intelligence
  graduatingSeniors?: number | null;
  graduatingPitchers?: number | null;
  graduatingCatchers?: number | null;
  graduatingInfielders?: number | null;
  graduatingOutfielders?: number | null;
  returningPitchers?: number | null;
  returningPositionPlayers?: number | null;
  rosterFreshmen?: number | null;
  rosterSophomores?: number | null;
  rosterJuniors?: number | null;
  rosterSeniors?: number | null;
  portalTransfersIn?: number | null;
  portalTransfersOut?: number | null;
};

export type OpportunityScoreResult = {
  score: number;
  label:
    | "High Opportunity"
    | "Good Opportunity"
    | "Moderate Opportunity"
    | "Low Opportunity";
  confidence: {
    score: number;
    label: "High Confidence" | "Moderate Confidence" | "Limited Data";
    explanation: string;
  };
  reasons: string[];
};

function normalizeText(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function decimalToNumber(value: unknown): number | null {
  if (value == null) return null;

  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === "object" && "toString" in value) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function numberOrZero(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function hasNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value);
}

function hasText(value?: string | null) {
  return typeof value === "string" && value.trim().length > 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getOpportunityLabel(score: number): OpportunityScoreResult["label"] {
  if (score >= 80) return "High Opportunity";
  if (score >= 65) return "Good Opportunity";
  if (score >= 45) return "Moderate Opportunity";
  return "Low Opportunity";
}

function getConfidenceLabel(
  score: number
): OpportunityScoreResult["confidence"]["label"] {
  if (score >= 75) return "High Confidence";
  if (score >= 45) return "Moderate Confidence";
  return "Limited Data";
}

function calculateDataConfidence(input: OpportunitySignalInput) {
  const signals = [
    hasText(input.rosterNeedLevel),
    hasText(input.rosterTurnoverLevel),
    hasText(input.recruitingAggressiveness),
    hasText(input.regionalRecruitingBias),
    hasNumber(input.currentRosterSize),
    hasNumber(input.headCoachTenureYears),
    decimalToNumber(input.recentWinPercentage) != null,

    hasNumber(input.graduatingSeniors),
    hasNumber(input.graduatingPitchers),
    hasNumber(input.graduatingCatchers),
    hasNumber(input.graduatingInfielders),
    hasNumber(input.graduatingOutfielders),
    hasNumber(input.returningPitchers),
    hasNumber(input.returningPositionPlayers),
    hasNumber(input.rosterFreshmen),
    hasNumber(input.rosterSophomores),
    hasNumber(input.rosterJuniors),
    hasNumber(input.rosterSeniors),
    hasNumber(input.portalTransfersIn),
    hasNumber(input.portalTransfersOut),

    typeof input.transferHeavy === "boolean",
    typeof input.jucoFriendly === "boolean",
  ];

  const availableSignals = signals.filter(Boolean).length;
  const confidenceScore = clampScore((availableSignals / signals.length) * 100);
  const label = getConfidenceLabel(confidenceScore);

  return {
    score: confidenceScore,
    label,
    explanation:
      label === "High Confidence"
        ? "This Opportunity Index is based on a strong set of available roster and program intelligence signals."
        : label === "Moderate Confidence"
        ? "This Opportunity Index is based on some available roster and program intelligence, but additional school-side data would improve accuracy."
        : "This Opportunity Index is using limited school-side data, so treat it as an early directional signal rather than a complete recruiting read.",
  };
}

export function calculateOpportunityScore(
  input: OpportunitySignalInput
): OpportunityScoreResult {
  let score = 50;
  const reasons: string[] = [];

  const needLevel = normalizeText(input.rosterNeedLevel);
  const turnoverLevel = normalizeText(input.rosterTurnoverLevel);
  const aggressiveness = normalizeText(input.recruitingAggressiveness);
  const regionalBias = normalizeText(input.regionalRecruitingBias);

  const graduatingSeniors = numberOrZero(input.graduatingSeniors);
  const graduatingPitchers = numberOrZero(input.graduatingPitchers);
  const graduatingCatchers = numberOrZero(input.graduatingCatchers);
  const graduatingInfielders = numberOrZero(input.graduatingInfielders);
  const graduatingOutfielders = numberOrZero(input.graduatingOutfielders);
  const returningPitchers = numberOrZero(input.returningPitchers);
  const returningPositionPlayers = numberOrZero(input.returningPositionPlayers);
  const rosterFreshmen = numberOrZero(input.rosterFreshmen);
  const rosterSophomores = numberOrZero(input.rosterSophomores);
  const rosterJuniors = numberOrZero(input.rosterJuniors);
  const rosterSeniors = numberOrZero(input.rosterSeniors);
  const portalTransfersIn = numberOrZero(input.portalTransfersIn);
  const portalTransfersOut = numberOrZero(input.portalTransfersOut);

  if (needLevel === "high") {
    score += 22;
    reasons.push("High positional need");
  } else if (needLevel === "medium") {
    score += 12;
    reasons.push("Some roster need");
  } else if (needLevel === "low") {
    score -= 12;
    reasons.push("Limited roster need");
  }

  if (graduatingSeniors >= 8) {
    score += 12;
    reasons.push("Large senior class leaving");
  } else if (graduatingSeniors >= 4) {
    score += 7;
    reasons.push("Several seniors leaving");
  }

  if (graduatingPitchers >= 4) {
    score += 8;
    reasons.push("Pitching staff openings likely");
  } else if (graduatingPitchers >= 2) {
    score += 4;
    reasons.push("Some pitching turnover");
  }

  if (graduatingCatchers >= 2) {
    score += 6;
    reasons.push("Catcher depth may open");
  }

  if (graduatingInfielders >= 3) {
    score += 6;
    reasons.push("Infield roster openings likely");
  } else if (graduatingInfielders >= 1) {
    score += 3;
    reasons.push("Some infield turnover");
  }

  if (graduatingOutfielders >= 3) {
    score += 6;
    reasons.push("Outfield roster openings likely");
  } else if (graduatingOutfielders >= 1) {
    score += 3;
    reasons.push("Some outfield turnover");
  }

  if (portalTransfersOut >= 4) {
    score += 8;
    reasons.push("Transfer exits may create openings");
  } else if (portalTransfersOut >= 2) {
    score += 4;
    reasons.push("Some transfer movement out");
  }

  if (portalTransfersIn >= 5) {
    score -= 6;
    reasons.push("Transfer additions may increase competition");
  } else if (portalTransfersIn >= 3) {
    score -= 3;
    reasons.push("Some transfer additions on roster");
  }

  if (turnoverLevel === "high") {
    score += 14;
    reasons.push("High roster turnover");
  } else if (turnoverLevel === "medium") {
    score += 7;
    reasons.push("Moderate roster turnover");
  } else if (turnoverLevel === "low") {
    score -= 5;
    reasons.push("Stable roster");
  }

  if (aggressiveness === "high") {
    score += 10;
    reasons.push("Aggressive recruiting profile");
  } else if (aggressiveness === "medium") {
    score += 5;
    reasons.push("Active recruiting profile");
  } else if (aggressiveness === "low") {
    score -= 5;
    reasons.push("Less aggressive recruiting profile");
  }

  if (input.transferHeavy) {
    score += 5;
    reasons.push("Transfer-heavy roster history");
  }

  if (input.jucoFriendly) {
    score += 5;
    reasons.push("JUCO-friendly program profile");
  }

  if (regionalBias === "strong" || regionalBias === "regional") {
    score += 5;
    reasons.push("Regional recruiting fit");
  } else if (regionalBias === "national") {
    score += 2;
    reasons.push("Broader recruiting footprint");
  }

  if (typeof input.currentRosterSize === "number") {
    if (input.currentRosterSize < 28) {
      score += 6;
      reasons.push("Smaller roster may create opportunity");
    } else if (input.currentRosterSize > 45) {
      score -= 6;
      reasons.push("Larger roster may increase competition");
    }
  }

  if (returningPitchers >= 18) {
    score -= 5;
    reasons.push("Returning pitching depth may limit openings");
  }

  if (returningPositionPlayers >= 24) {
    score -= 5;
    reasons.push("Returning position-player depth may limit openings");
  }

  if (rosterSeniors >= 8 || rosterJuniors + rosterSeniors >= 18) {
    score += 4;
    reasons.push("Upperclass-heavy roster cycle");
  }

  if (rosterFreshmen + rosterSophomores >= 24) {
    score -= 4;
    reasons.push("Young roster may reduce near-term openings");
  }

  if (typeof input.headCoachTenureYears === "number") {
    if (input.headCoachTenureYears <= 2) {
      score += 4;
      reasons.push("Newer staff may be reshaping roster");
    } else if (input.headCoachTenureYears >= 8) {
      score += 2;
      reasons.push("Established staff profile");
    }
  }

  const winPct = decimalToNumber(input.recentWinPercentage);

  if (winPct != null) {
    if (winPct < 40) {
      score += 4;
      reasons.push("Program may be looking to improve quickly");
    } else if (winPct >= 65) {
      score -= 3;
      reasons.push("Winning program may have higher competition");
    }
  }

  const finalScore = clampScore(score);

  return {
    score: finalScore,
    label: getOpportunityLabel(finalScore),
    confidence: calculateDataConfidence(input),
    reasons: reasons.slice(0, 4),
  };
}