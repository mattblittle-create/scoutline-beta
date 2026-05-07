// scripts/build-ncaa-d3-baseball-csv.ts

import fs from "fs";
import path from "path";

const SOURCE_URL = "https://www.thebaseballcube.com/content/schools/NCAA-3/";
const OUTPUT_PATH = path.join(process.cwd(), "data", "ncaa-d3-baseball-programs.csv");

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
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
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
    .replace(/[–—]/g, "-")
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

function stateAbbreviation(value: string): string {
  const map: Record<string, string> = {
    Alabama: "AL",
    Alaska: "AK",
    Arizona: "AZ",
    Arkansas: "AR",
    California: "CA",
    Colorado: "CO",
    Connecticut: "CT",
    Delaware: "DE",
    Florida: "FL",
    Georgia: "GA",
    Hawaii: "HI",
    Idaho: "ID",
    Illinois: "IL",
    Indiana: "IN",
    Iowa: "IA",
    Kansas: "KS",
    Kentucky: "KY",
    Louisiana: "LA",
    Maine: "ME",
    Maryland: "MD",
    Massachusetts: "MA",
    Michigan: "MI",
    Minnesota: "MN",
    Mississippi: "MS",
    Missouri: "MO",
    Montana: "MT",
    Nebraska: "NE",
    Nevada: "NV",
    "New Hampshire": "NH",
    "New Jersey": "NJ",
    "New Mexico": "NM",
    "New York": "NY",
    "North Carolina": "NC",
    "North Dakota": "ND",
    Ohio: "OH",
    Oklahoma: "OK",
    Oregon: "OR",
    Pennsylvania: "PA",
    "Rhode Island": "RI",
    "South Carolina": "SC",
    "South Dakota": "SD",
    Tennessee: "TN",
    Texas: "TX",
    Utah: "UT",
    Vermont: "VT",
    Virginia: "VA",
    Washington: "WA",
    "West Virginia": "WV",
    Wisconsin: "WI",
    Wyoming: "WY",
    "District of Columbia": "DC",
  };

  return map[value] || value;
}

function parseLocation(value: string): { city: string; state: string } {
  const parts = value.split(",").map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return {
      city: parts[0],
      state: stateAbbreviation(parts[1]),
    };
  }

  return {
    city: "",
    state: "",
  };
}

function parseTableRows(html: string): string[][] {
  const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];

  const bestTable =
    tableMatches.find((table) => {
      const text = stripHtml(table).toLowerCase();
      return (
        text.includes("school") &&
        text.includes("conference") &&
        text.includes("nickname")
      );
    }) || tableMatches[0];

  if (!bestTable) {
    throw new Error("Could not find NCAA D3 school table.");
  }

  const rowMatches = bestTable.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];

  return rowMatches
    .map((rowHtml) => {
      const cells = rowHtml.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) ?? [];
      return cells.map(stripHtml).filter(Boolean);
    })
    .filter((row) => row.length >= 4);
}

function normalizeRows(rows: string[][]) {
  const output = [];

  for (const values of rows) {
    const joined = values.join(" ").toLowerCase();

    if (
      joined.includes("school listing") ||
      joined.includes("nickname") ||
      joined.includes("conference")
    ) {
      continue;
    }

    // Expected TBC-ish order:
    // display school, nickname, conference, city, state, canonical school, year
    const [displayName, nickname, conference, cityOrLocation, stateMaybe, canonicalName, yearMaybe] =
      values;

    const year = values.find((v) => /^20\d{2}$/.test(v)) || yearMaybe || "2026";

    let city = cityOrLocation || "";
    let state = stateMaybe || "";

    if (cityOrLocation?.includes(",")) {
      const parsed = parseLocation(cityOrLocation);
      city = parsed.city;
      state = parsed.state;
    } else {
      state = stateAbbreviation(state);
    }

    const name = canonicalName && !/^20\d{2}$/.test(canonicalName) ? canonicalName : displayName;

    if (!name || !conference || !city || !state) continue;

    output.push({
      name,
      slug: slugify(name),
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
      tuitionYear: year,
      enrollmentTotal: "",
      enrollmentUndergrad: "",
      acceptanceRate: "",
      graduationRate: "",
      dataSourceUrl: "https://collegescorecard.ed.gov/",
      verificationStatus: "NEEDS_REVIEW",
      baseballNickname: nickname || "",
      baseballWebsiteUrl: "",
      rosterUrl: "",
      scheduleUrl: "",
      campsUrl: "",
      questionnaireUrl: "",
      generalContactUrl: "",
      generalContactEmail: "",
      division: "NCAA_D3",
      conference,
      logoUrl: "",
      currentRosterSize: "",
      averageGpa: "",
      scholarshipNotes:
        "NCAA Division III programs do not award athletic scholarships, but student-athletes may receive academic, need-based, and other non-athletic aid.",
      scholarshipInfoUrl: "https://www.ncaa.org/sports/2014/10/6/division-iii.aspx",
      transferHeavy: "false",
      jucoFriendly: "false",
      baseballDataSourceUrl: SOURCE_URL,
      baseballVerificationStatus: "NEEDS_REVIEW",
    });
  }

  const bySlug = new Map<string, (typeof output)[number]>();

  for (const row of output) {
    bySlug.set(row.slug, row);
  }

  return Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function main() {
  const res = await fetch(SOURCE_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 ScoutLine college baseball data enrichment script",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${res.status}`);
  }

  const html = await res.text();
  const parsedRows = parseTableRows(html);
  const rows = normalizeRows(parsedRows);

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
  console.error("BUILD_NCAA_D3_BASEBALL_CSV_ERROR", err);
  process.exit(1);
});