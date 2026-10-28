// lib/recommendations/ranking.ts

export type RecommendationRankingInput = {
  name?: string | null;
  recommendedDivisionRank?: number | null;
  truthFitScore?: number | null;
  distanceMiles?: number | null;
};

function distanceScore(miles: number | null | undefined): number {
  if (miles == null) return 0;

  if (miles <= 50) return 100;
  if (miles <= 150) return 85;
  if (miles <= 300) return 70;
  if (miles <= 600) return 50;
  if (miles <= 1000) return 30;

  return 10;
}

export function getRecommendationSortScore(item: RecommendationRankingInput) {
  const division = item.recommendedDivisionRank ?? 0;
  const truthFit = item.truthFitScore ?? 0;
  const geo = distanceScore(item.distanceMiles);

  return division * 10000 + truthFit * 100 + geo;
}

export function compareRecommendations(
  a: RecommendationRankingInput,
  b: RecommendationRankingInput
) {
  const scoreDiff =
    getRecommendationSortScore(b) - getRecommendationSortScore(a);

  if (scoreDiff !== 0) return scoreDiff;

  return String(a.name || "").localeCompare(String(b.name || ""));
}