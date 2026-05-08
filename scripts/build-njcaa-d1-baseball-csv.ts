// scripts/build-njcaa-d1-baseball-csv.ts

import fs from "fs";
import path from "path";

const SOURCE_URL =
  "https://njcaastats.prestosports.com/sports/bsb/2024-25/div1/teams?jsRendering=true&pos=br&sort=r";

const BASE_URL = "https://njcaastats.prestosports.com";

const OUTPUT_PATH = path.join(
  process.cwd(),
  "data",
  "njcaa-d1-baseball-programs.csv"
);

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
  pageName: string;
  region: string;
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

const NJCAA_D1_STATE_OVERRIDES: Record<string, string> = {
  "Allen County Community College": "KS",
  "Alvin Community College": "TX",
  "Amarillo College": "TX",
  "Andrew College": "GA",
  "Angelina College": "TX",
  "Arizona Western College": "AZ",
  "Barton Community College": "KS",
  "Baton Rouge Community College": "LA",
  "Blinn College": "TX",
  "Bossier Parish Community College": "LA",
  "Calhoun Community College": "AL",
  "Central Arizona College": "AZ",
  "Chattahoochee Valley Community College": "AL",
  "Chattanooga State Community College": "TN",
  "Chipola  College": "FL",
  "Chipola College": "FL",
  "Cisco College": "TX",
  "Clarendon College": "TX",
  "Cleveland State Community College": "TN",
  "Cloud County Community College": "KS",
  "Coastal Alabama - South": "AL",
  "Coastal Bend College": "TX",
  "Cochise College": "AZ",
  "Coffeyville Community College": "KS",
  "Colby Community College": "KS",
  "College of Central Florida": "FL",
  "College of Southern Idaho": "ID",
  "College of Southern Nevada": "NV",
  "Colorado Northwestern Community College": "CO",
  "Columbia State Community College": "TN",
  "Community Christian College": "CA",
  "Connors State College": "OK",
  "Cowley County Community College": "KS",
  "Crowder College": "MO",
  "Daytona State College": "FL",
  "Delgado Community College": "LA",
  "Dodge City Community College": "KS",
  "Dyersburg State Community College": "TN",
  "East Georgia College": "GA",
  "Eastern Arizona College": "AZ",
  "Eastern Florida State College": "FL",
  "Eastern Oklahoma State College": "OK",
  "El Paso Community College": "TX",
  "Florence-Darlington Technical College": "SC",
  "Florida Southwestern State College": "FL",
  "Fort Scott Community College": "KS",
  "Frank Phillips College": "TX",
  "Frontier Community College": "IL",
  "Gadsden State Community College": "AL",
  "Galveston College": "TX",
  "Garden City Community College": "KS",
  "Gaston College": "NC",
  "Georgia Highlands College": "GA",
  "Gordon State College": "GA",
  "Grayson College": "TX",
  "Gulf Coast State College": "FL",
  "Harford Community College": "MD",
  "Highland Community College - Kansas": "KS",
  "Hill College": "TX",
  "Hillsborough Community College": "FL",
  "Howard College": "TX",
  "Hutchinson Community College": "KS",
  "Indian Hills Community College": "IA",
  "Indian River State College": "FL",
  "Iowa Western Community College": "IA",
  "Jackson State Community College": "TN",
  "Jefferson College": "MO",
  "John A. Logan College": "IL",
  "Johnson County Community College": "KS",
  "Kansas City Kansas Community College": "KS",
  "Kaskaskia College": "IL",
  "Kennedy-King College": "IL",
  "Kishwaukee College": "IL",
  "Labette Community College": "KS",
  "Lake Land College": "IL",
  "Lamar Community College": "CO",
  "Lawson State Community College": "AL",
  "Lincoln Trail College": "IL",
  "Louisiana State University Eunice": "LA",
  "Luna Community College": "NM",
  "McCook Community College": "NE",
  "McHenry County College": "IL",
  "McLennan Community College": "TX",
  "Metropolitan Community College": "NE",
  "Miami Dade College": "FL",
  "Midland College": "TX",
  "Mineral Area College": "MO",
  "Missouri State University - West Plains": "MO",
  "Monroe University": "NY",
  "Motlow State Community College": "TN",
  "Navarro College": "TX",
  "Neosho County Community College": "KS",
  "New Mexico Junior College": "NM",
  "New Mexico Military Institute": "NM",
  "North Central Texas College": "TX",
  "Northeast Texas Community College": "TX",
  "Northeastern Junior College": "CO",
  "Northeastern Oklahoma A&M College": "OK",
  "Northeastern Oklahoma AM College": "OK",
  "Northwest Florida State College": "FL",
  "Northwest-Shoals Community College": "AL",
  "Nunez Community College": "LA",
  "Odessa College": "TX",
  "Olive-Harvey College": "IL",
  "Olney Central College": "IL",
  "Otero College": "CO",
  "Panola College": "TX",
  "Paris Junior College": "TX",
  "Pellissippi State Community College": "TN",
  "Pensacola State College": "FL",
  "Polk State College": "FL",
  "Pratt Community College": "KS",
  "Ranger College": "TX",
  "Rend Lake College": "IL",
  "Roane State Community College": "TN",
  "Rose State College": "OK",
  "Salt Lake Community College": "UT",
  "San Jacinto College-North": "TX",
  "Santa Fe College": "FL",
  "Seminole State College of Florida": "FL",
  "Seward County Community College": "KS",
  "Shawnee Community College": "IL",
  "Shelton State Community College": "AL",
  "Snead State Community College": "AL",
  "South Georgia State College": "GA",
  "South Suburban College": "IL",
  "Southeast Community College": "NE",
  "Southeastern Illinois College": "IL",
  "Southern Union State Community College": "AL",
  "Southwest Tennessee Community College": "TN",
  "Southwestern Community College": "IA",
  "Southwestern Illinois College": "IL",
  "St. Charles Community College": "MO",
  "St. Louis Community College": "MO",
  "St. Petersburg College": "FL",
  "State College of Florida, Manatee-Sarasota": "FL",
  "State Fair Community College": "MO",
  "Tallahassee State College": "FL",
  "Temple College": "TX",
  "Trinidad State College": "CO",
  "Triton College": "IL",
  "Tyler Junior College": "TX",
  "USC Lancaster": "SC",
  "USC Salkehatchie": "SC",
  "USC Sumter": "SC",
  "USC Union": "SC",
  "Utah State Eastern": "UT",
  "Vernon College": "TX",
  "Volunteer State Community College": "TN",
  "Wabash Valley College": "IL",
  "Walters State Community College": "TN",
  "Weatherford College": "TX",
  "Western Nebraska Community College": "NE",
  "Western Texas College": "TX",
  "Wharton County Junior College": "TX",
  "WVU Potomac State College": "WV",
  "Yavapai College": "AZ",
};

function stateFromNameOrPageName(name: string, pageName: string): string {
  const haystack = `${name} ${pageName}`.toLowerCase();

  const stateMap: Record<string, string> = {
    al: "AL",
    ala: "AL",
    ark: "AR",
    ar: "AR",
    az: "AZ",
    ca: "CA",
    calif: "CA",
    co: "CO",
    colo: "CO",
    ct: "CT",
    fl: "FL",
    fla: "FL",
    ga: "GA",
    ia: "IA",
    id: "ID",
    il: "IL",
    ill: "IL",
    in: "IN",
    ind: "IN",
    ks: "KS",
    kan: "KS",
    ky: "KY",
    la: "LA",
    ma: "MA",
    md: "MD",
    mi: "MI",
    mich: "MI",
    mn: "MN",
    minn: "MN",
    mo: "MO",
    ms: "MS",
    miss: "MS",
    nc: "NC",
    nd: "ND",
    ne: "NE",
    neb: "NE",
    nj: "NJ",
    nm: "NM",
    ny: "NY",
    oh: "OH",
    ohio: "OH",
    ok: "OK",
    okla: "OK",
    or: "OR",
    pa: "PA",
    sc: "SC",
    sd: "SD",
    tn: "TN",
    tenn: "TN",
    tx: "TX",
    texas: "TX",
    va: "VA",
    wa: "WA",
    wv: "WV",
    wva: "WV",
    wi: "WI",
    wy: "WY",
  };

  const parenMatch = name.match(/\(([^)]+)\)/);
  if (parenMatch?.[1]) {
    const raw = parenMatch[1].trim().toLowerCase();
    if (stateMap[raw]) return stateMap[raw];
  }

  const suffixMatch = pageName.match(/([a-z]{2})$/i);
  if (suffixMatch?.[1]) {
    const suffix = suffixMatch[1].toLowerCase();
    if (stateMap[suffix]) return stateMap[suffix];
  }

  return "";
}

function cleanSchoolName(name: string): string {
  return name
    .replace(/\s*\([^)]+\)\s*$/, "")
    .replace(/\s+CC$/i, " Community College")
    .replace(/\s+JC$/i, " Junior College")
    .trim();
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 ScoutLine NJCAA baseball importer",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  return res.text();
}

async function fetchJson(url: string): Promise<any | null> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 ScoutLine NJCAA baseball importer",
    },
  });

  if (!res.ok) {
    console.warn(`WARN: JSON fetch failed ${url}: ${res.status}`);
    return null;
  }

  return res.json();
}

function extractTeamsJsonEndpoint(html: string): string | null {
  const match = html.match(/teamsDataEndp\.set\("([^"]+\.json)"/i);
  return match?.[1] || null;
}

function extractTeamsFromJson(data: any): Team[] {
  const source = Array.isArray(data)
    ? data
    : Array.isArray(data?.teams)
      ? data.teams
      : Array.isArray(data?.data)
        ? data.data
        : [];

  return source
    .map((item: any) => {
      return {
        name: clean(item?.name || item?.team || item?.school),
        pageName: clean(item?.pageName),
        region: clean(item?.region),
      };
    })
    .filter((team: Team) => team.name && team.pageName);
}

async function main() {
  const html = await fetchText(SOURCE_URL);

  const debugPath = path.join(process.cwd(), "data", "debug-njcaa-d1.html");
  fs.writeFileSync(debugPath, html, "utf8");

  const jsonUrl = extractTeamsJsonEndpoint(html);

  if (!jsonUrl) {
    throw new Error(`Could not find teamsData JSON endpoint. Debug saved: ${debugPath}`);
  }

  console.log(`JSON endpoint: ${jsonUrl}`);

  const json = await fetchJson(jsonUrl);

  if (!json) {
    throw new Error("Could not fetch NJCAA D1 teams JSON.");
  }

  const teams = extractTeamsFromJson(json).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const rows = teams.map((team) => {
    const rawName = clean(team.name);
    const name = cleanSchoolName(rawName);
    const state =
      stateFromNameOrPageName(rawName, team.pageName) ||
      NJCAA_D1_STATE_OVERRIDES[name] ||
      "";

    const baseballWebsiteUrl = `${BASE_URL}/sports/bsb/2024-25/div1/teams/${team.pageName}`;

    return {
      name,
      slug: slugify(name),
      city: "",
      state,
      region: team.region ? `REGION_${team.region}` : "",
      control: "PUBLIC",
      schoolType: "JUNIOR_COLLEGE",
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
      baseballWebsiteUrl,
      rosterUrl: `${baseballWebsiteUrl}/roster`,
      scheduleUrl: `${baseballWebsiteUrl}/schedule`,
      campsUrl: "",
      questionnaireUrl: "",
      generalContactUrl: "",
      generalContactEmail: "",
      division: "NJCAA_D1",
      conference: team.region ? `Region ${team.region}` : "",
      logoUrl: "",
      currentRosterSize: "",
      averageGpa: "",
      scholarshipNotes:
        "NJCAA Division I programs may offer athletic scholarships, subject to NJCAA and institutional limits.",
      scholarshipInfoUrl: "https://www.njcaa.org/",
      transferHeavy: "true",
      jucoFriendly: "true",
      baseballDataSourceUrl: SOURCE_URL,
      baseballVerificationStatus: "NEEDS_REVIEW",
    };
  });

  const bySlug = new Map<string, (typeof rows)[number]>();

  for (const row of rows) {
    bySlug.set(row.slug, row);
  }

  const dedupedRows = Array.from(bySlug.values());

  const csv = [
    HEADERS.join(","),
    ...dedupedRows.map((row) =>
      HEADERS.map((header) =>
        escapeCsv((row as Record<string, string>)[header])
      ).join(",")
    ),
  ].join("\n");

  fs.writeFileSync(OUTPUT_PATH, csv, "utf8");

  console.log(`Created ${OUTPUT_PATH}`);
  console.log(`NJCAA D1 baseball rows: ${dedupedRows.length}`);

  const blankStates = dedupedRows.filter((row) => !row.state);
  console.log(`Rows missing state: ${blankStates.length}`);

  if (blankStates.length) {
    console.log("Missing state sample:");
    blankStates.slice(0, 25).forEach((row) => {
      console.log(`- ${row.name} | ${row.baseballWebsiteUrl}`);
    });
  }
}

main().catch((err) => {
  console.error("BUILD_NJCAA_D1_BASEBALL_CSV_ERROR", err);
  process.exit(1);
});