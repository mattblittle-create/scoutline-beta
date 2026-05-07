// scripts/enrich-college-data.ts

import "dotenv/config";
import fs from "fs";
import path from "path";

const DEFAULT_CSV_PATH = path.join(
  process.cwd(),
  "data",
  "college-baseball-programs.csv"
);

function getArgValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function resolveCsvPath(): string {
  const fileArg = getArgValue("--file");

  if (!fileArg) return DEFAULT_CSV_PATH;

  return path.isAbsolute(fileArg)
    ? fileArg
    : path.join(process.cwd(), fileArg);
}

const API_KEY = process.env.COLLEGE_SCORECARD_API_KEY || "";
const SCORECARD_BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools";

type Row = Record<string, string>;

const FIELDS = [
  "id",
  "school.name",
  "school.city",
  "school.state",
  "latest.cost.tuition.in_state",
  "latest.cost.tuition.out_of_state",
  "latest.admissions.admission_rate.overall",
  "latest.completion.completion_rate_4yr_150nt",
  "latest.student.size",
];

const SCORECARD_NAME_ALIASES: Record<string, string> = {
  "University of California Berkeley": "University of California-Berkeley",
  "Virginia Tech": "Virginia Polytechnic Institute and State University",
  UCLA: "University of California-Los Angeles",
  BYU: "Brigham Young University",
  TCU: "Texas Christian University",
  UCF: "University of Central Florida",
  "Fresno State": "California State University-Fresno",
  "University of Massachusetts Amherst": "University of Massachusetts-Amherst",
  "UNC Asheville": "University of North Carolina Asheville",
  "USC Upstate": "University of South Carolina-Upstate",
  "North Carolina A&T State University": "North Carolina A & T State University",
  "UNC Wilmington": "University of North Carolina Wilmington",
  "University of Wisconsin Milwaukee": "University of Wisconsin-Milwaukee",
  "University of Nevada Las Vegas": "University of Nevada-Las Vegas",
  "University of Nevada Reno": "University of Nevada-Reno",
  LIU: "Long Island University",
  "University of Tennessee at Martin": "The University of Tennessee-Martin",
  "Army West Point": "United States Military Academy",
  "The Citadel": "Citadel Military College of South Carolina",
  "Texas A&M University Corpus Christi": "Texas A & M University-Corpus Christi",
  "University of Louisiana Monroe": "University of Louisiana at Monroe",
  "Alabama A&M University": "Alabama A & M University",
  "Florida A&M University": "Florida Agricultural and Mechanical University",
  "Prairie View A&M University": "Prairie View A & M University",
  "Southern University and A&M College": "Southern University and A & M College",
  "University of Texas Arlington": "The University of Texas at Arlington",
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      out.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  out.push(current);
  return out;
}

function escapeCsv(value: unknown): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\bthe\b/g, "")
    .replace(/\buniversity\b/g, "")
    .replace(/\bcollege\b/g, "")
    .replace(/\binstitute\b/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function scoreMatch(row: Row, school: any): number {
  const displayName = row.name || "";
  const aliasName = SCORECARD_NAME_ALIASES[displayName] || displayName;

  const rowName = normalizeName(displayName);
  const aliasNormalized = normalizeName(aliasName);
  const apiName = normalizeName(school["school.name"] || "");

  let score = 0;

  if (rowName && apiName && rowName === apiName) score += 100;
  if (aliasNormalized && apiName && aliasNormalized === apiName) score += 100;

  if (
    rowName &&
    apiName &&
    (rowName.includes(apiName) || apiName.includes(rowName))
  ) {
    score += 50;
  }

  if (
    aliasNormalized &&
    apiName &&
    (aliasNormalized.includes(apiName) || apiName.includes(aliasNormalized))
  ) {
    score += 50;
  }

  if (clean(row.state).toUpperCase() === clean(school["school.state"]).toUpperCase()) {
    score += 25;
  }

  return score;
}

async function fetchScorecardMatch(row: Row): Promise<any | null> {
  if (!API_KEY) {
    throw new Error("Missing COLLEGE_SCORECARD_API_KEY in .env.local");
  }

  const searchName = SCORECARD_NAME_ALIASES[row.name] || row.name;

  const params = new URLSearchParams({
    api_key: API_KEY,
    "school.name": searchName,
    "school.state": row.state,
    fields: FIELDS.join(","),
    per_page: "10",
  });

  let res = await fetch(`${SCORECARD_BASE_URL}?${params.toString()}`);
  let data = await res.json();

  let results = Array.isArray(data?.results) ? data.results : [];

  if (!results.length) {
  const fallbackParams = new URLSearchParams({
    api_key: API_KEY,
    search: searchName,
    fields: FIELDS.join(","),
    per_page: "10",
  });

    res = await fetch(`${SCORECARD_BASE_URL}?${fallbackParams.toString()}`);
    data = await res.json();
    results = Array.isArray(data?.results) ? data.results : [];
  }

  const ranked = results
    .map((school: any) => ({ school, score: scoreMatch(row, school) }))
    .sort((a: any, b: any) => b.score - a.score);

  const best = ranked[0];

  if (!best || best.score < 50) return null;

  return best.school;
}

async function main() {
const csvPath = resolveCsvPath();

if (!fs.existsSync(csvPath)) {
  throw new Error(`CSV not found at ${csvPath}`);
}

console.log(`Using CSV: ${csvPath}`);

const raw = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  const headers = parseCsvLine(lines[0]);
  const rows: Row[] = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const match = await fetchScorecardMatch(row);

      if (!match) {
        skipped++;
        console.log(`SKIP: ${row.name} — no confident Scorecard match`);
        continue;
      }

      const tuitionInState = toNumber(match["latest.cost.tuition.in_state"]);
      const tuitionOutOfState = toNumber(match["latest.cost.tuition.out_of_state"]);
      const acceptanceRate = toNumber(match["latest.admissions.admission_rate.overall"]);
      const graduationRate = toNumber(match["latest.completion.completion_rate_4yr_150nt"]);
      const enrollmentUndergrad = toNumber(match["latest.student.size"]);

      if (!row.tuitionInState && tuitionInState != null) row.tuitionInState = String(Math.round(tuitionInState));
      if (!row.tuitionOutOfState && tuitionOutOfState != null) row.tuitionOutOfState = String(Math.round(tuitionOutOfState));

      // International tuition is rarely standardized in Scorecard.
      // Use out-of-state as a safe placeholder ONLY if international is blank.
      if (!row.tuitionInternational && tuitionOutOfState != null) {
        row.tuitionInternational = String(Math.round(tuitionOutOfState));
      }

      if (!row.acceptanceRate && acceptanceRate != null) row.acceptanceRate = String(acceptanceRate);
      if (!row.graduationRate && graduationRate != null) row.graduationRate = String(graduationRate);

      if (!row.enrollmentUndergrad && enrollmentUndergrad != null) {
        row.enrollmentUndergrad = String(Math.round(enrollmentUndergrad));
      }

      if (!row.enrollmentTotal && enrollmentUndergrad != null) {
        row.enrollmentTotal = String(Math.round(enrollmentUndergrad));
      }

      row.dataSourceUrl = "https://collegescorecard.ed.gov/";
      row.verificationStatus = "NEEDS_REVIEW";

      updated++;
      console.log(`UPDATED: ${row.name}`);
    } catch (err) {
      failed++;
      console.error(`FAILED: ${row.name}`, err);
    }
  }

  const output = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(",")),
  ].join("\n");

  fs.writeFileSync(csvPath, output, "utf8");

  console.log("");
  console.log(`Done. Updated ${updated}; skipped ${skipped}; failed ${failed}.`);
}

main().catch((err) => {
  console.error("ENRICH_COLLEGE_DATA_ERROR", err);
  process.exit(1);
});