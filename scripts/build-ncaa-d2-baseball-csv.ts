// scripts/build-ncaa-d2-baseball-csv.ts

import fs from "fs";
import path from "path";

const SOURCE_URL = "https://en.wikipedia.org/wiki/List_of_NCAA_Division_II_baseball_programs";
const OUTPUT_PATH = path.join(process.cwd(), "data", "ncaa-d2-baseball-programs.csv");

const HEADERS = [
  "name",
  "slug",
  "city",
  "state",
  "region",
  "control",
  "schoolType",
  "websiteUrl",
  "admissionsUrl",
  "academicsUrl",
  "majorsUrl",
  "applicationUrl",
  "financialAidUrl",
  "tuitionInState",
  "tuitionOutOfState",
  "tuitionInternational",
  "tuitionYear",
  "enrollmentTotal",
  "enrollmentUndergrad",
  "acceptanceRate",
  "graduationRate",
  "dataSourceUrl",
  "verificationStatus",
  "baseballNickname",
  "baseballWebsiteUrl",
  "rosterUrl",
  "scheduleUrl",
  "campsUrl",
  "questionnaireUrl",
  "generalContactUrl",
  "generalContactEmail",
  "division",
  "conference",
  "logoUrl",
  "currentRosterSize",
  "averageGpa",
  "scholarshipNotes",
  "scholarshipInfoUrl",
  "transferHeavy",
  "jucoFriendly",
  "baseballDataSourceUrl",
  "baseballVerificationStatus",
];

function stripHtml(value: string): string {
  return value
    .replace(/<sup[\s\S]*?<\/sup>/gi, "")
    .replace(/<span[\s\S]*?<\/span>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeCsv(value: unknown): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function extractRows(html: string) {
  const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];

  const tableHtml = tableMatches.find((table) => {
    const text = stripHtml(table).toLowerCase();
    return (
      text.includes("team") &&
      text.includes("nickname") &&
      text.includes("city") &&
      text.includes("state") &&
      text.includes("conference")
    );
  });

  if (!tableHtml) {
    throw new Error("Could not find D2 programs table.");
  }

  const rowMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];

  const rows = [];

  for (const rowHtml of rowMatches) {
    const cells = rowHtml.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) ?? [];
    const values = cells.map(stripHtml);

    if (values.length < 5) continue;

    const firstCell = values[0].toLowerCase();
    if (firstCell === "team") continue;

    const [team, nickname, city, state, conference] = values;

    if (!team || !nickname || !city || !state || !conference) continue;

    rows.push({
      name: team,
      slug: slugify(team),
      city,
      state,
      region: "",
      control: "",
      schoolType: "FOUR_YEAR",
      websiteUrl: "",
      admissionsUrl: "",
      academicsUrl: "",
      majorsUrl: "",
      applicationUrl: "",
      financialAidUrl: "",
      tuitionInState: "",
      tuitionOutOfState: "",
      tuitionInternational: "",
      tuitionYear: "2026",
      enrollmentTotal: "",
      enrollmentUndergrad: "",
      acceptanceRate: "",
      graduationRate: "",
      dataSourceUrl: "https://collegescorecard.ed.gov/",
      verificationStatus: "NEEDS_REVIEW",
      baseballNickname: nickname,
      baseballWebsiteUrl: "",
      rosterUrl: "",
      scheduleUrl: "",
      campsUrl: "",
      questionnaireUrl: "",
      generalContactUrl: "",
      generalContactEmail: "",
      division: "NCAA_D2",
      conference,
      logoUrl: "",
      currentRosterSize: "",
      averageGpa: "",
      scholarshipNotes:
        "NCAA Division II baseball programs may offer athletic scholarships, subject to NCAA and school-specific limits.",
      scholarshipInfoUrl: "https://www.ncaa.org/sports/2014/10/6/division-ii.aspx",
      transferHeavy: "false",
      jucoFriendly: "false",
      baseballDataSourceUrl: SOURCE_URL,
      baseballVerificationStatus: "NEEDS_REVIEW",
    });
  }

  return rows;
}

async function main() {
  const res = await fetch(SOURCE_URL);

  if (!res.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${res.status}`);
  }

  const html = await res.text();
  const rows = extractRows(html);

  const csv = [
    HEADERS.join(","),
    ...rows.map((row) =>
      HEADERS.map((header) => escapeCsv((row as Record<string, string>)[header])).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(OUTPUT_PATH, csv, "utf8");

  console.log(`Created ${OUTPUT_PATH}`);
  console.log(`Rows: ${rows.length}`);
}

main().catch((err) => {
  console.error("BUILD_NCAA_D2_BASEBALL_CSV_ERROR", err);
  process.exit(1);
});