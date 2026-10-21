// scripts/build-njcaa-d1-baseball-csv.ts

import fs from "fs";
import path from "path";

const SOURCE_URL =
  "https://njcaastats.prestosports.com/sports/bsb/2024-25/div3/teams?jsRendering=true&pos=br&sort=r";

const BASE_URL = "https://njcaastats.prestosports.com";

const OUTPUT_PATH = path.join(
  process.cwd(),
  "data",
  "njcaa-d3-baseball-programs.csv"
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

const NJCAA_D3_STATE_OVERRIDES: Record<string, string> = {
  "Alexandria Technical & Community College": "MN",
  "Anoka-Ramsey Community College": "MN",
  "Atlantic Cape Community College": "NJ",
  "Bergen Community College": "NJ",
  "Borough of Manhattan Community College": "NY",
  "Bronx Community College": "NY",
  "Brookdale Community College": "NJ",
  "Bunker Hill Community College": "MA",
  "Caldwell Community College & Technical Institute": "NC",
  "Camden County College": "NJ",
  "Camp Community College": "VA",
  "Cayuga Community College": "NY",
  "Central Lakes College-Brainerd": "MN",
  "Century College": "MN",
  "College of DuPage": "IL",
  "Columbia-Greene Community College": "NY",
  "Corning Community College": "NY",
  "Dallas College Brookhaven": "TX",
  "Dallas College Cedar Valley": "TX",
  "Dallas College Eastfield": "TX",
  "Dallas College Mountain View": "TX",
  "Dallas College North Lake": "TX",
  "Delaware County Community College": "PA",
  "Delta College": "MI",
  "Dutchess Community College": "NY",
  "Erie Community College": "NY",
  "Finger Lakes Community College": "NY",
  "Fulton-Montgomery Community College": "NY",
  "Genesee Community College": "NY",
  "Harper College": "IL",
  "Herkimer College": "NY",
  "Holyoke Community College": "MA",
  "Hudson Valley Community College": "NY",
  "Jamestown Community College": "NY",
  "Jefferson Community College": "NY",
  "Joliet Junior College": "IL",
  "Kingsborough Community College": "NY",
  "Lorain County Community College": "OH",
  "Luzerne County Community College": "PA",
  "Massasoit Community College": "MA",
  "Middlesex College": "NJ",
  "Minnesota North College-Hibbing": "MN",
  "Minnesota North College-Mesabi Range": "MN",
  "Minnesota North College-Rainy River": "MN",
  "Minnesota North College-Vermilion": "MN",
  "Minnesota West Community & Technical College": "MN",
  "Mohawk Valley Community College": "NY",
  "Monroe University - Bronx": "NY",
  "Nassau Community College": "NY",
  "North Arkansas College": "AR",
  "North Dakota State College of Science": "ND",
  "Northampton Community College": "PA",
  "Northern Essex Community College": "MA",
  "Northland Community & Technical College": "MN",
  "Oakton Community College": "IL",
  "Ocean County College": "NJ",
  "Onondaga Community College": "NY",
  "Owens Community College": "OH",
  "Queensborough Community College": "NY",
  "Quinsigamond Community College": "MA",
  "Ridgewater College": "MN",
  "Riverland Community College": "MN",
  "Rochester Community and Technical College": "MN",
  "Rockingham Community College": "NC",
  "Rowan College South Jersey - Gloucester": "NJ",
  "Roxbury Community College": "MA",
  "Salem Community College": "NJ",
  "St. Cloud Technical & Community College": "MN",
  "Suffolk Community College": "NY",
  "SUNY Adirondack": "NY",
  "SUNY Broome Community College": "NY",
  "SUNY Niagara": "NY",
  "Surry Community College": "NC",
  "Terra State": "OH",
  "Tompkins Cortland Community College": "NY",
  "Virginia Peninsula Community College": "VA",
  "Waubonsee Community College": "IL",
  "Western Technical College": "WI",
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
    throw new Error("Could not fetch NJCAA D3 teams JSON.");
  }

  const teams = extractTeamsFromJson(json).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const rows = teams.map((team) => {
    const rawName = clean(team.name);
    const name = cleanSchoolName(rawName);
    const state =
      stateFromNameOrPageName(rawName, team.pageName) ||
      NJCAA_D3_STATE_OVERRIDES[name] ||
      "";

    const baseballWebsiteUrl = `${BASE_URL}/sports/bsb/2024-25/div3/teams/${team.pageName}`;

    return {
      name,
      slug: slugify(name),
      city: "",
      state,
      region: "",
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
      division: "NJCAA_D3",
      conference: team.region ? `Region ${team.region}` : "",
      logoUrl: "",
      currentRosterSize: "",
      averageGpa: "",
      scholarshipNotes:
        "NJCAA Division III programs do not offer athletic scholarships, but student-athletes may receive academic, need-based, and other non-athletic aid.",
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
  console.log(`NJCAA D3 baseball rows: ${dedupedRows.length}`);

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