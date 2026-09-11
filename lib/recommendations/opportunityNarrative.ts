// lib/recommendations/opportunityNarrative.ts

type OpportunityNarrativeInput = {
  score?: number | null;
  label?: string | null;
  archetype?: string | null;
  confidenceLabel?: string | null;
  reasons?: string[] | null;
  collegeName?: string | null;
};

export type OpportunityNarrativeResult = {
  headline: string;
  summary: string;
  strategy: string;
};

export function buildOpportunityNarrative(
  input: OpportunityNarrativeInput
): OpportunityNarrativeResult {
  const score = Number(input.score ?? 0);
  const archetype = input.archetype || "Emerging Recruiting Opportunity";
  const confidenceLabel = input.confidenceLabel || "Limited Data";
  const reasons = Array.isArray(input.reasons) ? input.reasons : [];
  const school = input.collegeName || "this program";

  const signalText = reasons.length
    ? reasons.slice(0, 3).join(", ").toLowerCase()
    : "available roster and program signals";

  if (archetype === "Strong Immediate Opportunity") {
    return {
      headline: "Why this program stands out",
      summary: `${school} shows strong near-term recruiting opportunity signals, especially around ${signalText}.`,
      strategy:
        "Prioritize this program for active outreach, updated video, and direct coach communication.",
    };
  }

  if (archetype === "Developmental Long-Term Fit") {
    return {
      headline: "Why this program is worth tracking",
      summary: `${school} may line up better as a longer-term recruiting fit, especially as the player develops and the roster cycle matures.`,
      strategy:
        "Track this program over time and revisit after the next major development window or summer circuit.",
    };
  }

  if (archetype === "Regional Opportunity Match") {
    return {
      headline: "Why this regional fit matters",
      summary: `${school} shows useful regional opportunity signals, with ${signalText} supporting its place on the board.`,
      strategy:
        "Keep this program in the active target group, especially if the player prefers staying within this region.",
    };
  }

  if (archetype === "High Competition Program") {
    return {
      headline: "Why this may be a tougher path",
      summary: `${school} may have a more competitive roster path right now, based on ${signalText}.`,
      strategy:
        "Treat this as a selective target. Keep it on the board, but balance it with higher-opportunity programs.",
    };
  }

  if (archetype === "Limited Data Opportunity" || confidenceLabel === "Limited Data") {
    return {
      headline: "Why this is still developing",
      summary: `${school} has limited available program intelligence, so the current opportunity read should be treated as directional.`,
      strategy:
        "Monitor this program while more roster, recruiting, and academic data is added.",
    };
  }

  if (score >= 65) {
    return {
      headline: "Why this program deserves attention",
      summary: `${school} shows several useful recruiting opportunity signals, including ${signalText}.`,
      strategy:
        "Keep this program in the priority mix and use continued development updates to test coach interest.",
    };
  }

  return {
    headline: "Why this program is on the watch list",
    summary: `${school} may still be worth tracking, but the current opportunity signals are mixed or incomplete.`,
    strategy:
      "Use this as a watch-list program while prioritizing schools with stronger match and opportunity signals.",
  };
}