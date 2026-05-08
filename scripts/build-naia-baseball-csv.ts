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
  clean(item?.name) ||
  clean(item?.team) ||
  clean(item?.school) ||
  clean(item?.institution);

const pageName = clean(item?.pageName);

const baseballWebsiteUrl = pageName
  ? `https://naiastats.prestosports.com/sports/bsb/2024-25/teams/${pageName}`
  : "";

return {
  name,
  conference,
  baseballWebsiteUrl,
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

function stateFromNaiaName(name: string): string {
  const match = name.match(/\(([^)]+)\)/);
  if (!match?.[1]) return "";

  const raw = match[1].trim().toLowerCase();

  const map: Record<string, string> = {
    al: "AL",
    ala: "AL",
    ark: "AR",
    ar: "AR",
    az: "AZ",
    calif: "CA",
    ca: "CA",
    ga: "GA",
    ill: "IL",
    il: "IL",
    ind: "IN",
    in: "IN",
    iowa: "IA",
    ia: "IA",
    kan: "KS",
    ks: "KS",
    ky: "KY",
    la: "LA",
    mich: "MI",
    mi: "MI",
    mo: "MO",
    mont: "MT",
    mt: "MT",
    neb: "NE",
    ne: "NE",
    nc: "NC",
    nd: "ND",
    ohio: "OH",
    oh: "OH",
    okla: "OK",
    ok: "OK",
    ore: "OR",
    or: "OR",
    pa: "PA",
    sc: "SC",
    sd: "SD",
    tenn: "TN",
    tn: "TN",
    texas: "TX",
    tx: "TX",
    va: "VA",
    wash: "WA",
    wa: "WA",
    wva: "WV",
    wv: "WV",
    wis: "WI",
    wi: "WI",
  };

  return map[raw] || raw.toUpperCase();
}

function cleanNaiaSchoolName(name: string): string {
  return name.replace(/\s*\([^)]+\)\s*$/, "").trim();
}

const NAIA_STATE_OVERRIDES: Record<string, string> = {
  "Arizona Christian": "AZ",
  "Arkansas Baptist": "AR",
  "Ave Maria": "FL",
  Baker: "KS",
  "Benedictine Mesa": "AZ",
  "British Columbia": "BC",
  "Central Methodist": "MO",
  "College of Idaho": "ID",
  "College of the Ozarks": "MO",
  Corban: "OR",
  Cornerstone: "MI",
  "Eastern Oregon": "OR",
  "Florida Memorial": "FL",
  "Florida National": "FL",
  "Georgia Gwinnett": "GA",
  Graceland: "IA",
  "Grand View": "IA",
  Hastings: "NE",
  "Hope International": "CA",
  "Houston-Victoria": "TX",
  "Huston-Tillotson": "TX",
  "Indiana South Bend": "IN",
  "Indiana Southeast": "IN",
  "Indiana Tech": "IN",
  "Indiana Wesleyan": "IN",
  "IU Kokomo": "IN",
  "Jarvis Christian": "TX",
  "Kansas Wesleyan": "KS",
  "Kentucky Christian": "KY",
  "La Sierra": "CA",
  "Lawrence Tech": "MI",
  "Louisiana Christian": "LA",
  Lourdes: "OH",
  Marian: "IN",
  "Mayville State": "ND",
  "Michigan-Dearborn": "MI",
  "Mid-America Christian": "OK",
  "MidAmerica Nazarene": "KS",
  "Middle Georgia State": "GA",
  Midland: "NE",
  Midway: "KY",
  "Missouri Baptist": "MO",
  "Missouri Valley": "MO",
  Morris: "SC",
  "Mount Marty": "SD",
  "Mount Mercy": "IA",
  "New College of Florida": "FL",
  "Northwestern Ohio": "OH",
  "Oklahoma City": "OK",
  "Oklahoma Panhandle State": "OK",
  "Oklahoma Wesleyan": "OK",
  "Oregon Tech": "OR",
  OUAZ: "AZ",
  "Our Lady of the Lake": "TX",
  Park: "MO",
  "Peru State": "NE",
  Point: "GA",
  "Rio Grande": "OH",
  "Saint Mary": "KS",
  "Science and Arts": "OK",
  "Shawnee State": "OH",
  "Siena Heights": "MI",
  Southwest: "NM",
  Southwestern: "KS",
  "Southwestern Christian": "OK",
  "Spartanburg Methodist": "SC",
  Sterling: "KS",
  Stillman: "AL",
  Tabor: "KS",
  "Tennessee Southern": "TN",
  "Tennessee Wesleyan": "TN",
  "Texas A&M  Texarkana": "TX",
  "Texas A&M Texarkana": "TX",
  "Texas College": "TX",
  "Texas Wesleyan": "TX",
  Thomas: "GA",
  "Truett McConnell": "GA",
  UHSP: "MO",
  "Union Commonwealth": "KY",
  "Valley City State": "ND",
  Viterbo: "WI",
  "Voorhees University": "SC",
  Waldorf: "IA",
  "William Woods": "MO",
};

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
  const rawName = clean(team.name);
  const name = cleanNaiaSchoolName(rawName);
  const state =
    stateFromNaiaName(rawName) ||
    NAIA_STATE_OVERRIDES[name] ||
    "";

    return {
      name,
      slug: slugify(name),
      city: "",
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