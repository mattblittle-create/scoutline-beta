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
};

export type OpportunityScoreResult = {
  score: number;
  label: "High Opportunity" | "Good Opportunity" | "Moderate Opportunity" | "Low Opportunity";
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

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getOpportunityLabel(score: number): OpportunityScoreResult["label"] {
  if (score >= 80) return "High Opportunity";
  if (score >= 65) return "Good Opportunity";
  if (score >= 45) return "Moderate Opportunity";
  return "Low Opportunity";
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
    reasons: reasons.slice(0, 4),
  };
}