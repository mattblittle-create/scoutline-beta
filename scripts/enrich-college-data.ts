// scripts/enrich-college-data.ts

import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const DEFAULT_CSV_PATH = path.join(process.cwd(), "data", "college-baseball-programs.csv");
const API_KEY = process.env.COLLEGE_SCORECARD_API_KEY || "";
const SCORECARD_BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools";

type Row = Record<string, string>;

const FIELDS = [
  "id",
  "school.name",
  "school.city",
  "school.state",
  "school.zip",
  "school.ownership",
  "school.school_url",
  "location.lat",
  "location.lon",
  "latest.cost.tuition.in_state",
  "latest.cost.tuition.out_of_state",
  "latest.admissions.admission_rate.overall",
  "latest.completion.completion_rate_4yr_150nt",
  "latest.student.size",
];

const SCORECARD_NAME_ALIASES: Record<string, string> = {
  "Adams State": "Adams State University",
  Adelphi: "Adelphi University",
  "Alabama–Huntsville": "University of Alabama in Huntsville",
  "Albany State": "Albany State University",
  "American International": "American International College",
  Anderson: "Anderson University",
  "Angelo State": "Angelo State University",
  "Arkansas Tech": "Arkansas Tech University",
  "Arkansas–Fort Smith": "University of Arkansas-Fort Smith",
  "Arkansas–Monticello": "University of Arkansas at Monticello",
  Ashland: "Ashland University",
  Assumption: "Assumption University",
  "Auburn Montgomery": "Auburn University at Montgomery",
  Augusta: "Augusta University",
  Augustana: "Augustana University",
  "Azusa Pacific": "Azusa Pacific University",
  Barry: "Barry University",
  Barton: "Barton College",
  "Belmont Abbey": "Belmont Abbey College",
  "Bemidji State": "Bemidji State University",
  Benedict: "Benedict College",
  Bentley: "Bentley University",
  Biola: "Biola University",
  Bloomsburg: "Bloomsburg University of Pennsylvania",
  "Bluefield State": "Bluefield State University",
  Bridgeport: "University of Bridgeport",
  Caldwell: "Caldwell University",
  "Cal Poly Pomona": "California State Polytechnic University-Pomona",
  "Cal State Dominguez Hills": "California State University-Dominguez Hills",
  "Cal State East Bay": "California State University-East Bay",
  "Cal State Los Angeles": "California State University-Los Angeles",
  "Cal State Monterey Bay": "California State University-Monterey Bay",
  "Cal State San Bernardino": "California State University-San Bernardino",
  "Cal State San Marcos": "California State University-San Marcos",
  "Cal State Stanislaus": "California State University-Stanislaus",
  "California (PA)": "Pennsylvania Western University",
  Cameron: "Cameron University",
  "Carson–Newman": "Carson-Newman University",
  Catawba: "Catawba College",
  Cedarville: "Cedarville University",
  "Central Missouri": "University of Central Missouri",
  "Central Oklahoma": "University of Central Oklahoma",
  "Central Washington": "Central Washington University",
  Chaminade: "Chaminade University of Honolulu",
  "Charleston (WV)": "University of Charleston",
  "Chestnut Hill": "Chestnut Hill College",
  "Chico State": "California State University-Chico",
  Chowan: "Chowan University",
  "Christian Brothers": "Christian Brothers University",
  Claflin: "Claflin University",
  "Clark Atlanta": "Clark Atlanta University",
  Clarion: "Pennsylvania Western University",
  "Colorado Christian": "Colorado Christian University",
  "Colorado Mesa": "Colorado Mesa University",
  "Colorado Mines": "Colorado School of Mines",
  "Columbus State": "Columbus State University",
  Concord: "Concord University",
  "Concordia–Irvine": "Concordia University-Irvine",
  "Concordia–St. Paul": "Concordia University-Saint Paul",
  Coker: "Coker University",
  "CSU Pueblo": "Colorado State University Pueblo",
  Davenport: "Davenport University",
  "Davis & Elkins": "Davis & Elkins College",
  "Delta State": "Delta State University",
  "Dominican (NY)": "Dominican University New York",
  Drury: "Drury University",
  "D'Youville": "D'Youville University",
  "East Central": "East Central University",
  "East Stroudsburg": "East Stroudsburg University of Pennsylvania",
  "Eastern New Mexico": "Eastern New Mexico University",
  Eckerd: "Eckerd College",
  "Edward Waters": "Edward Waters University",
  "Embry–Riddle": "Embry-Riddle Aeronautical University-Daytona Beach",
  Emmanuel: "Emmanuel University",
  "Emory & Henry": "Emory & Henry University",
  "Emporia State": "Emporia State University",
  Erskine: "Erskine College",
  "Fairmont State": "Fairmont State University",
  Felician: "Felician University",
  Ferrum: "Ferrum College",
  Findlay: "The University of Findlay",
  Flagler: "Flagler College",
  "Florida Southern": "Florida Southern College",
  "Florida Tech": "Florida Institute of Technology",
  "Fort Hays State": "Fort Hays State University",
  "Francis Marion": "Francis Marion University",
  "Franklin Pierce": "Franklin Pierce University",
  "Fresno Pacific": "Fresno Pacific University",
  "Frostburg State": "Frostburg State University",
  Gannon: "Gannon University",
  "Georgia College": "Georgia College & State University",
  "Georgia Southwestern State": "Georgia Southwestern State University",
  "Georgian Court": "Georgian Court University",
  "Glenville State": "Glenville State University",
  "Goldey–Beacom": "Goldey-Beacom College",
  "Grand Valley State": "Grand Valley State University",
  Harding: "Harding University",
  "Hawaiʻi Pacific": "Hawaii Pacific University",
  "Henderson State": "Henderson State University",
  Hillsdale: "Hillsdale College",
  "Holy Family": "Holy Family University",
  Indianapolis: "University of Indianapolis",
  IUP: "Indiana University of Pennsylvania-Main Campus",
  Jamestown: "University of Jamestown",
  Jefferson: "Thomas Jefferson University",
  Jessup: "William Jessup University",
  "Kentucky State": "Kentucky State University",
  "Kentucky Wesleyan": "Kentucky Wesleyan College",
  King: "King University",
  Kutztown: "Kutztown University of Pennsylvania",
  Lander: "Lander University",
  Lane: "Lane College",
  "Lake Erie": "Lake Erie College",
  Lee: "Lee University",
  "LeMoyne–Owen": "Le Moyne-Owen College",
  "Lenoir–Rhyne": "Lenoir-Rhyne University",
  Lewis: "Lewis University",
  "Lincoln (MO)": "Lincoln University",
  "Lincoln (PA)": "Lincoln University",
  "Lincoln Memorial": "Lincoln Memorial University",
  "Lock Haven": "Lock Haven University",
  "Lubbock Christian": "Lubbock Christian University",
  Lynn: "Lynn University",
  Malone: "Malone University",
  Mansfield: "Mansfield University of Pennsylvania",
  "Mars Hill": "Mars Hill University",
  Mary: "University of Mary",
  "Maryville (MO)": "Maryville University of Saint Louis",
  McKendree: "McKendree University",
  Menlo: "Menlo College",
  Mercy: "Mercy University",
  "Metropolitan State": "Metropolitan State University of Denver",
  "Middle Georgia": "Middle Georgia State University",
  Miles: "Miles College",
  Millersville: "Millersville University of Pennsylvania",
  "Minnesota State": "Minnesota State University-Mankato",
  "Minnesota–Crookston": "University of Minnesota-Crookston",
  "Minnesota–Duluth": "University of Minnesota-Duluth",
  "Minot State": "Minot State University",
  "Mississippi College": "Mississippi College",
  "Missouri Southern": "Missouri Southern State University",
  "Missouri S&T": "Missouri University of Science and Technology",
  "Missouri Western": "Missouri Western State University",
  Molloy: "Molloy University",
  "Montana State–Billings": "Montana State University Billings",
  Montevallo: "University of Montevallo",
  Morehouse: "Morehouse College",
  "Mount Olive": "University of Mount Olive",
  "New Mexico Highlands": "New Mexico Highlands University",
  Newberry: "Newberry College",
  Newman: "Newman University",
  "North Georgia": "University of North Georgia",
  "North Greenville": "North Greenville University",
  "Northeastern State": "Northeastern State University",
  "Northern State": "Northern State University",
  "Northwest Missouri State": "Northwest Missouri State University",
  "Northwest Nazarene": "Northwest Nazarene University",
  "Northwestern Oklahoma State": "Northwestern Oklahoma State University",
  Northwood: "Northwood University",
  "Nova Southeastern": "Nova Southeastern University",
  "Ohio Dominican": "Ohio Dominican University",
  "Oklahoma Baptist": "Oklahoma Baptist University",
  "Oklahoma Christian": "Oklahoma Christian University",
  "Ouachita Baptist": "Ouachita Baptist University",
  Pace: "Pace University",
  "Palm Beach Atlantic": "Palm Beach Atlantic University",
  Parkside: "University of Wisconsin-Parkside",
  "Pitt–Johnstown": "University of Pittsburgh-Johnstown",
  "Point Loma Nazarene": "Point Loma Nazarene University",
  "Point Park": "Point Park University",
  Post: "Post University",
  "Purdue Northwest": "Purdue University Northwest",
  "Queens (NY)": "CUNY Queens College",
  Quincy: "Quincy University",
  Regis: "Regis University",
  Rockhurst: "Rockhurst University",
  "Rogers State": "Rogers State University",
  Rollins: "Rollins College",
  Roosevelt: "Roosevelt University",
  "Saginaw Valley State": "Saginaw Valley State University",
  "Saint Anselm": "Saint Anselm College",
  "Saint Leo": "Saint Leo University",
  "Saint Martin's": "Saint Martin's University",
  "Saint Michael's": "Saint Michael's College",
  Salem: "Salem University",
  "San Francisco State": "San Francisco State University",
  "Savannah State": "Savannah State University",
  "Seton Hill": "Seton Hill University",
  Shepherd: "Shepherd University",
  Shippensburg: "Shippensburg University of Pennsylvania",
  Shorter: "Shorter University",
  "Sioux Falls": "University of Sioux Falls",
  "Slippery Rock": "Slippery Rock University of Pennsylvania",
  "Southeastern Oklahoma State": "Southeastern Oklahoma State University",
  "Southern Arkansas": "Southern Arkansas University Main Campus",
  "Southern Connecticut": "Southern Connecticut State University",
  "Southern Nazarene": "Southern Nazarene University",
  "Southern New Hampshire": "Southern New Hampshire University",
  "Southern Wesleyan": "Southern Wesleyan University",
  "Southwest Baptist": "Southwest Baptist University",
  "Southwest Minnesota State": "Southwest Minnesota State University",
  "Southwestern Oklahoma State": "Southwestern Oklahoma State University",
  "Spring Hill": "Spring Hill College",
  "Staten Island": "College of Staten Island CUNY",
  "Sul Ross State": "Sul Ross State University",
  Tampa: "The University of Tampa",
  "Texas A&M International": "Texas A & M International University",
  "Thomas More": "Thomas More University",
  Tiffin: "Tiffin University",
  "Trevecca Nazarene": "Trevecca Nazarene University",
  Truman: "Truman State University",
  Tusculum: "Tusculum University",
  Tuskegee: "Tuskegee University",
  UCCS: "University of Colorado Colorado Springs",
  UIS: "University of Illinois Springfield",
  "UNC Pembroke": "University of North Carolina at Pembroke",
  Union: "Union University",
  "Upper Iowa": "Upper Iowa University",
  "USC Aiken": "University of South Carolina Aiken",
  "USC Beaufort": "University of South Carolina Beaufort",
  "UT Dallas": "The University of Texas at Dallas",
  "UT Permian Basin": "The University of Texas Permian Basin",
  "UT Tyler": "The University of Texas at Tyler",
  "UVA Wise": "The University of Virginia's College at Wise",
  "Valdosta State": "Valdosta State University",
  Vanguard: "Vanguard University of Southern California",
  "Virginia State": "Virginia State University",
  Walsh: "Walsh University",
  Washburn: "Washburn University",
  "Wayne State (MI)": "Wayne State University",
  "Wayne State (NE)": "Wayne State College",
  "West Alabama": "University of West Alabama",
  "West Chester": "West Chester University of Pennsylvania",
  "West Florida": "The University of West Florida",
  "West Liberty": "West Liberty University",
  "West Texas A&M": "West Texas A & M University",
  "West Virginia State": "West Virginia State University",
  "West Virginia Wesleyan": "West Virginia Wesleyan College",
  "Western Oregon": "Western Oregon University",
  Westmont: "Westmont College",
  Wheeling: "Wheeling University",
  "William Jewell": "William Jewell College",
  Wilmington: "Wilmington College",
  Wingate: "Wingate University",
  "Winona State": "Winona State University",
  "Young Harris": "Young Harris College",
    "University of California, Santa Barbara":
    "University of California-Santa Barbara",
  "California Polytechnic State University":
    "California Polytechnic State University-San Luis Obispo",
  "University of California, San Diego":
    "University of California-San Diego",
  "California State University, Sacramento":
    "California State University-Sacramento",
  "Southern Illinois University Edwardsville":
    "Southern Illinois University-Edwardsville",
  "California State University, Fullerton":
    "California State University-Fullerton",
  "University of California, Irvine":
    "University of California-Irvine",
  "University of Hawaii at Manoa":
    "University of Hawaii at Manoa",
  "University of California, Davis":
    "University of California-Davis",
  "California State University, Northridge":
    "California State University-Northridge",
  "University of Maryland, Baltimore County":
    "University of Maryland-Baltimore County",
  "University of Massachusetts Lowell":
    "University of Massachusetts-Lowell",
  "California State University, Bakersfield":
    "California State University-Bakersfield",
  "California State University, Long Beach":
    "California State University-Long Beach",
  "University of Nebraska Omaha":
    "University of Nebraska at Omaha",
  "University of California, Riverside":
    "University of California-Riverside",
  "University at Albany, SUNY":
    "SUNY at Albany",
  "New Jersey Institute of Technology":
    "New Jersey Institute of Technology",
  "University of St. Thomas":
    "University of St Thomas",
  "University of Northern Colorado":
    "University of Northern Colorado",
  "University of New Haven":
    "University of New Haven",
};

function getArgValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function resolveCsvPath(): string {
  const fileArg = getArgValue("--file");
  if (!fileArg) return DEFAULT_CSV_PATH;
  return path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
}

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

type ScoutLineRegion =
  | "NORTHEAST"
  | "MID_ATLANTIC"
  | "SOUTHEAST"
  | "MIDWEST"
  | "SOUTHWEST"
  | "WEST"
  | "PACIFIC";

function normalizeWebsiteUrl(
  value: unknown,
): string | null {
  const cleaned = clean(value);

  if (!cleaned) {
    return null;
  }

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  return `https://${cleaned}`;
}

function scorecardOwnershipToControl(
  value: unknown,
): "PUBLIC" | "PRIVATE" | null {
  const ownership = toNumber(value);

  if (ownership === 1) {
    return "PUBLIC";
  }

  if (ownership === 2 || ownership === 3) {
    return "PRIVATE";
  }

  return null;
}

function regionFromState(
  value: unknown,
): ScoutLineRegion | null {
  const state = clean(value).toUpperCase();

  const regions: Record<ScoutLineRegion, string[]> = {
    NORTHEAST: [
      "CT",
      "ME",
      "MA",
      "NH",
      "RI",
      "VT",
      "NY",
    ],

    MID_ATLANTIC: [
      "DE",
      "DC",
      "MD",
      "NJ",
      "PA",
      "VA",
      "WV",
    ],

    SOUTHEAST: [
      "AL",
      "AR",
      "FL",
      "GA",
      "KY",
      "LA",
      "MS",
      "NC",
      "SC",
      "TN",
    ],

    MIDWEST: [
      "IL",
      "IN",
      "IA",
      "KS",
      "MI",
      "MN",
      "MO",
      "NE",
      "ND",
      "OH",
      "SD",
      "WI",
    ],

    SOUTHWEST: [
      "AZ",
      "NM",
      "OK",
      "TX",
    ],

    WEST: [
      "CO",
      "ID",
      "MT",
      "NV",
      "UT",
      "WY",
    ],

    PACIFIC: [
      "AK",
      "CA",
      "HI",
      "OR",
      "WA",
    ],
  };

  for (const [region, states] of Object.entries(
    regions,
  ) as Array<[ScoutLineRegion, string[]]>) {
    if (states.includes(state)) {
      return region;
    }
  }

  return null;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/&/g, "and")
    .replace(/\bthe\b/g, "")
    .replace(/\buniversity\b/g, "")
    .replace(/\bcollege\b/g, "")
    .replace(/\bstate\b/g, "state")
    .replace(/\bcampus\b/g, "")
    .replace(/\bmain\b/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function tokens(value: string): string[] {
  return normalizeName(value)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function tokenOverlapScore(a: string, b: string): number {
  const aTokens = tokens(a);
  const bTokens = tokens(b);

  if (!aTokens.length || !bTokens.length) return 0;

  const matches = aTokens.filter((t) => bTokens.includes(t)).length;
  return Math.round((matches / Math.max(aTokens.length, bTokens.length)) * 50);
}

function generateSearchCandidates(row: Row): string[] {
  const name = clean(row.name);
  const alias = SCORECARD_NAME_ALIASES[name];

  const candidates = [
    alias,
    name,
    `${name} University`,
    `${name} College`,
    `University of ${name}`,
    `${name} State University`,
  ].filter(Boolean);

  return Array.from(new Set(candidates));
}

function scoreMatch(row: Row, school: any): number {
  const displayName = clean(row.name);
  const aliasName = SCORECARD_NAME_ALIASES[displayName] || displayName;

  const rowName = normalizeName(displayName);
  const aliasNormalized = normalizeName(aliasName);
  const apiNameRaw = clean(school["school.name"]);
  const apiName = normalizeName(apiNameRaw);

  let score = 0;

  if (rowName && apiName && rowName === apiName) score += 100;
  if (aliasNormalized && apiName && aliasNormalized === apiName) score += 120;

  if (rowName && apiName && (rowName.includes(apiName) || apiName.includes(rowName))) {
    score += 55;
  }

  if (
    aliasNormalized &&
    apiName &&
    (aliasNormalized.includes(apiName) || apiName.includes(aliasNormalized))
  ) {
    score += 70;
  }

  score += tokenOverlapScore(aliasName, apiNameRaw);
  score += tokenOverlapScore(displayName, apiNameRaw);

  if (clean(row.state).toUpperCase() === clean(school["school.state"]).toUpperCase()) {
    score += 35;
  } else {
    score -= 30;
  }

  return score;
}

async function fetchScorecardMatch(row: Row): Promise<any | null> {
  if (!API_KEY) {
    throw new Error("Missing COLLEGE_SCORECARD_API_KEY in .env.local");
  }

  const candidates = generateSearchCandidates(row);
  const allResults: any[] = [];

  for (const candidate of candidates) {
    const exactParams = new URLSearchParams({
      api_key: API_KEY,
      "school.name": candidate,
      fields: FIELDS.join(","),
      per_page: "20",
    });

const exactRes = await fetch(
  `${SCORECARD_BASE_URL}?${exactParams.toString()}`,
);

if (!exactRes.ok) {
  console.warn(
    `  Candidate skipped: "${candidate}" returned ${exactRes.status} ${exactRes.statusText}`,
  );

  continue;
}

const exactData = await exactRes.json();

const exactResults = Array.isArray(
  exactData?.results,
)
  ? exactData.results
  : [];

allResults.push(...exactResults);
  }

  const uniqueResults = Array.from(
    new Map(allResults.map((school) => [school.id, school])).values()
  );

  const ranked = uniqueResults
    .map((school: any) => ({ school, score: scoreMatch(row, school) }))
    .sort((a: any, b: any) => b.score - a.score);

  const best = ranked[0];

  if (!best || best.score < 40) return null;

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

const matchedCity = clean(
  match["school.city"],
);

const matchedState = clean(
  match["school.state"],
).toUpperCase();

const matchedZipCode = clean(
  match["school.zip"],
);

const matchedWebsiteUrl = normalizeWebsiteUrl(
  match["school.school_url"],
);

const matchedLatitude = toNumber(
  match["location.lat"],
);

const matchedLongitude = toNumber(
  match["location.lon"],
);

const matchedControl =
  scorecardOwnershipToControl(
    match["school.ownership"],
  );

const matchedRegion = regionFromState(
  matchedState || row.state,
);

const tuitionInState = toNumber(
  match["latest.cost.tuition.in_state"],
);

const tuitionOutOfState = toNumber(
  match["latest.cost.tuition.out_of_state"],
);

const acceptanceRate = toNumber(
  match[
    "latest.admissions.admission_rate.overall"
  ],
);

const graduationRate = toNumber(
  match[
    "latest.completion.completion_rate_4yr_150nt"
  ],
);

const enrollmentUndergrad = toNumber(
  match["latest.student.size"],
);

if (!row.city && matchedCity) {
  row.city = matchedCity;
}

if (!row.state && matchedState) {
  row.state = matchedState;
}

if (!row.zipCode && matchedZipCode) {
  row.zipCode = matchedZipCode;
}

if (!row.websiteUrl && matchedWebsiteUrl) {
  row.websiteUrl = matchedWebsiteUrl;
}

if (!row.latitude && matchedLatitude != null) {
  row.latitude = String(matchedLatitude);
}

if (!row.longitude && matchedLongitude != null) {
  row.longitude = String(matchedLongitude);
}

if (!row.control && matchedControl) {
  row.control = matchedControl;
}

if (!row.region && matchedRegion) {
  row.region = matchedRegion;
}

if (!row.schoolType) {
  row.schoolType = "FOUR_YEAR";
}

      if (!row.tuitionInState && tuitionInState != null) {
        row.tuitionInState = String(Math.round(tuitionInState));
      }

      if (!row.tuitionOutOfState && tuitionOutOfState != null) {
        row.tuitionOutOfState = String(Math.round(tuitionOutOfState));
      }

      if (!row.tuitionInternational && tuitionOutOfState != null) {
        row.tuitionInternational = String(Math.round(tuitionOutOfState));
      }

      if (!row.acceptanceRate && acceptanceRate != null) {
        row.acceptanceRate = String(acceptanceRate);
      }

      if (!row.graduationRate && graduationRate != null) {
        row.graduationRate = String(graduationRate);
      }

      if (!row.enrollmentUndergrad && enrollmentUndergrad != null) {
        row.enrollmentUndergrad = String(Math.round(enrollmentUndergrad));
      }

      if (!row.enrollmentTotal && enrollmentUndergrad != null) {
        row.enrollmentTotal = String(Math.round(enrollmentUndergrad));
      }

      row.dataSourceUrl =
        `https://collegescorecard.ed.gov/school/?${match.id}`;
      row.verificationStatus = "NEEDS_REVIEW";

      updated++;
      console.log(`UPDATED: ${row.name} -> ${match["school.name"]}`);
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