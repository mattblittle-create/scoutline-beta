// lib/recommendations/recruitingStrategy.ts

type RecruitingStrategyInput = {
  matchScore?: number | null;
  opportunityScore?: number | null;
  archetype?: string | null;
  confidenceLabel?: string | null;
};

export type RecruitingStrategyResult = {
  category:
    | "Priority Target"
    | "Active Outreach"
    | "Summer Follow"
    | "Watch List"
    | "Long-Term Development Fit"
    | "Reach Opportunity";

  explanation: string;
};

export function buildRecruitingStrategy(
  input: RecruitingStrategyInput
): RecruitingStrategyResult {
  const matchScore = Number(input.matchScore ?? 0);
  const opportunityScore = Number(input.opportunityScore ?? 0);

  const confidence =
    input.confidenceLabel || "Limited Data";

  const archetype =
    input.archetype || "Emerging Recruiting Opportunity";

  // Elite realistic target
  if (
    matchScore >= 75 &&
    opportunityScore >= 75 &&
    confidence !== "Limited Data"
  ) {
    return {
      category: "Priority Target",
      explanation:
        "This program projects as one of the strongest overall recruiting opportunities based on fit, timing, and available program intelligence.",
    };
  }

  // Strong actionable target
  if (
    matchScore >= 65 &&
    opportunityScore >= 65
  ) {
    return {
      category: "Active Outreach",
      explanation:
        "This program currently shows enough fit and opportunity signals to justify active recruiting communication and continued exposure efforts.",
    };
  }

  // Long-term development
  if (
    archetype === "Developmental Long-Term Fit"
  ) {
    return {
      category: "Long-Term Development Fit",
      explanation:
        "This program may become a stronger recruiting fit over time as player development and future roster cycles evolve.",
    };
  }

  // Strong athlete fit but tougher path
  if (
    matchScore >= 70 &&
    opportunityScore < 55
  ) {
    return {
      category: "Reach Opportunity",
      explanation:
        "The athletic fit may be strong, but current roster and recruiting conditions suggest a more competitive recruiting pathway.",
    };
  }

  // Worth tracking
  if (
    opportunityScore >= 50 ||
    matchScore >= 55
  ) {
    return {
      category: "Summer Follow",
      explanation:
        "This program is worth continued monitoring through future development, updated metrics, and upcoming exposure opportunities.",
    };
  }

  return {
    category: "Watch List",
    explanation:
      "This program currently projects as more of a secondary or developing recruiting option, but it may still be valuable to monitor over time.",
  };
}