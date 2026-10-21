// app/lib/college/programCompleteness.ts

export type ProgramCompletenessResult = {
  score: number;
  label: "Complete" | "Strong" | "Developing" | "Limited";
  completed: number;
  total: number;
  missing: string[];
};

function hasValue(value: any) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function calculateProgramCompleteness(college: any): ProgramCompletenessResult {
  const baseball = college?.baseballProgram || null;
  const nil = college?.nilProfile || null;

  const checks: Array<[string, boolean]> = [
    ["School website", hasValue(college?.websiteUrl)],
    ["Admissions link", hasValue(college?.admissionsUrl)],
    ["Majors / academics link", hasValue(college?.majorsUrl || college?.academicsUrl)],
    ["City / state", hasValue(college?.city) && hasValue(college?.state)],
    ["Region", hasValue(college?.region)],
    ["School type", hasValue(college?.control) || hasValue(college?.schoolType)],
    ["Tuition", hasValue(college?.tuitionInState) || hasValue(college?.tuitionOutOfState)],
    ["Enrollment", hasValue(college?.enrollmentTotal) || hasValue(college?.enrollmentUndergrad)],
    ["Academic areas", Array.isArray(college?.academicAreas) && college.academicAreas.length > 0],

    ["Baseball program", !!baseball],
    ["Division / conference", hasValue(baseball?.division) && hasValue(baseball?.conference)],
    ["Baseball website", hasValue(baseball?.baseballWebsiteUrl)],
    ["Roster link", hasValue(baseball?.rosterUrl)],
    ["Schedule link", hasValue(baseball?.scheduleUrl)],
    ["Questionnaire link", hasValue(baseball?.questionnaireUrl || college?.recruitingQuestionnaireUrl)],
    ["Coach contacts", Array.isArray(baseball?.coaches) && baseball.coaches.length > 0],
    ["Recruiting coordinator", hasValue(baseball?.recruitingCoordinatorName) || hasValue(baseball?.recruitingCoordinatorEmail)],
    ["Roster size", hasValue(baseball?.currentRosterSize)],
    ["Roster needs", Array.isArray(baseball?.rosterNeeds) && baseball.rosterNeeds.length > 0],
    ["Metric benchmarks", Array.isArray(baseball?.metricAverages) && baseball.metricAverages.length > 0],
    ["Transfer / JUCO signals", typeof baseball?.transferHeavy === "boolean" && typeof baseball?.jucoFriendly === "boolean"],
    ["Recruiting intelligence", hasValue(baseball?.recruitingAggressiveness) || hasValue(baseball?.regionalRecruitingBias) || hasValue(baseball?.rosterTurnoverLevel)],
    ["NIL profile", !!nil && (hasValue(nil?.baseballNilStrength) || hasValue(nil?.overallNilStrength) || hasValue(nil?.nilSummary))],
    ["Verified status", String(baseball?.verificationStatus || college?.verificationStatus || "").toUpperCase() === "VERIFIED"],
  ];

  const completed = checks.filter(([, ok]) => ok).length;
  const total = checks.length;
  const score = Math.round((completed / total) * 100);
  const missing = checks.filter(([, ok]) => !ok).map(([label]) => label);

  const label =
    score >= 90 ? "Complete" :
    score >= 75 ? "Strong" :
    score >= 50 ? "Developing" :
    "Limited";

  return { score, label, completed, total, missing };
}