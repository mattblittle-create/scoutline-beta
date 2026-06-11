// lib/recommendations/opportunityScore.ts

type OpportunitySignalInput = {
  playerPrimaryPosition?: string | null;
  playerSecondaryPositions?: string[] | null;
  playerGradYear?: number | null;

  rosterNeedLevel?: string | null;
  rosterTurnoverLevel?: string | null;
  recruitingAggressiveness?: string | null;
  regionalRecruitingBias?: string | null;
  transferHeavy?: boolean | null;
  jucoFriendly?: boolean | null;
  currentRosterSize?: number | null;
  headCoachTenureYears?: number | null;
  recentWinPercentage?: unknown;
  academicMatchScore?: number | null;
  verifiedProgram?: boolean | null;
  nilStrength?: string | null;

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
  archetype:
    | "Strong Immediate Opportunity"
    | "Developmental Long-Term Fit"
    | "Regional Opportunity Match"
    | "High Competition Program"
    | "Emerging Recruiting Opportunity"
    | "Limited Data Opportunity";
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

function normalizePosition(value?: string | null) {
  return String(value || "")
    .trim()
    .toUpperCase();
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

function nilStrengthScore(value?: string | null) {
  const raw = normalizeText(value).replace(/_/g, " ");

  if (!raw || raw === "unknown") return 0;

  if (raw.includes("elite")) return 8;
  if (raw.includes("strong")) return 5;
  if (raw.includes("moderate")) return 3;
  if (raw.includes("limited")) return -2;

  return 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getCurrentRecruitingYear() {
  return new Date().getFullYear();
}

function getGradYearWindow(playerGradYear?: number | null) {
  const gradYear = hasNumber(playerGradYear) ? playerGradYear : null;

  if (gradYear == null) {
    return "unknown";
  }

  const yearsOut = gradYear - getCurrentRecruitingYear();

  if (yearsOut <= 0) return "immediate";
  if (yearsOut === 1) return "near";
  if (yearsOut === 2) return "next";
  return "future";
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

function getOpportunityArchetype(params: {
  score: number;
  confidenceLabel: OpportunityScoreResult["confidence"]["label"];
  gradYearWindow: "immediate" | "near" | "next" | "future" | "unknown";
  regionalBias: string;
  currentRosterSize?: number | null;
  portalTransfersIn: number;
  returningPitchers: number;
  returningPositionPlayers: number;
}): OpportunityScoreResult["archetype"] {
  if (params.confidenceLabel === "Limited Data") {
    return "Limited Data Opportunity";
  }

  if (
    params.score >= 75 &&
    (params.gradYearWindow === "immediate" || params.gradYearWindow === "near")
  ) {
    return "Strong Immediate Opportunity";
  }

  if (
    params.score >= 60 &&
    (params.gradYearWindow === "next" || params.gradYearWindow === "future")
  ) {
    return "Developmental Long-Term Fit";
  }

  if (
    params.score >= 60 &&
    (params.regionalBias === "strong" || params.regionalBias === "regional")
  ) {
    return "Regional Opportunity Match";
  }

  if (
    params.score < 55 &&
    ((typeof params.currentRosterSize === "number" &&
      params.currentRosterSize > 45) ||
      params.portalTransfersIn >= 3 ||
      params.returningPitchers >= 18 ||
      params.returningPositionPlayers >= 24)
  ) {
    return "High Competition Program";
  }

  return "Emerging Recruiting Opportunity";
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
    hasNumber(input.academicMatchScore),
      typeof input.verifiedProgram === "boolean",
      hasText(input.nilStrength),

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

  const gradYearWindow = getGradYearWindow(input.playerGradYear);

  const primaryPosition = normalizePosition(input.playerPrimaryPosition);

  const secondaryPositions = Array.isArray(input.playerSecondaryPositions)
    ? input.playerSecondaryPositions.map(normalizePosition)
    : [];

  const isPitcher =
    primaryPosition === "P" ||
    primaryPosition === "RHP" ||
    primaryPosition === "LHP";

  const isCatcher = primaryPosition === "C";

  const isInfielder =
    ["1B", "2B", "3B", "SS", "IF"].includes(primaryPosition) ||
    secondaryPositions.some((p) =>
      ["1B", "2B", "3B", "SS", "IF"].includes(p)
    );

  const isOutfielder =
    ["OF", "LF", "CF", "RF"].includes(primaryPosition) ||
    secondaryPositions.some((p) =>
      ["OF", "LF", "CF", "RF"].includes(p)
    );

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
    if (gradYearWindow === "immediate" || gradYearWindow === "near") {
      score += 14;
      reasons.push("Large senior class aligns with player's recruiting window");
    } else if (gradYearWindow === "next") {
      score += 9;
      reasons.push("Large senior class may shape future roster needs");
    } else {
      score += 6;
      reasons.push("Large senior class leaving");
    }
  } else if (graduatingSeniors >= 4) {
    if (gradYearWindow === "immediate" || gradYearWindow === "near") {
      score += 8;
      reasons.push("Senior class turnover aligns with player's recruiting window");
    } else {
      score += 5;
      reasons.push("Several seniors leaving");
    }
  }

  if (graduatingPitchers >= 4) {
    score += isPitcher ? 14 : 8;
    reasons.push(
      isPitcher
        ? "Pitching staff openings strongly align with player position"
        : "Pitching staff openings likely"
    );
  } else if (graduatingPitchers >= 2) {
    score += isPitcher ? 8 : 4;
    reasons.push(
      isPitcher
        ? "Some pitching turnover aligns with player position"
        : "Some pitching turnover"
    );
  }

  if (graduatingCatchers >= 2) {
    score += isCatcher ? 12 : 6;
    reasons.push(
      isCatcher
        ? "Catcher openings strongly align with player position"
        : "Catcher depth may open"
    );
  }

  if (graduatingInfielders >= 3) {
    score += isInfielder ? 12 : 6;
    reasons.push(
      isInfielder
        ? "Infield openings strongly align with player position"
        : "Infield roster openings likely"
    );
  } else if (graduatingInfielders >= 1) {
    score += isInfielder ? 6 : 3;
    reasons.push(
      isInfielder
        ? "Some infield turnover aligns with player position"
        : "Some infield turnover"
    );
  }

  if (graduatingOutfielders >= 3) {
    score += isOutfielder ? 12 : 6;
    reasons.push(
      isOutfielder
        ? "Outfield openings strongly align with player position"
        : "Outfield roster openings likely"
    );
  } else if (graduatingOutfielders >= 1) {
    score += isOutfielder ? 6 : 3;
    reasons.push(
      isOutfielder
        ? "Some outfield turnover aligns with player position"
        : "Some outfield turnover"
    );
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

  if (typeof input.academicMatchScore === "number") {
  if (input.academicMatchScore >= 90) {
    score += 7;
    reasons.push("Strong academic match");
  } else if (input.academicMatchScore >= 50) {
    score += 4;
    reasons.push("Partial academic match");
  } else if (input.academicMatchScore > 0) {
    score += 1;
    reasons.push("Limited academic match");
  }
}

if (input.verifiedProgram) {
  score += 4;
  reasons.push("Verified program data");
}

const nilBonus = nilStrengthScore(input.nilStrength);

if (nilBonus > 0) {
  score += nilBonus;
  reasons.push(`${String(input.nilStrength).replace(/_/g, " ")} NIL signal`);
} else if (nilBonus < 0) {
  score += nilBonus;
  reasons.push("Limited NIL signal");
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
    if (gradYearWindow === "immediate" || gradYearWindow === "near") {
      score -= 6;
      reasons.push("Young roster may reduce near-term openings");
    } else if (gradYearWindow === "future") {
      score += 2;
      reasons.push("Young roster may mature near player's future recruiting window");
    } else {
      score -= 4;
      reasons.push("Young roster may reduce near-term openings");
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
  const confidence = calculateDataConfidence(input);

  return {
    score: finalScore,
    label: getOpportunityLabel(finalScore),
    archetype: getOpportunityArchetype({
      score: finalScore,
      confidenceLabel: confidence.label,
      gradYearWindow,
      regionalBias,
      currentRosterSize: input.currentRosterSize,
      portalTransfersIn,
      returningPitchers,
      returningPositionPlayers,
    }),
    confidence,
    reasons: reasons.slice(0, 4),
  };
}