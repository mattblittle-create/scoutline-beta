// scripts/build-naia-baseball-csv.ts

import fs from "fs";
import path from "path";

const SOURCE_URL = "https://naiastats.prestosports.com/sports/bsb/2024-25/teams";
const OUTPUT_PATH = path.join(process.cwd(), "data", "naia-baseball-programs.csv");

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

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
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

function absolutizeUrl(href: string): string {
  const s = clean(href);
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return `https://naiastats.prestosports.com${s}`;
  return `https://naiastats.prestosports.com/sports/bsb/2024-25/${s}`;
}

function extractTeamLinks(html: string) {
  const links = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];

  const teams = links
    .map((match) => {
      const href = clean(match[1]);
      const label = stripHtml(match[2]);

      return {
        name: label,
        baseballWebsiteUrl: absolutizeUrl(href),
      };
    })
    .filter((team) => {
      return (
        team.name.length > 1 &&
        team.baseballWebsiteUrl.includes("/sports/bsb/2024-25/teams/") &&
        !team.baseballWebsiteUrl.includes("?") &&
        !team.baseballWebsiteUrl.includes("#")
      );
    });

  const bySlug = new Map<string, (typeof teams)[number]>();

  for (const team of teams) {
    bySlug.set(slugify(team.name), team);
  }

  return Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function main() {
  const res = await fetch(SOURCE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 ScoutLine NAIA baseball importer",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch NAIA baseball teams: ${res.status}`);
  }

  const html = await res.text();
  const teams = extractTeamLinks(html);

  const rows = teams.map((team) => {
    const name = clean(team.name);

    return {
      name,
      slug: slugify(name),
      city: "",
      state: "",
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
      baseballNickname: "",
      baseballWebsiteUrl: team.baseballWebsiteUrl,
      rosterUrl: `${team.baseballWebsiteUrl}/roster`,
      scheduleUrl: `${team.baseballWebsiteUrl}/schedule`,
      campsUrl: "",
      questionnaireUrl: "",
      generalContactUrl: "",
      generalContactEmail: "",
      division: "NAIA",
      conference: "",
      logoUrl: "",
      currentRosterSize: "",
      averageGpa: "",
      scholarshipNotes:
        "NAIA programs may offer athletic scholarships and other aid opportunities.",
      scholarshipInfoUrl: "https://www.naia.org/",
      transferHeavy: "false",
      jucoFriendly: "true",
      baseballDataSourceUrl: SOURCE_URL,
      baseballVerificationStatus: "NEEDS_REVIEW",
    };
  });

  const csv = [
    HEADERS.join(","),
    ...rows.map((row) =>
      HEADERS.map((header) => escapeCsv((row as Record<string, string>)[header])).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(OUTPUT_PATH, csv, "utf8");

  console.log(`Created ${OUTPUT_PATH}`);
  console.log(`Source: ${SOURCE_URL}`);
  console.log(`NAIA baseball rows: ${rows.length}`);
}

main().catch((err) => {
  console.error("BUILD_NAIA_BASEBALL_CSV_ERROR", err);
  process.exit(1);
});