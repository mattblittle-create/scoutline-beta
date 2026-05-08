// scripts/build-naia-baseball-csv.ts

import fs from "fs";
import path from "path";

const SOURCE_URL = "https://naiastats.prestosports.com/sports/bsb/2024-25/teams";
const BASE_URL = "https://naiastats.prestosports.com";
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

type Team = {
  name: string;
  conference: string;
  baseballWebsiteUrl: string;
};

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
  if (s.startsWith("/")) return `${BASE_URL}${s}`;
  return `${BASE_URL}/${s.replace(/^\/+/, "")}`;
}

async function fetchText(url: string): Promise<string> {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 ScoutLine NAIA baseball importer",
      },
    });

    if (res.ok) {
      return res.text();
    }

    console.warn(`WARN: Failed to fetch ${url}: ${res.status} attempt ${attempt}/4`);

    if (res.status === 459) {
      await sleep(8000 * attempt);
      continue;
    }

    return "";
  }

  return "";
}

function extractConferencePages(html: string) {
  const optionMatches = [
    ...html.matchAll(/<option[^>]+value="([^"]*\/sports\/bsb\/2024-25\/conf\/[^"]+\/teams\?jsRendering=true)"[^>]*>([\s\S]*?)<\/option>/gi),
  ];

  const pages = optionMatches.map((match) => ({
    url: absolutizeUrl(match[1]),
    conference: stripHtml(match[2]),
  }));

  const byUrl = new Map<string, (typeof pages)[number]>();

  for (const page of pages) {
    byUrl.set(page.url, page);
  }

  return Array.from(byUrl.values());
}

async function extractTeamsFromConferencePage(
  html: string,
  conference: string
): Promise<Team[]> {
  const jsonMatch = html.match(
    /teamsDataEndp\.set\("([^"]+\.json)"/i
  );

  if (!jsonMatch?.[1]) {
    console.warn(`No JSON endpoint found for ${conference}`);
    return [];
  }

  const jsonUrl = jsonMatch[1];

  console.log(`JSON: ${conference} -> ${jsonUrl}`);

  const res = await fetch(jsonUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 ScoutLine NAIA importer",
    },
  });

  if (!res.ok) {
    console.warn(`JSON fetch failed for ${conference}: ${res.status}`);
    return [];
  }

  const data = await res.json();

  const possibleArrays = [
    data,
    data?.teams,
    data?.rows,
    data?.data,
  ].filter(Array.isArray);

  const source = possibleArrays[0];

  if (!source) {
    console.warn(`No team array found for ${conference}`);
    return [];
  }

  const teams: Team[] = source
    .map((item: any) => {
      const name =
        clean(item?.team) ||
        clean(item?.name) ||
        clean(item?.school) ||
        clean(item?.institution);

      const url =
        clean(item?.url) ||
        clean(item?.teamUrl) ||
        clean(item?.link);

      return {
        name,
        conference,
        baseballWebsiteUrl: absolutizeUrl(url),
      };
    })
    .filter((team: Team) => team.name.length > 1);

  const bySlug = new Map<string, Team>();

  for (const team of teams) {
    bySlug.set(slugify(team.name), team);
  }

  return Array.from(bySlug.values());
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const mainHtml = await fetchText(SOURCE_URL);
  const conferencePages = extractConferencePages(mainHtml);

  console.log(`Conference pages found: ${conferencePages.length}`);

  const allTeams: Team[] = [];

  for (const page of conferencePages) {
await sleep(4500);

const html = await fetchText(page.url);

if (page.conference === "American Midwest Conference") {
  const debugPath = path.join(process.cwd(), "data", "debug-naia-conf.html");
  fs.writeFileSync(debugPath, html, "utf8");
  console.log(`Saved conference debug HTML: ${debugPath}`);
}

const teams = await extractTeamsFromConferencePage(
  html,
  page.conference
);

    console.log(`${page.conference}: ${teams.length}`);

    allTeams.push(...teams);
  }

  const bySlug = new Map<string, Team>();

  for (const team of allTeams) {
    bySlug.set(slugify(team.name), team);
  }

  const teams = Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name));

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
      conference: team.conference,
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

  console.log("");
  console.log(`Created ${OUTPUT_PATH}`);
  console.log(`NAIA baseball rows: ${rows.length}`);
}

main().catch((err) => {
  console.error("BUILD_NAIA_BASEBALL_CSV_ERROR", err);
  process.exit(1);
});