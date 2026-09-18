// lib/recommendations/intendedMajorFit.ts

export type IntendedMajorFitResult = {
  status: "available" | "possible" | "unknown" | "not_available";
  label: "Major Available" | "Possible Major Fit" | "Major Fit Unknown" | "Major Not Found";
  scoreImpact: number;
  reasons: string[];
};

export function calculateIntendedMajorFit(): IntendedMajorFitResult {
  return {
    status: "unknown",
    label: "Major Fit Unknown",
    scoreImpact: 0,
    reasons: [
      "Major fit is unknown until college academic area data and player intended majors are fully populated.",
    ],
  };
}