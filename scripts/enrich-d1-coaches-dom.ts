// scripts/enrich-d1-coaches-dom.ts

import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OUT_DIR = path.join(process.cwd(), "data", "enrichment", "generated");

/*
 * Stores the last successful URL pattern for each school.
 *
 * The cache is loaded into memory when the script starts and written
 * back to disk whenever a school produces a complete result.
 */
const SUCCESSFUL_PATTERN_CACHE_FILE = path.join(
  process.cwd(),
  "data",
  "enrichment",
  "college-baseball-coach-url-patterns.json",
);

type CandidateUrl = {
  url: string;
  pattern: string;
};

type SuccessfulPatternCache = Record<string, string>;

const SPECIAL_COACH_URLS: Record<string, CandidateUrl[]> = {
  "university-of-michigan": [
    {
      pattern: "custom-coaches-page",
      url: "https://mgoblue.com/sports/2017/6/28/baseball-coaches",
    },
  ],

  /*
   * Coastal publishes its incoming/current staff on the unversioned
   * roster before some year-specific and cached pages are updated.
   *
   * Keep this URL ahead of the learned pattern so stale Coastal staff
   * are not carried forward after coaching changes.
   */
  "coastal-carolina-university": [
    {
      pattern: "current-roster",
      url: "https://goccusports.com/sports/baseball/roster",
    },
  ],
};

const stamp = new Date().toISOString().replace(/[:.]/g, "-");

const OUT_FILE = path.join(
  OUT_DIR,
  `college-baseball-coaches.dom.generated.${stamp}.csv`,
);

const limitArg = process.argv.find((arg) =>
  arg.startsWith("--limit="),
);

const schoolEqualsArg = process.argv.find((arg) =>
  arg.startsWith("--school="),
);

const schoolFlagIndex = process.argv.findIndex(
  (arg) => arg === "--school",
);

const programIdEqualsArg = process.argv.find((arg) =>
  arg.startsWith("--program-id="),
);

const programIdFlagIndex = process.argv.findIndex(
  (arg) => arg === "--program-id",
);

const LIMIT = limitArg
  ? Number(limitArg.split("=")[1])
  : undefined;

const SCHOOL_FILTER =
  schoolEqualsArg?.slice("--school=".length).trim() ||
  (
    schoolFlagIndex >= 0
      ? process.argv[schoolFlagIndex + 1]?.trim()
      : ""
  ) ||
  undefined;

const PROGRAM_ID_FILTER =
  programIdEqualsArg
    ?.slice("--program-id=".length)
    .trim() ||
  (
    programIdFlagIndex >= 0
      ? process.argv[programIdFlagIndex + 1]?.trim()
      : ""
  ) ||
  undefined;

const ZERO_COACHES_ONLY =
  process.argv.includes("--zero-coaches");

const DRY_RUN =
  process.argv.includes("--dry-run");

/*
 * A result above this threshold is probably an athletics-wide
 * staff directory rather than one baseball program's staff.
 */
const MAX_COACH_RECORDS_PER_PAGE = 20;
const MIN_EXPECTED_COACH_RECORDS = 2;

let emailWarningCount = 0;

/*
 * Determine the active college baseball roster season.
 *
 * Most programs begin publishing the next season's roster during
 * the fall. Before September, use the current calendar year.
 * Beginning in September, prefer the next calendar year.
 */
const today = new Date();

const CURRENT_ROSTER_YEAR =
  today.getMonth() >= 8 ? today.getFullYear() + 1 : today.getFullYear();

function loadSuccessfulPatternCache(): SuccessfulPatternCache {
  try {
    if (!fs.existsSync(SUCCESSFUL_PATTERN_CACHE_FILE)) {
      return {};
    }

    const raw = fs.readFileSync(SUCCESSFUL_PATTERN_CACHE_FILE, "utf8");

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

return Object.fromEntries(
  Object.entries(parsed)
    .filter(
      ([slug, pattern]) =>
        Boolean(slug) &&
        typeof pattern === "string" &&
        Boolean(pattern),
    )
    .map(
      ([slug, pattern]) =>
        [slug, pattern] as [string, string],
    ),
);
  } catch (error) {
    console.warn(
      `⚠️ Could not load URL-pattern cache; continuing without it: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );

    return {};
  }
}

function saveSuccessfulPatternCache(cache: SuccessfulPatternCache) {
  try {
    fs.mkdirSync(path.dirname(SUCCESSFUL_PATTERN_CACHE_FILE), {
      recursive: true,
    });

    /*
     * Write to a temporary file first so an interrupted process does
     * not leave behind a partially written JSON cache.
     */
    const temporaryFile = `${SUCCESSFUL_PATTERN_CACHE_FILE}.tmp`;

    fs.writeFileSync(
      temporaryFile,
      `${JSON.stringify(cache, null, 2)}\n`,
      "utf8",
    );

    fs.renameSync(temporaryFile, SUCCESSFUL_PATTERN_CACHE_FILE);
  } catch (error) {
    console.warn(
      `⚠️ Could not save URL-pattern cache: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

type ReviewStatus = "AUTO_IMPORTED" | "NEEDS_REVIEW" | "NEEDS_MANUAL_REVIEW";

type CoachRecord = {
  name: string;
  title: string;
  email: string;
  phone: string;
  bioUrl: string;
  contactUrl: string;
  headshotUrl: string;
  xUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  isHeadCoach: boolean;
  reviewStatus: ReviewStatus;
};

type RunStats = {
  programsScanned: number;
  successfulPrograms: number;
  programsWithoutCoachCards: number;
  coachRecordsParsed: number;
  emailWarnings: number;
  cachedPatternsLoaded: number;
  cachedPatternsLearned: number;
  urlAttempts: number;
};

function csvEscape(value: unknown) {
  const s = String(value ?? "");

  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }

  return s;
}

function normalizeUrl(url: string | null | undefined) {
  const trimmed = String(url ?? "").trim();

  if (!trimmed) return null;

  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function buildCandidateUrls(
  baseUrl: string | null | undefined,
  rosterYear: number,
  preferredPattern?: string,
): CandidateUrl[] {
  const base = normalizeUrl(baseUrl);

  if (!base) return [];

  /*
   * Try the active roster year first, then the prior year for schools
   * that have not yet rolled their athletics site forward.
   */
  const rosterYears = Array.from(new Set([rosterYear, rosterYear - 1]));

  const candidates: CandidateUrl[] = [];

  const currentYear = rosterYears[0];
  const priorYears = rosterYears.slice(1);

  /*
   * Prefer the active season first.
   */
  candidates.push(
    {
      pattern: "prestosports-coaches-index",
      url: `${base}/coaches/index`,
    },
    {
      pattern: "coaches-year",
      url: `${base}/coaches/${currentYear}`,
    },
    {
      pattern: "roster-year-sidearm",
      url: `${base}/roster/${currentYear}#sidearm-roster-coaches`,
    },
    {
      pattern: "roster-year-coaches-anchor",
      url: `${base}/roster/${currentYear}#coaches`,
    },
    {
      pattern: "roster-year",
      url: `${base}/roster/${currentYear}`,
    },
  );

  /*
   * Next try unversioned pages, which athletics sites generally use
   * for the actively published staff.
   *
   * These must be attempted before prior-year pages so a temporary
   * failure on the current-year URL does not import stale coaches.
   */
  candidates.push(
    {
      pattern: "coaches",
      url: `${base}/coaches`,
    },
    {
      pattern: "roster-sidearm",
      url: `${base}/roster#sidearm-roster-coaches`,
    },
    {
      pattern: "roster-coaches-anchor",
      url: `${base}/roster#coaches`,
    },
    {
      pattern: "roster-coaches",
      url: `${base}/roster/coaches`,
    },
    {
      pattern: "roster-staff",
      url: `${base}/roster/staff`,
    },
    {
      pattern: "coaching-staff",
      url: `${base}/coaching-staff`,
    },
    {
      pattern: "roster",
      url: `${base}/roster`,
    },
    {
      pattern: "program-root",
      url: base,
    },
  );

  /*
   * Use prior-season pages only as the final fallback.
   */
  for (const year of priorYears) {
    candidates.push(
      {
        pattern: "coaches-year",
        url: `${base}/coaches/${year}`,
      },
      {
        pattern: "roster-year-sidearm",
        url: `${base}/roster/${year}#sidearm-roster-coaches`,
      },
      {
        pattern: "roster-year-coaches-anchor",
        url: `${base}/roster/${year}#coaches`,
      },
      {
        pattern: "roster-year",
        url: `${base}/roster/${year}`,
      },
    );
  }

  /*
   * Remove duplicate URLs while preserving their original ordering.
   */
  const uniqueCandidates = candidates.filter(
    (candidate, index, allCandidates) =>
      allCandidates.findIndex((other) => other.url === candidate.url) === index,
  );

  if (!preferredPattern) {
    return uniqueCandidates;
  }

  /*
   * Stable-sort the previously successful pattern to the front.
   *
   * A generic pattern is cached rather than the exact URL, so a school
   * that previously succeeded at /roster/2026 can automatically try
   * /roster/2027 first during the next season.
   */
  return [
    ...uniqueCandidates.filter(
      (candidate) => candidate.pattern === preferredPattern,
    ),
    ...uniqueCandidates.filter(
      (candidate) => candidate.pattern !== preferredPattern,
    ),
  ];
}

function absolutizeUrl(url: string, origin: string) {
  try {
    return new URL(url, origin).toString();
  } catch {
    return "";
  }
}

function normalizeSocialUrl(
  rawUrl: string,
  origin: string,
  platform: "x" | "instagram" | "linkedin",
) {
  const raw = String(rawUrl ?? "").trim();

  if (!raw) return "";

  let absoluteUrl = absolutizeUrl(raw, origin);

  if (!absoluteUrl) return "";

  /*
   * Some athletics sites accidentally produce URLs like:
   *
   * https://twitter.com/https://twitter.com/CoachMegahee
   *
   * When the domain appears more than once, retain the final social
   * profile path rather than the malformed outer URL.
   */
  if (platform === "x") {
    const duplicateTwitterMatch = absoluteUrl.match(
      /(?:twitter\.com|x\.com)\/https?:\/\/(?:twitter\.com|x\.com)\/([^/?#]+)/i,
    );

    if (duplicateTwitterMatch?.[1]) {
      absoluteUrl = `https://twitter.com/${duplicateTwitterMatch[1]}`;
    }
  }

  try {
    const parsed = new URL(absoluteUrl);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");

    if (
      platform === "x" &&
      hostname !== "twitter.com" &&
      hostname !== "x.com"
    ) {
      return "";
    }

    if (platform === "instagram" && hostname !== "instagram.com") {
      return "";
    }

    if (
      platform === "linkedin" &&
      hostname !== "linkedin.com" &&
      !hostname.endsWith(".linkedin.com")
    ) {
      return "";
    }

    /*
     * Twitter links occasionally use /@handle. Twitter's actual profile
     * URL format does not include the @ symbol.
     */
    if (platform === "x") {
      parsed.pathname = parsed.pathname.replace(/^\/@/, "/");
    }

    parsed.hash = "";

    return parsed.toString();
  } catch {
    return "";
  }
}

function socialUrlMatchesCoach(socialUrl: string, coachName: string) {
  if (!socialUrl) return false;

  let handle = "";

  try {
    const parsed = new URL(socialUrl);

    handle = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
  } catch {
    return false;
  }

  const normalizedHandle = handle
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]/g, "");

  if (!normalizedHandle) return false;

  const nameParts = cleanText(coachName)
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((part) => !["jr", "sr", "ii", "iii", "iv"].includes(part));

  if (nameParts.length < 2) return false;

  const firstName = nameParts[0].replace(/[^a-z0-9]/g, "");
  const lastName = nameParts[nameParts.length - 1].replace(/[^a-z0-9]/g, "");

  const firstInitial = firstName[0] ?? "";
  const lastInitial = lastName[0] ?? "";

  const expectedFragments = [
    firstName,
    lastName,
    `${firstName}${lastName}`,
    `${lastName}${firstName}`,
    `${firstInitial}${lastName}`,
    `${lastName}${firstInitial}`,
    `${firstName}${lastInitial}`,
  ].filter((value) => value.length >= 3);

  const directMatch = expectedFragments.some(
    (fragment) =>
      normalizedHandle.includes(fragment) ||
      fragment.includes(normalizedHandle),
  );

  if (directMatch) {
    return true;
  }

  /*
   * Allow common first-name variations and shortened surnames in
   * handles, such as:
   *
   * Steve Rodriguez -> stevierod
   *
   * Require both pieces to match so a broad first-name-only match does
   * not assign another coach's account.
   */
  const firstNamePrefix =
    firstName.length >= 4 ? firstName.slice(0, 4) : firstName;

  const lastNamePrefix = lastName.length >= 3 ? lastName.slice(0, 3) : lastName;

  return (
    Boolean(firstNamePrefix) &&
    Boolean(lastNamePrefix) &&
    normalizedHandle.includes(firstNamePrefix) &&
    normalizedHandle.includes(lastNamePrefix)
  );
}

function cleanText(value: string) {
  return String(value ?? "")
    .replace(/<br\s*\/?\s*>/gi, " / ")
    .replace(/<\/br\s*>/gi, " / ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(value: string) {
  return (
    cleanText(value)
      .replace(/\s*\/\s*\/\s*/g, " / ")
      .replace(
        /Coach(?=(Pitching|Hitting|Catching|Recruiting|Director|Infield|Outfield))/g,
        "Coach / ",
      )
      .replace(
        /Development(?=(Pitching|Hitting|Catching|Recruiting|Director|Infield|Outfield))/g,
        "Development / ",
      )
      .replace(
        /Coordinator(?=(Pitching|Hitting|Catching|Recruiting|Director|Infield|Outfield))/g,
        "Coordinator / ",
      )
      .replace(
        /Operations(?=(Pitching|Hitting|Catching|Recruiting|Director|Infield|Outfield))/g,
        "Operations / ",
      )
      .replace(/\s*\/\s*/g, " / ")
      /*
       * Remove dangling separators left behind by empty HTML fields.
       *
       * Examples:
       * "Head Coach / Pitching Coach /"
       * becomes:
       * "Head Coach / Pitching Coach"
       */
      .replace(/\s*(?:\/|-|–|—)\s*$/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function normalizeTitleForComparison(value: string) {
  return normalizeTitle(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function looksLikeExcludedStaffTitle(value: string) {
  const v = normalizeTitle(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (!v) return true;

  /*
   * Exclude student, medical, communications, and equipment-support roles
   * that may appear beside legitimate baseball staff.
   *
   * Keep legitimate titles such as:
   * - Graduate Assistant
   * - Graduate Assistant Manager
   * - Volunteer Assistant Coach
   * - Baseball Operations Assistant
   */
  return [
    /\bstudent assistant\b/i,
    /\bstudent manager\b/i,
    /\bundergraduate assistant\b/i,

    /\bathletic trainer\b/i,
    /\bathletic training\b/i,
    /\bsports medicine\b/i,

    /\bathletic communications\b/i,
    /\bcommunications graduate assistant\b/i,
    /\bgraduate assistant (?:for|in) communications\b/i,
    /\bmedia relations\b/i,

    /\bequipment graduate assistant\b/i,
    /\bgraduate assistant\b.*\bequipment\b/i,

    /*
     * Exclude entries such as:
     * "Volunteer - Baseball Operations"
     *
     * Do not exclude legitimate "Volunteer Assistant" or
     * "Volunteer Assistant Coach" titles.
     */
    /^volunteer\s*[-–—:]\s*/i,
  ].some((pattern) => pattern.test(v));
}

function looksLikeCoachTitle(value: string) {
  const v = normalizeTitle(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (!v) return false;

  /*
   * Section headings are not individual staff titles.
   *
   * Without this guard, headings such as "2026 Baseball Coaching Staff"
   * can be assigned to the first coach when a site's title field is
   * missing or structured differently.
   */
  if (
    /^(?:\d{4}\s+)?baseball coaching staff$/.test(v) ||
    /^(?:\d{4}\s+)?coaching staff$/.test(v) ||
    /^(?:\d{4}\s+)?baseball staff$/.test(v) ||
    /^(?:\d{4}\s+)?baseball support staff$/.test(v)
  ) {
    return false;
  }

  /*
   * Explicit exclusions must win before positive title matching.
   *
   * For example, "Student Assistant Coach" contains "assistant coach"
   * but should not be treated as an importable staff contact.
   */
  if (looksLikeExcludedStaffTitle(v)) {
    return false;
  }

  return [
    "head coach",
    "head baseball coach",
    "head coaching chair",

    "assistant head coach",
    "associate head coach",
    "associate head baseball coach",

    "assistant coach",
    "assistant baseball coach",
    "associate a.d./baseball",
    "associate ad/baseball",
    "baseball coach",

    "pitching coach",
    "hitting coach",
    "catching coach",

    "recruiting coordinator",
    "director of recruiting",

    "director of baseball",
    "director of baseball operations",
    "assistant director of baseball operations",
    "coordinator of baseball operations",
    "baseball operations coordinator",
    "baseball operations assistant",
    "baseball operations",

    "director of operations",

    "director of player development",
    "assistant director of player development",
    "director of player development and scouting",
    "director of program & player development",
    "director of program and player development",
    "director of baseball player development",
    "coordinator of baseball player development",
    "player development coordinator",
    "player development assistant",
    "player development",

    "director of player personnel",
    "director of baseball player personnel",
    "baseball player personnel",
    "player personnel",

    "director of pitching",
    "director of pitching development",
    "director of pitching development and scouting",
    "coordinator of pitching development",
    "pitching development assistant",
    "pitching development",

    "director of hitting",

    "director of scouting",
    "scouting coordinator",

    "pitching strategist",

    "graduate assistant",
    "volunteer assistant",

    "quality control",

    "video coordinator",
    "analytics coordinator",

    "program director",
    "general manager",

    "director of defense",
    "director of baserunning",
    "director of gameplay",
  ].some((title) => v.includes(title));
}

function isHeadCoachTitle(value: string) {
  const v = normalizeTitle(value)
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!v) return false;

  /*
   * These titles contain "head coach" but are not the program's
   * actual head-coach role.
   */
  if (
    /\bassistant\s+(?:baseball\s+)?head\s+(?:baseball\s+)?coach\b/.test(v) ||
    /\bassociate\s+(?:baseball\s+)?head\s+(?:baseball\s+)?coach\b/.test(v) ||
    /\bassoc\s+(?:baseball\s+)?head\s+(?:baseball\s+)?coach\b/.test(v) ||
    /\bassistant\s+to\s+(?:the\s+)?(?:baseball\s+)?head\s+coach\b/.test(v) ||
    /\bspecial\s+assistant\s+to\s+(?:the\s+)?(?:baseball\s+)?head\s+coach\b/.test(v)
  ) {
    return false;
  }

  /*
   * Includes:
   * - Head Coach
   * - Head Baseball Coach
   * - Acting Head Coach
   * - Interim Head Coach
   * - Co-Head Coach
   * - Head Coaching Chair in Baseball
   */
  if (
    /\b(?:acting\s+|interim\s+|co[-\s]?)?head\s+(?:baseball\s+)?coach\b/.test(v) ||
    /\bhead\s+coaching\s+chair\b/.test(v)
  ) {
    return true;
  }

  /*
   * Some programs use "Director of Baseball" as the program-leading
   * title. Do not confuse it with operations, recruiting, or player
   * development roles.
   */
  return (
    /director of baseball$/.test(v) &&
    !v.includes("operations") &&
    !v.includes("player development") &&
    !v.includes("player personnel") &&
    !v.includes("recruiting")
  );
}

function normalizeExtractedCoachName(value: string) {
  return cleanText(value)
    .replace(/^full\s+bio\s+/i, "")
    .replace(/^view\s+(?:full\s+)?bio\s+/i, "")
    .replace(/^bio\s+/i, "")
    .trim();
}

function isProbablyBadCoachName(value: string) {
  const name = cleanText(value);
  const lower = name.toLowerCase();

  if (!name) return true;

  if (looksLikeCoachTitle(name)) {
    return true;
  }

  const badPhrases = [
    "name",
    "email",
    "email address",
    "full bio",
    "phone",
    "title",
    "staff",
    "staff directory",
    "directory members",
    "category department",
    "name title",
    "phone email",
    "coaching staff",
    "baseball staff",
    "roster staff",
    "additional links",
    "archived stories",
    "sport administrator",
    "view bio",
    "view full bio",
  ];

  if (badPhrases.some((phrase) => lower.includes(phrase))) {
    return true;
  }

  if (
    lower.includes("@") ||
    lower.includes("http") ||
    /\d{3}[-.)\s]\d{3}/.test(name)
  ) {
    return true;
  }

  const parts = name.split(/\s+/).filter(Boolean);

  return parts.length < 2 || parts.length > 5;
}

function looksLikePersonName(value: string) {
  const name = cleanText(value);

  if (isProbablyBadCoachName(name)) {
    return false;
  }

  return /^[A-Za-zÀ-ÖØ-öø-ÿ.'’-]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ.'’-]+){1,4}(?:\s+(?:Jr\.?|Sr\.?|II|III|IV))?$/.test(
    name,
  );
}

function normalizeNameForUrl(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCoachKey(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function cleanEmail(value: string | undefined) {
  return String(value ?? "")
    .replace(/^mailto:/i, "")
    .split("?")[0]
    .trim();
}

function cleanPhone(value: string | undefined) {
  const raw = String(value ?? "")
    .replace(/^tel:/i, "")
    .trim();

  if (!raw) {
    return "";
  }

  /*
   * Remove URL encoding and normalize visible whitespace without
   * destroying common phone-number formatting.
   */
  let decoded = raw;

  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  decoded = decoded
    .replace(/\s+/g, " ")
    .trim();

  const digits = decoded.replace(/\D/g, "");

  /*
   * Reject isolated extensions and malformed tel links.
   *
   * Examples rejected:
   *   +
   *   3657
   *   5256
   *   +4938
   *   9866002
   *
   * A usable North American number has 10 digits, or 11 digits when
   * prefixed by country code 1. International numbers may contain
   * between 10 and 15 digits.
   */
  if (digits.length < 10 || digits.length > 15) {
    return "";
  }

  if (digits.length === 11 && !digits.startsWith("1")) {
    return "";
  }

  return decoded;
}

function editDistance(a: string, b: string) {
  const left = a.toLowerCase();
  const right = b.toLowerCase();

  const matrix = Array.from({ length: left.length + 1 }, () =>
    Array<number>(right.length + 1).fill(0),
  );

  for (let i = 0; i <= left.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= right.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + substitutionCost,
      );
    }
  }

  return matrix[left.length][right.length];
}

function emailMatchesCoachOrIsGeneric(
  email: string,
  coachName: string,
) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return true;
  }

  const localPart = normalizedEmail.split("@")[0] ?? "";

  const genericEmailTerms = [
    "baseball",
    "athletics",
    "athletic",
    "recruiting",
    "recruit",
    "coaches",
    "coach",
    "sports",
    "info",
  ];

  if (genericEmailTerms.some((term) => localPart.includes(term))) {
    return true;
  }

  const nameParts = cleanText(coachName)
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (part) =>
        !["jr", "sr", "ii", "iii", "iv"].includes(part),
    );

  if (nameParts.length < 2) {
    return false;
  }

  const firstName = nameParts[0].replace(/[^a-z0-9]/g, "");
  const middleNames = nameParts
    .slice(1, -1)
    .map((part) => part.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  const lastName = nameParts[nameParts.length - 1].replace(
    /[^a-z0-9]/g,
    "",
  );

  const compoundLastName = nameParts
  .slice(1)
  .map((part) => part.replace(/[^a-z0-9]/g, ""))
  .join("");

  const firstInitial = firstName[0] ?? "";
  const middleInitials = middleNames
    .map((part) => part[0] ?? "")
    .join("");
  const lastInitial = lastName[0] ?? "";

  const compactLocalPart = localPart.replace(/[^a-z0-9]/g, "");
  const lettersOnlyLocalPart = compactLocalPart.replace(/\d+/g, "");

  if (!compactLocalPart || !lettersOnlyLocalPart) {
    return false;
  }

  /*
   * Standard institutional email formats.
   *
   * Examples:
   * johnsmith
   * jsmith
   * smithj
   * smithjohn
   * johns
   */
const exactCandidates = [
  firstName,
  lastName,
  compoundLastName,
  `${firstName}${lastName}`,
  `${firstName}${compoundLastName}`,
  `${firstInitial}${lastName}`,
  `${firstInitial}${compoundLastName}`,
  `${lastName}${firstInitial}`,
  `${compoundLastName}${firstInitial}`,
  `${lastName}${firstName}`,
  `${compoundLastName}${firstName}`,
  `${firstName}${lastInitial}`,
  `${firstInitial}${middleInitials}${lastName}`,
  `${firstInitial}${middleInitials}${lastInitial}`,
]
  .map((candidate) => candidate.replace(/[^a-z0-9]/g, ""))
  .filter((candidate) => candidate.length >= 3);

  if (
    exactCandidates.some(
      (candidate) =>
        compactLocalPart === candidate ||
        lettersOnlyLocalPart === candidate ||
        compactLocalPart.includes(candidate),
    )
  ) {
    return true;
  }

  /*
   * Recognize truncated first and last names.
   *
   * Examples:
   * Camden Duzenack -> camduz
   * Jack Van Remortel -> jvanrem
   * Ryan Colegate -> colegar
   * Cam Johnson -> camjoh31
   */
  const firstPrefixes = [
    firstName.slice(0, 3),
    firstName.slice(0, 4),
    firstName.slice(0, 5),
  ].filter((value) => value.length >= 3);

  const lastPrefixes = [
    lastName.slice(0, 3),
    lastName.slice(0, 4),
    lastName.slice(0, 5),
    lastName.slice(0, 6),
  ].filter((value) => value.length >= 3);

  if (
  compoundLastName.length >= 5 &&
  (
    lettersOnlyLocalPart.includes(
      compoundLastName.slice(0, 5),
    ) ||
    lettersOnlyLocalPart.includes(
      compoundLastName.slice(0, 6),
    )
  )
) {
  return true;
}

  const containsFirstPrefix = firstPrefixes.some((prefix) =>
    lettersOnlyLocalPart.includes(prefix),
  );

  const containsLastPrefix = lastPrefixes.some((prefix) =>
    lettersOnlyLocalPart.includes(prefix),
  );

  if (containsFirstPrefix && containsLastPrefix) {
    return true;
  }

  /*
   * A sufficiently long surname prefix is usually reliable even when
   * the institution appends initials or digits.
   *
   * Examples:
   * Doug Walters -> walte2dl
   * Justin Sumner -> sumne2jw
   * Ely Stuart -> stuar1el
   */
  if (
    lastName.length >= 5 &&
    lastPrefixes
      .filter((prefix) => prefix.length >= 5)
      .some(
        (prefix) =>
          lettersOnlyLocalPart.startsWith(prefix) ||
          lettersOnlyLocalPart.includes(prefix),
      )
  ) {
    return true;
  }

  /*
   * Some universities generate usernames containing the person's
   * initials plus digits or unrelated account characters.
   *
   * Examples:
   * Grayson Munyon -> cgm5j
   * Jackson Finney -> jxf24c
   * Casey Popham -> cfp25a
   * Matthew Frappier -> mxf23g
   *
   * Require the first and last initials to appear in the correct order.
   * This avoids accepting an arbitrary username based on one initial.
   */
  if (firstInitial && lastInitial) {
    const firstInitialIndex =
      lettersOnlyLocalPart.indexOf(firstInitial);

    const lastInitialIndex =
      lettersOnlyLocalPart.indexOf(
        lastInitial,
        firstInitialIndex + 1,
      );

    if (
      firstInitialIndex >= 0 &&
      lastInitialIndex > firstInitialIndex &&
      compactLocalPart.length >= 4 &&
      /\d/.test(compactLocalPart)
    ) {
      return true;
    }
  }

  /*
   * Permit first-name accounts and first-name-plus-initial formats.
   *
   * Examples:
   * Josh Schwartz -> joshus
   * Camden Duzenack -> camduz
   */
  if (
    firstName.length >= 4 &&
    (
      lettersOnlyLocalPart === firstName ||
      lettersOnlyLocalPart.startsWith(
        `${firstName}${lastInitial}`,
      ) ||
      (
        lettersOnlyLocalPart.startsWith(firstName.slice(0, 4)) &&
        lettersOnlyLocalPart.includes(lastInitial)
      )
    )
  ) {
    return true;
  }

  /*
   * Compare variants after removing one or two leading institutional
   * characters. This preserves the useful fuzzy surname handling from
   * the original implementation.
   */
  const localVariants = new Set<string>([
    lettersOnlyLocalPart,
    lettersOnlyLocalPart.slice(1),
    lettersOnlyLocalPart.slice(2),
  ]);

  for (const variant of localVariants) {
    if (!variant) continue;

    if (
      variant.includes(lastName) ||
      (
        variant.length >= 4 &&
        lastName.startsWith(variant)
      )
    ) {
      return true;
    }

    if (
      variant.length >= 5 &&
      lastName.length >= 5 &&
      editDistance(variant, lastName) <= 1
    ) {
      return true;
    }

    const surnamePrefix = lastName.slice(0, 5);

    if (
      surnamePrefix.length === 5 &&
      variant.startsWith(surnamePrefix)
    ) {
      return true;
    }
  }

  return false;
}

function normalizeHeadingText(value: string) {
  return cleanText(value).toLowerCase().replace(/\s+/g, " ");
}

function isCoachingStaffHeading(value: string) {
  const heading = normalizeHeadingText(value);

  return (
    heading === "coaching staff" ||
    heading === "baseball coaching staff" ||
    heading === "baseball coaches" ||
    heading === "coaches"
  );
}

function isEndOfCoachingStaffHeading(value: string) {
  const heading = normalizeHeadingText(value);

  return (
    heading.includes("support staff") ||
    heading.includes("baseball support staff") ||
    heading.includes("administrative staff") ||
    heading.includes("sports medicine") ||
    heading.includes("strength and conditioning") ||
    heading.includes("baseball roster") ||
    heading.includes("player roster") ||
    heading.includes("2026 baseball roster") ||
    heading.includes("related news") ||
    heading.includes("related videos") ||
    heading.includes("recent results") ||
    heading.includes("upcoming events")
  );
}

function looksLikeCoachProfileHref(href: string) {
  const lower = String(href ?? "")
    .toLowerCase()
    .split("#")[0]
    .split("?")[0];

  return (
    lower.includes("/coach/") ||
    lower.includes("/coaches/") ||
    lower.includes("/coache/") ||
    lower.includes("/roster/coaches/") ||
    lower.includes("/roster/staff/") ||
    /\/sports\/[^/]+\/roster\/season\/\d+\/staff\/[^/]+\/?$/.test(lower)
  );
}

function findDistinctCoachProfileNames(
  $: cheerio.CheerioAPI,
  root: cheerio.Cheerio<any>,
) {
  const names = new Set<string>();

  root
    .find("a[href]")
    .addBack("a[href]")
    .each((_, node) => {
      const anchor = $(node);
      const href = anchor.attr("href") ?? "";
      const text = cleanText(anchor.text());

      if (looksLikeCoachProfileHref(href) && looksLikePersonName(text)) {
        names.add(normalizeCoachKey(text));
      }
    });

  return names;
}

function findCoachingStaffRegions(
  $: cheerio.CheerioAPI,
): cheerio.Cheerio<any>[] {
  const regions: cheerio.Cheerio<any>[] = [];

  $("h1, h2, h3, h4, h5, h6").each((_, headingNode) => {
    const heading = $(headingNode);

    if (!isCoachingStaffHeading(heading.text())) {
      return;
    }

    const collected: any[] = [];
    let sibling = heading.next();

    while (sibling.length > 0) {
      const siblingNode = sibling.get(0);

      if (!siblingNode) break;

      const tagName = String((siblingNode as any).tagName ?? "").toLowerCase();

      const isHeading = /^h[1-6]$/.test(tagName);

      if (isHeading && isEndOfCoachingStaffHeading(sibling.text())) {
        break;
      }

      if (
        isHeading &&
        collected.length > 0 &&
        !isCoachingStaffHeading(sibling.text())
      ) {
        break;
      }

      collected.push(...sibling.toArray());
      sibling = sibling.next();
    }

    if (collected.length === 0) return;

    const wrapper = $("<div></div>");

    for (const node of collected) {
      wrapper.append($(node).clone());
    }

    regions.push(wrapper);
  });

  return regions;
}

function findCoachContainersFromProfileLinks(
  $: cheerio.CheerioAPI,
): cheerio.Cheerio<any>[] {
  const containers: cheerio.Cheerio<any>[] = [];
  const seenElements = new Set<any>();
  const processedHrefs = new Set<string>();

  $("a[href]").each((_, anchorNode) => {
    const anchor = $(anchorNode);
    const href = cleanText(anchor.attr("href") ?? "");
    const anchorText = cleanText(anchor.text());

    if (!href || !looksLikeCoachProfileHref(href)) {
      return;
    }

    /*
     * Ignore image-only links, "Full Bio", and directory navigation links.
     * We only begin container discovery from the actual person-name link.
     */
    if (!looksLikePersonName(anchorText)) {
      return;
    }

    const normalizedHref = href
      .toLowerCase()
      .split("?")[0]
      .split("#")[0]
      .replace(/\/+$/, "");

    if (!normalizedHref || processedHrefs.has(normalizedHref)) {
      return;
    }

    processedHrefs.add(normalizedHref);

    let container = anchor.parent();

    for (let depth = 0; depth < 8; depth += 1) {
      if (!container.length) {
        break;
      }

      const containerText = cleanText(container.text());

      /*
       * Count distinct person-name links in this candidate container,
       * while collapsing image/name/Full Bio links that share one href.
       */
      const distinctPeople = new Map<string, string>();

      container.find("a[href]").each((_, childNode) => {
        const child = $(childNode);
        const childHref = cleanText(child.attr("href") ?? "");
        const childText = cleanText(child.text());

        if (
          !childHref ||
          !looksLikeCoachProfileHref(childHref) ||
          !looksLikePersonName(childText)
        ) {
          return;
        }

        const normalizedChildHref = childHref
          .toLowerCase()
          .split("?")[0]
          .split("#")[0]
          .replace(/\/+$/, "");

        distinctPeople.set(normalizedChildHref, childText);
      });

      /*
       * Once the parent contains multiple different people,
       * we have climbed above the individual card.
       */
      if (distinctPeople.size > 1) {
        break;
      }

      const containsThisPerson =
        distinctPeople.get(normalizedHref) === anchorText;

      if (
        containsThisPerson &&
        looksLikeCoachTitle(containerText)
      ) {
        const element = container.get(0);

        if (element && !seenElements.has(element)) {
          seenElements.add(element);
          containers.push(container);
        }

        break;
      }

      container = container.parent();
    }
  });

  return containers;
}

function findWmtRosterStaffContainers(
  $: cheerio.CheerioAPI,
): cheerio.Cheerio<any>[] {
  const containers: cheerio.Cheerio<any>[] = [];
  const seenElements = new Set<any>();

  /*
   * WMT Digital roster pages separate coaching staff and support staff
   * into roster-staff-members__block elements.
   *
   * Each individual staff member is represented by one roster-list-item.
   */
  $(".roster-staff-members__block").each((_, blockNode) => {
    const block = $(blockNode);

    const heading = cleanText(
      block
        .find(".roster-staff-members__heading")
        .first()
        .text(),
    );

    /*
     * Only extract the coaching-staff block.
     *
     * This excludes support staff, student managers, and player cards.
     */
    if (!isCoachingStaffHeading(heading)) {
      return;
    }

    block
      .find("li.roster-list-item")
      .each((_, itemNode) => {
        const item = $(itemNode);

        const name = cleanText(
          item
            .find(
              'a.roster-list-item__title[href*="/roster/"][href*="/staff/"]',
            )
            .first()
            .text(),
        );

        const title = normalizeTitle(
          item
            .find(
              ".roster-list-item__profile-field--position",
            )
            .first()
            .text(),
        );

        if (
          !looksLikePersonName(name) ||
          !looksLikeCoachTitle(title)
        ) {
          return;
        }

        const element = item.get(0);

        if (
          !element ||
          seenElements.has(element)
        ) {
          return;
        }

        seenElements.add(element);
        containers.push(item);
      });
  });

  return containers;
}

function findCoachContainersFromRegion(
  $: cheerio.CheerioAPI,
  region: cheerio.Cheerio<any>,
) {
  const containers: cheerio.Cheerio<any>[] = [];
  const seenElements = new Set<any>();

  region.find("a[href]").each((_, anchorNode) => {
    const anchor = $(anchorNode);
    const href = anchor.attr("href") ?? "";
    const anchorText = cleanText(anchor.text());

    if (!looksLikeCoachProfileHref(href)) return;
    if (!looksLikePersonName(anchorText)) return;

    let container = anchor.parent();

    for (let depth = 0; depth < 7; depth++) {
      if (!container.length) break;

      const distinctProfileNames = findDistinctCoachProfileNames($, container);

      /*
       * Once a parent contains multiple people, every higher parent will
       * be at least as broad. Stop before neighboring coach data merges.
       */
      if (distinctProfileNames.size > 1) {
        break;
      }

      const containerText = cleanText(container.text());

      if (
        distinctProfileNames.size === 1 &&
        containerText.includes(anchorText) &&
        looksLikeCoachTitle(containerText)
      ) {
        const element = container.get(0);

        if (element && !seenElements.has(element)) {
          seenElements.add(element);
          containers.push(container);
        }

        break;
      }

      container = container.parent();
    }
  });

  return containers;
}

function extractWashingtonStateRosterRecords(
  $: cheerio.CheerioAPI,
  origin: string,
  contactUrl: string,
): CoachRecord[] {
  const records = new Map<string, CoachRecord>();
  const documentHtml = $.html();

  const coachingHeadingMatch = documentHtml.match(
    /<h[1-6][^>]*>\s*Baseball Coaching Staff\s*<\/h[1-6]>/i,
  );

  if (coachingHeadingMatch?.index === undefined) {
    return [];
  }

  const sectionStart =
    coachingHeadingMatch.index + coachingHeadingMatch[0].length;

  const remainingHtml = documentHtml.slice(sectionStart);
  const supportHeadingMatch = remainingHtml.match(
    /<h[1-6][^>]*>\s*Baseball Support Staff\s*<\/h[1-6]>/i,
  );

  const sectionHtml = supportHeadingMatch?.index !== undefined
    ? remainingHtml.slice(0, supportHeadingMatch.index)
    : remainingHtml;

  const section$ = cheerio.load(`<div id="wsu-coaching-section">${sectionHtml}</div>`);
  const sectionRoot = section$("#wsu-coaching-section");

  sectionRoot.find("a[href]").each((_, node) => {
    const anchor = section$(node);
    const href = cleanText(anchor.attr("href") ?? "");
    const name = cleanText(anchor.text());

    if (
      !href ||
      !looksLikeCoachProfileHref(href) ||
      !looksLikePersonName(name)
    ) {
      return;
    }

    const normalizedHref = href
      .toLowerCase()
      .split("?")[0]
      .split("#")[0]
      .replace(/\/+$/, "");

    let container = anchor.closest("li");

    if (!container.length) {
      container = anchor.parent();

      for (let depth = 0; depth < 8; depth += 1) {
        if (!container.length) break;

        const distinctPeople = findDistinctCoachProfileNames(
          section$,
          container,
        );

        if (distinctPeople.size > 1) {
          container = section$(node).parent();
          break;
        }

        if (looksLikeCoachTitle(container.text())) {
          break;
        }

        container = container.parent();
      }
    }

    if (!container.length || !looksLikeCoachTitle(container.text())) {
      return;
    }

    const record = extractCoachRecord(
      section$,
      container,
      origin,
      contactUrl,
    );

    if (!record) {
      return;
    }

    const key = normalizeCoachKey(record.name) || normalizedHref;

    records.set(
      key,
      mergeCoachRecords(records.get(key), record),
    );
  });

  return Array.from(records.values());
}

function titleQualityScore(title: string) {
  const normalized = normalizeTitle(title);
  const lower = normalized.toLowerCase();
  let score = normalized.length;

  if (isHeadCoachTitle(normalized)) score += 100;
  if (lower.includes("recruiting coordinator")) score += 25;
  if (lower.includes("pitching coach")) score += 20;
  if (lower.includes("hitting coach")) score += 20;
  if (lower.includes("director")) score += 10;
  if (normalized.includes(" / ")) score += 5;

  return score;
}

function applyKnownSchoolRecordCorrections(
  slug: string,
  record: CoachRecord,
): CoachRecord {
  const coachKey = normalizeCoachKey(record.name);

  /*
   * Le Moyne's staff page exposes a section heading where the first
   * coach's title would normally be expected. Mike Meola Jr. is the
   * program's head coach, so correct the malformed extracted title.
   */
  if (
    slug === "le-moyne-college" &&
    coachKey === normalizeCoachKey("Mike Meola Jr.")
  ) {
    return {
      ...record,
      title: "Head Coach",
      isHeadCoach: true,
    };
  }

  return {
    ...record,
    isHeadCoach: isHeadCoachTitle(record.title),
  };
}

function mergeCoachRecords(
  existing: CoachRecord | undefined,
  incoming: CoachRecord,
): CoachRecord {
  if (!existing) {
    return incoming;
  }

  const betterTitle =
    titleQualityScore(incoming.title) > titleQualityScore(existing.title)
      ? incoming.title
      : existing.title;

  const merged: CoachRecord = {
    name:
      incoming.name.length > existing.name.length
        ? incoming.name
        : existing.name,
    title: normalizeTitle(betterTitle),
    email: existing.email || incoming.email,
    phone: existing.phone || incoming.phone,
    bioUrl: existing.bioUrl || incoming.bioUrl,
    contactUrl: existing.contactUrl || incoming.contactUrl,
    headshotUrl: existing.headshotUrl || incoming.headshotUrl,
    xUrl: existing.xUrl || incoming.xUrl,
    instagramUrl: existing.instagramUrl || incoming.instagramUrl,
    linkedinUrl: existing.linkedinUrl || incoming.linkedinUrl,
    isHeadCoach: false,
reviewStatus:
  (
    existing.reviewStatus === "AUTO_IMPORTED" ||
    incoming.reviewStatus === "AUTO_IMPORTED"
  ) &&
  Boolean(
    existing.email ||
    incoming.email ||
    existing.bioUrl ||
    incoming.bioUrl ||
    existing.headshotUrl ||
    incoming.headshotUrl ||
    existing.xUrl ||
    incoming.xUrl ||
    existing.instagramUrl ||
    incoming.instagramUrl ||
    existing.linkedinUrl ||
    incoming.linkedinUrl
  )
    ? "AUTO_IMPORTED"
    : "NEEDS_REVIEW",
  };

  merged.isHeadCoach = isHeadCoachTitle(merged.title);

  return merged;
}

function extractCoachRecord(
  $: cheerio.CheerioAPI,
  root: cheerio.Cheerio<any>,
  origin: string,
  contactUrl: string,
): CoachRecord | null {
  const nameSelectors = [
    ".sidearm-roster-player-name",
    ".sidearm-staff-member-name",
    ".staff-name",
    ".coach-name",
    ".name",
    "[class*='name']",
    "h2",
    "h3",
    "h4",
    "strong",
  ];

  const titleSelectors = [
    ".sidearm-roster-player-position",
    ".sidearm-staff-member-title",
    ".staff-title",
    ".coach-title",
    ".position",
    ".title",
    "[class*='position']",
    "[class*='title']",
  ];

  const profileAnchor = root
    .find("a[href]")
    .addBack("a[href]")
    .filter((_, node) => {
      const anchor = $(node);
      const href = anchor.attr("href") ?? "";
      const text = cleanText(anchor.text());

      return looksLikeCoachProfileHref(href) && looksLikePersonName(text);
    })
    .first();

let name = normalizeExtractedCoachName(
  profileAnchor.text(),
);
  let title = "";

  if (!name) {
    for (const selector of nameSelectors) {
      const candidates = root.find(selector).addBack(selector);

      candidates.each((_, node) => {
        if (name) return;

        const value = normalizeExtractedCoachName(
  $(node).text(),
);

        if (looksLikePersonName(value)) {
          name = value;
        }
      });

      if (name) break;
    }
  }

  for (const selector of titleSelectors) {
    const candidates = root.find(selector).addBack(selector);

    candidates.each((_, node) => {
      if (title) return;

      const value = normalizeTitle($(node).text());

      if (looksLikeCoachTitle(value) && value.length <= 180) {
        title = value;
      }
    });

    if (title) break;
  }

/*
 * Sidearm staff tables commonly place the person's name in a <th>
 * and the title in one of the following <td> cells. Preserve nested
 * text here; removing child elements can also remove the actual title.
 */
if (root.is("tr") && (!name || !title)) {
  const rowPieces = root
    .children("th, td")
    .map((_, node) =>
      normalizeTitle($(node).text()),
    )
    .get()
    .filter(
      (value) =>
        Boolean(value) &&
        value.length <= 180,
    );

  if (!name) {
    name =
      rowPieces.find((value) =>
        looksLikePersonName(value),
      ) ?? "";
  }

  if (!title) {
    title =
      rowPieces.find((value) =>
        looksLikeCoachTitle(value),
      ) ?? "";
  }
}

  if (!name || !title) {
    const directPieces: string[] = [];

    root
      .children("td, th, div, span, p, h2, h3, h4, strong")
      .each((_, node) => {
        const value = normalizeTitle(
          $(node).clone().children().remove().end().text(),
        );

        if (value && value.length <= 180 && !directPieces.includes(value)) {
          directPieces.push(value);
        }
      });

    if (!name) {
      name =
  directPieces
    .map(normalizeExtractedCoachName)
    .find((value) => looksLikePersonName(value)) ?? "";
    }

    if (!title) {
      title = directPieces.find((value) => looksLikeCoachTitle(value)) ?? "";
    }
  }

  name = normalizeExtractedCoachName(name);

  title = normalizeTitle(title);

if (
  !name ||
  !title ||
  isProbablyBadCoachName(name) ||
  !looksLikeCoachTitle(title)
) {
  return null;
}

const emailCandidates = Array.from(
  new Set(
    root
      .find('a[href^="mailto:"]')
      .addBack('a[href^="mailto:"]')
      .map((_, node) =>
        cleanEmail($(node).attr("href")),
      )
      .get()
      .filter(Boolean),
  ),
);

/*
 * Broad fallback containers can include mailto links belonging to
 * neighboring staff members. Prefer a candidate that matches the
 * current coach or is clearly a shared baseball/program inbox.
 */
const extractedEmail =
  emailCandidates.find((candidate) =>
    emailMatchesCoachOrIsGeneric(candidate, name),
  ) ?? "";

const rejectedEmailCandidates =
  emailCandidates.filter(
    (candidate) =>
      !emailMatchesCoachOrIsGeneric(candidate, name),
  );

const rejectedMismatchedEmail =
  !extractedEmail &&
  rejectedEmailCandidates.length > 0;

if (rejectedMismatchedEmail) {
  emailWarningCount += 1;

  console.log(
    `    ⚠️ possible mismatched email rejected: ${name} <- ${rejectedEmailCandidates.join(
      ", ",
    )}`,
  );
}

  const phone = cleanPhone(root.find('a[href^="tel:"]').first().attr("href"));

  const normalizedName = normalizeNameForUrl(name);
  const nameParts = normalizedName.split("-").filter(Boolean);
  const lastName = nameParts[nameParts.length - 1] ?? "";

  let bioUrl = "";

  root.find("a[href]").each((_, node) => {
    if (bioUrl) return;

    const anchor = $(node);
    const href = anchor.attr("href") ?? "";
    const anchorText = cleanText(anchor.text()).toLowerCase();
    const absoluteHref = absolutizeUrl(href, origin);
    const normalizedHref = normalizeNameForUrl(absoluteHref);

  const isPossibleBio =
      href.includes("/staff/") ||
      href.includes("/staff-directory/") ||
      href.includes("/coaches/") ||
      href.includes("/bio/") ||
      href.includes("/coache/") ||
      href.includes("/support-staff/") ||
      href.includes("/roster/staff/");

    const matchesPerson =
      Boolean(lastName) &&
      (normalizedHref.includes(lastName) || anchorText.includes(lastName));

    if (isPossibleBio && matchesPerson) {
      bioUrl = absoluteHref;
    }
  });

  const image =
    root.find("img").first().attr("src") ||
    root.find("img").first().attr("data-src") ||
    root.find("img").first().attr("data-lazy-src") ||
    "";

  const headshotUrl =
    image && !image.startsWith("data:") && !image.startsWith("blob:")
      ? absolutizeUrl(image, origin)
      : "";

  let xUrl = "";
  let instagramUrl = "";
  let linkedinUrl = "";

  root.find("a[href]").each((_, node) => {
    const href = $(node).attr("href") ?? "";

    if (
      !xUrl &&
      (href.toLowerCase().includes("twitter.com") ||
        href.toLowerCase().includes("x.com"))
    ) {
      const candidateUrl = normalizeSocialUrl(href, origin, "x");

      /*
       * Broader fallback containers can contain social links belonging
       * to neighboring coaches. Only retain the link when its handle
       * reasonably matches the current coach's name.
       */
      if (candidateUrl && socialUrlMatchesCoach(candidateUrl, name)) {
        xUrl = candidateUrl;
      }
    }

    if (!instagramUrl && href.toLowerCase().includes("instagram.com")) {
      const candidateUrl = normalizeSocialUrl(href, origin, "instagram");

      if (candidateUrl && socialUrlMatchesCoach(candidateUrl, name)) {
        instagramUrl = candidateUrl;
      }
    }

    if (!linkedinUrl && href.toLowerCase().includes("linkedin.com")) {
      const candidateUrl = normalizeSocialUrl(href, origin, "linkedin");

      if (candidateUrl && socialUrlMatchesCoach(candidateUrl, name)) {
        linkedinUrl = candidateUrl;
      }
    }
  });

const hasStrongIdentity =
  Boolean(extractedEmail) ||
  Boolean(bioUrl) ||
  Boolean(headshotUrl) ||
  Boolean(xUrl) ||
  Boolean(instagramUrl) ||
  Boolean(linkedinUrl);

  return {
    name,
    title,
    email: extractedEmail,
    phone,
    bioUrl,
    contactUrl,
    headshotUrl,
    xUrl,
    instagramUrl,
    linkedinUrl,
    isHeadCoach: isHeadCoachTitle(title),
    reviewStatus: rejectedMismatchedEmail
      ? "NEEDS_REVIEW"
      : hasStrongIdentity
        ? "AUTO_IMPORTED"
        : "NEEDS_REVIEW",
  };
}

function printRunSummary(stats: RunStats) {
  const averageUrlAttempts =
    stats.programsScanned > 0 ? stats.urlAttempts / stats.programsScanned : 0;

  const successRate =
    stats.programsScanned > 0
      ? ((stats.successfulPrograms / stats.programsScanned) * 100).toFixed(1)
      : "0.0";

  console.log("");
  console.log("=================================================");
  console.log("D1 BASEBALL COACH ENRICHMENT SUMMARY");
  console.log("=================================================");
  console.log(`Programs scanned:              ${stats.programsScanned}`);
  console.log(`Successful programs:           ${stats.successfulPrograms}`);
  console.log(
    `No structured coach cards:     ${stats.programsWithoutCoachCards}`,
  );
  console.log(`Success rate:                  ${successRate}%`);
  console.log(`Coach records parsed:          ${stats.coachRecordsParsed}`);
  console.log(`Possible email mismatches:     ${stats.emailWarnings}`);
  console.log(`Cached patterns loaded:        ${stats.cachedPatternsLoaded}`);
  console.log(`New cached patterns learned:   ${stats.cachedPatternsLearned}`);
  console.log(`Total URL attempts:            ${stats.urlAttempts}`);
  console.log(
    `Average attempts per program:  ${averageUrlAttempts.toFixed(2)}`,
  );
  console.log("=================================================");
}

async function fetchHtml(url: string) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 ScoutLineBot/1.0 Coach Enrichment",
      },
    });

    if (!res.ok) return null;

    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRenderedHtml(
  url: string,
  slug: string,
): Promise<{
  html: string;
  finalUrl: string;
  title: string;
} | null> {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/131.0.0.0 Safari/537.36",
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    await page
      .waitForLoadState("networkidle", {
        timeout: 15_000,
      })
      .catch(() => undefined);

    /*
     * Different athletics platforms expose staff in different ways.
     * Wait for any likely coach-row or coach-profile structure rather
     * than requiring Gardner-Webb's one exact profile-link format.
     */
    await page
      .waitForSelector(
        [
          "table tr",
          ".sidearm-roster-coach",
          ".sidearm-staff-member",
          ".sidearm-roster-staff",
          ".coach-card",
          ".staff-card",
          "[class*='coach-card']",
          "[class*='staff-member']",
          'a[href*="/roster/coaches/"]',
          'a[href*="/staff-directory/"]',
          'a[href*="/staff/"]',
          'a[href*="/coaches/"]',
        ].join(", "),
        {
          timeout: 15_000,
        },
      )
      .catch(() => undefined);

      const finalUrl = page.url();
const title = await page.title();

console.log(
  `    rendered final URL: ${finalUrl}`,
);
console.log(
  `    rendered title: ${title || "(blank)"}`,
);

    const renderedHtml = await page.content();

    const debugDirectory = path.join(
      process.cwd(),
      "data",
      "enrichment",
      "debug",
    );

    fs.mkdirSync(debugDirectory, {
      recursive: true,
    });

    fs.writeFileSync(
      path.join(
        debugDirectory,
        `${slug}-rendered.html`,
      ),
      renderedHtml,
      "utf8",
    );

    return {
  html: renderedHtml,
  finalUrl,
  title,
};
  } catch (error) {
    console.warn(
      `    rendered fetch failed: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    );

    return null;
  } finally {
    await browser.close();
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const successfulPatternCache = loadSuccessfulPatternCache();

  const initialCachedPatternCount = Object.keys(successfulPatternCache).length;

  console.log(
    `Loaded ${initialCachedPatternCount} cached successful URL pattern(s).`,
  );

  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "GENERATE CSV"}`);

if (SCHOOL_FILTER) {
  console.log(`School filter: ${SCHOOL_FILTER}`);
}

if (PROGRAM_ID_FILTER) {
  console.log(`Program ID filter: ${PROGRAM_ID_FILTER}`);
}

if (ZERO_COACHES_ONLY) {
  console.log("Filter: zero-coach programs only");
}

if (LIMIT) {
  console.log(`Limit: ${LIMIT}`);
}

const programs =
  await prisma.collegeBaseballProgram.findMany({
    where: {
      division: "NCAA_D1",

      ...(PROGRAM_ID_FILTER
        ? {
            id: PROGRAM_ID_FILTER,
          }
        : {}),

      ...(SCHOOL_FILTER
        ? {
            college: {
              is: {
                OR: [
                  {
                    name: {
                      equals: SCHOOL_FILTER,
                      mode: "insensitive",
                    },
                  },
                  {
                    slug: {
                      equals: SCHOOL_FILTER,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            },
          }
        : {}),

      ...(ZERO_COACHES_ONLY
        ? {
            coaches: {
              none: {},
            },
          }
        : {}),

      baseballWebsiteUrl: {
        not: null,
      },
    },

    include: {
      college: true,
    },

    orderBy: [
      {
        conference: "asc",
      },
      {
        college: {
          name: "asc",
        },
      },
    ],

    ...(LIMIT ? { take: LIMIT } : {}),
  });

  const stats: RunStats = {
    programsScanned: programs.length,
    successfulPrograms: 0,
    programsWithoutCoachCards: 0,
    coachRecordsParsed: 0,
    emailWarnings: 0,
    cachedPatternsLoaded: initialCachedPatternCount,
    cachedPatternsLearned: 0,
    urlAttempts: 0,
  };

  console.log(`Scanning ${programs.length} D1 programs...`);

  const rows: string[][] = [
    [
      "slug",
      "name",
      "title",
      "email",
      "phone",
      "bioUrl",
      "contactUrl",
      "headshotUrl",
      "xUrl",
      "instagramUrl",
      "linkedinUrl",
      "isHeadCoach",
      "reviewStatus",
    ],
  ];

  const partialSchools: Array<{
    slug: string;
    name: string;
    count: number;
  }> = [];

  for (const program of programs) {
    const slug = program.college.slug;

    console.log(`\n${program.college.name}`);
    console.log(`  slug: ${slug}`);

    const preferredPattern = successfulPatternCache[slug];

    if (preferredPattern) {
      console.log(`  cached pattern: ${preferredPattern}`);
    }

    const standardCandidates = buildCandidateUrls(
      program.baseballWebsiteUrl,
      CURRENT_ROSTER_YEAR,
      preferredPattern,
    );

const rawCandidates = [
  ...(SPECIAL_COACH_URLS[slug] ?? []),
  ...standardCandidates,
].filter(
  (candidate, index, allCandidates) =>
    allCandidates.findIndex(
      (other) => other.url === candidate.url,
    ) === index,
);

/*
 * Houston's current roster page may publish the returning staff before
 * the incoming head coach is added. When that happens, prefer current
 * coaches pages before looking at prior-year rosters, which would merge
 * stale coaches into the current staff.
 */
const candidates =
  slug === "university-of-houston"
    ? [
        /*
         * Houston's unversioned roster currently contains the incoming,
         * current staff. If it is already cached as the successful pattern,
         * try it first so future runs complete in one request.
         */
        ...rawCandidates.filter(
          (candidate) =>
            candidate.pattern ===
              successfulPatternCache[slug],
        ),

        /*
         * If the cache is missing or stale, prefer the unversioned roster
         * before year-specific pages because Houston publishes the newest
         * staff there first.
         */
        ...rawCandidates.filter(
          (candidate) =>
            candidate.pattern === "roster-sidearm" &&
            candidate.pattern !==
              successfulPatternCache[slug],
        ),

        ...rawCandidates.filter(
          (candidate) =>
            candidate.pattern === "coaches",
        ),

        ...rawCandidates.filter(
          (candidate) =>
            candidate.pattern === "coaches-year" &&
            candidate.url.includes(
              `/coaches/${CURRENT_ROSTER_YEAR}`,
            ),
        ),

        ...rawCandidates.filter(
          (candidate) =>
            candidate.pattern ===
              "roster-year-sidearm" &&
            candidate.url.includes(
              `/roster/${CURRENT_ROSTER_YEAR}`,
            ),
        ),

        ...rawCandidates.filter(
          (candidate) =>
            candidate.pattern !==
              successfulPatternCache[slug] &&
            candidate.pattern !== "roster-sidearm" &&
            candidate.pattern !== "coaches" &&
            !(
              candidate.pattern === "coaches-year" &&
              candidate.url.includes(
                `/coaches/${CURRENT_ROSTER_YEAR}`,
              )
            ) &&
            !(
              candidate.pattern ===
                "roster-year-sidearm" &&
              candidate.url.includes(
                `/roster/${CURRENT_ROSTER_YEAR}`,
              )
            ) &&
            !candidate.url.includes(
              `/roster/${CURRENT_ROSTER_YEAR - 1}`,
            ) &&
            !candidate.url.includes(
              `/coaches/${CURRENT_ROSTER_YEAR - 1}`,
            ),
        ),
      ].filter(
        (candidate, index, allCandidates) =>
          allCandidates.findIndex(
            (other) => other.url === candidate.url,
          ) === index,
      )
    : rawCandidates;

const schoolRecords = new Map<string, CoachRecord>();
let found = false;

if (slug !== "gardner-webb-university") {
  for (const candidate of candidates) {
    const { url, pattern } = candidate;

    stats.urlAttempts += 1;

    console.log(
      `  trying: ${url}` +
        (pattern === preferredPattern ? " [cached pattern]" : ""),
    );

      const html = await fetchHtml(url);

      if (!html) continue;

      const origin = new URL(url).origin;

      const $ = cheerio.load(html);

      const pageRecords = new Map<string, CoachRecord>();

      const addCoachRecord = (root: cheerio.Cheerio<any>) => {
        const record = extractCoachRecord($, root, origin, url);

        if (!record) return;

        const key = normalizeCoachKey(record.name);

        if (!key) return;

        pageRecords.set(key, mergeCoachRecords(pageRecords.get(key), record));
      };

      $("table tr").each((_, el) => {
        addCoachRecord($(el));
      });

      const coachCards = $(
        [
          ".sidearm-roster-player",
          ".sidearm-roster-coach",
          ".sidearm-staff-member",
          ".sidearm-roster-staff",
          ".s-person-card",
          ".coach-card",
          ".staff-card",
          ".coaches__item",
          ".coaching-staff__item",
          ".roster-coach",
          ".roster-staff",
          "[class*='coach-card']",
          "[class*='coach_item']",
          "[class*='coach-item']",
          "[class*='staff-card']",
          "[class*='staff-member']",
          "[class*='staff_item']",
          "[class*='staff-item']",
          "article",
        ].join(", "),
      );

      coachCards.each((_, el) => {
        addCoachRecord($(el));
      });

      const profileLinkContainers =
  findCoachContainersFromProfileLinks($);

for (const container of profileLinkContainers) {
  addCoachRecord(container);
}

if (slug === "washington-state-university") {
  const washingtonStateRecords =
    extractWashingtonStateRosterRecords($, origin, url);

  for (const record of washingtonStateRecords) {
    const key = normalizeCoachKey(record.name);

    if (!key) continue;

    pageRecords.set(
      key,
      mergeCoachRecords(pageRecords.get(key), record),
    );
  }
}

      const coachingRegions = findCoachingStaffRegions($);

      for (const region of coachingRegions) {
        const containers = findCoachContainersFromRegion($, region);

        for (const container of containers) {
          addCoachRecord(container);
        }
      }

if (pageRecords.size > MAX_COACH_RECORDS_PER_PAGE) {
  console.log(
    `  ⚠️ discarded ${pageRecords.size} records; page appears to be an athletics-wide staff directory`,
  );

  continue;
}

const pageHasHeadCoach = Array.from(
  pageRecords.values(),
).some((record) => record.isHeadCoach);

/*
 * Houston's year-specific roster currently contains its outgoing staff,
 * while the unversioned roster contains the incoming staff led by the
 * new head coach. Once a page containing the actual head coach is found,
 * replace the previously accumulated Houston records instead of merging
 * the two staff versions together.
 */
if (
  slug === "university-of-houston" &&
  pageHasHeadCoach
) {
  schoolRecords.clear();

  console.log(
    "  🔄 Houston head coach found; replacing previously accumulated staff records",
  );
}

for (const [key, record] of pageRecords) {
  schoolRecords.set(
    key,
    mergeCoachRecords(
      schoolRecords.get(key),
      record,
    ),
  );
}

if (pageRecords.size > 0) {
  const hasHeadCoach = Array.from(
    schoolRecords.values(),
  ).some((record) => record.isHeadCoach);

  if (schoolRecords.size < MIN_EXPECTED_COACH_RECORDS) {
    console.log(
      `  ⚠️ parsed only ${schoolRecords.size} unique coach record(s) so far; retaining partial result and continuing fallback URLs`,
    );

    continue;
  }

  /*
   * Houston's roster page contains the rest of the baseball staff but
   * currently omits the head coach. Keep trying the coaches-page
   * candidates and merge any missing records before declaring success.
   */
  if (
    slug === "university-of-houston" &&
    !hasHeadCoach
  ) {
    console.log(
      `  ⚠️ parsed ${schoolRecords.size} Houston staff record(s), but no head coach yet; continuing fallback URLs`,
    );

    continue;
  }

  console.log(
    `  ✅ parsed ${schoolRecords.size} unique coach record(s) from ${url}`,
  );

  stats.successfulPrograms += 1;
  stats.coachRecordsParsed += schoolRecords.size;

  if (successfulPatternCache[slug] !== pattern) {
    const previouslyCached = Boolean(
      successfulPatternCache[slug],
    );

    successfulPatternCache[slug] = pattern;

    if (!previouslyCached) {
      stats.cachedPatternsLearned += 1;
    }

    console.log(
      `  💾 cached successful pattern: ${pattern}`,
    );
  }

  found = true;
  break;
}
    }
}

/*
 * Generic rendered-page fallback.
 *
 * Some athletics sites return navigation and shell markup to fetch()
 * while inserting the actual coaching table after JavaScript runs.
 * If every ordinary candidate failed, render the unversioned coaches
 * page once with Playwright and run the same extraction logic.
 */
if (
  schoolRecords.size < MIN_EXPECTED_COACH_RECORDS &&
  slug !== "gardner-webb-university"
) {
  const baseUrl = normalizeUrl(
    program.baseballWebsiteUrl,
  );

const renderedUrl = baseUrl
  ? slug === "washington-state-university"
    ? `${baseUrl}/roster#coaches`
    : slug === "university-of-new-mexico"
      ? `${baseUrl}/roster`
      : `${baseUrl}/coaches`
  : "";

  if (renderedUrl) {
    console.log(
      `  trying rendered: ${renderedUrl}`,
    );

    stats.urlAttempts += 1;

const renderedResult =
  await fetchRenderedHtml(
    renderedUrl,
    slug,
  );

const renderedHtml =
  renderedResult?.html ?? null;

    if (renderedHtml) {
      const origin =
        new URL(renderedUrl).origin;

      const $ = cheerio.load(renderedHtml);

      const diagnosticTableCount =
  $("table").length;

const diagnosticRowCount =
  $("table tr").length;

const diagnosticCoachLinkCount =
  $(
    [
      'a[href*="/coach/"]',
      'a[href*="/coache/"]',
      'a[href*="/coaches/"]',
      'a[href*="/roster/coaches/"]',
      'a[href*="/staff-directory/"]',
      'a[href*="/staff/"]',
      'a[href*="/support-staff/"]',
    ].join(", "),
  ).length;

const diagnosticMailtoCount =
  $('a[href^="mailto:"]').length;

console.log(
  `    rendered tables: ${diagnosticTableCount}`,
);
console.log(
  `    rendered table rows: ${diagnosticRowCount}`,
);
console.log(
  `    rendered coach-profile links: ${diagnosticCoachLinkCount}`,
);
console.log(
  `    rendered mailto links: ${diagnosticMailtoCount}`,
);

      const renderedRecords =
        new Map<string, CoachRecord>();

      const addRenderedCoachRecord = (
        root: cheerio.Cheerio<any>,
      ) => {
        const record = extractCoachRecord(
          $,
          root,
          origin,
          renderedUrl,
        );

        if (!record) return;

        const key =
          normalizeCoachKey(record.name);

        if (!key) return;

        renderedRecords.set(
          key,
          mergeCoachRecords(
            renderedRecords.get(key),
            record,
          ),
        );
      };

$("table tr").each((_, el) => {
  addRenderedCoachRecord($(el));
});

      const renderedTableRecordCount =
        renderedRecords.size;

/*
 * Exact table rows are the safest structure because each row normally
 * represents one staff member. Do not run broader card/container
 * fallbacks after a complete table has already been found; broader
 * containers can span neighboring rows and attach another coach's
 * contact information.
 */
if (
  renderedTableRecordCount <
    MIN_EXPECTED_COACH_RECORDS
) {
  const renderedCoachCards = $(
    [
      ".sidearm-roster-player",
      ".sidearm-roster-coach",
      ".sidearm-staff-member",
      ".sidearm-roster-staff",
      ".s-person-card",
      ".coach-card",
      ".staff-card",
      ".coaches__item",
      ".coaching-staff__item",
      ".roster-coach",
      ".roster-staff",
      "[class*='coach-card']",
      "[class*='coach_item']",
      "[class*='coach-item']",
      "[class*='staff-card']",
      "[class*='staff-member']",
      "[class*='staff_item']",
      "[class*='staff-item']",
      "article",
    ].join(", "),
  );

  renderedCoachCards.each((_, el) => {
    addRenderedCoachRecord($(el));
  });

  const renderedProfileContainers =
    findCoachContainersFromProfileLinks($);

  for (
    const container
    of renderedProfileContainers
  ) {
    addRenderedCoachRecord(container);
  }

const renderedWmtStaffContainers =
  findWmtRosterStaffContainers($);

for (
  const container
  of renderedWmtStaffContainers
) {
  addRenderedCoachRecord(container);
}

  if (slug === "washington-state-university") {
    const washingtonStateRecords =
      extractWashingtonStateRosterRecords(
        $,
        origin,
        renderedUrl,
      );

    for (const record of washingtonStateRecords) {
      const key = normalizeCoachKey(record.name);

      if (!key) continue;

      renderedRecords.set(
        key,
        mergeCoachRecords(
          renderedRecords.get(key),
          record,
        ),
      );
    }
  }

  const renderedRegions =
    findCoachingStaffRegions($);

  for (const region of renderedRegions) {
    const containers =
      findCoachContainersFromRegion(
        $,
        region,
      );

    for (const container of containers) {
      addRenderedCoachRecord(container);
    }
  }
}

      if (
        renderedRecords.size >
          MAX_COACH_RECORDS_PER_PAGE
      ) {
        console.log(
          `  ⚠️ discarded ${renderedRecords.size} rendered records; page appears to be an athletics-wide staff directory`,
        );
      } else if (
        renderedRecords.size >=
          MIN_EXPECTED_COACH_RECORDS
      ) {
        for (
          const [key, record]
          of renderedRecords
        ) {
          schoolRecords.set(
            key,
            mergeCoachRecords(
              schoolRecords.get(key),
              record,
            ),
          );
        }

        console.log(
          `  ✅ parsed ${schoolRecords.size} unique coach record(s) from rendered ${renderedUrl}`,
        );

        stats.successfulPrograms += 1;
        stats.coachRecordsParsed +=
          schoolRecords.size;

        found = true;
      } else if (
        renderedRecords.size > 0
      ) {
        for (
          const [key, record]
          of renderedRecords
        ) {
          schoolRecords.set(
            key,
            mergeCoachRecords(
              schoolRecords.get(key),
              record,
            ),
          );
        }

        console.log(
          `  ⚠️ rendered page produced only ${schoolRecords.size} partial coach record(s)`,
        );
      }
    }
  }
}

if (
  schoolRecords.size === 0 &&
  slug === "gardner-webb-university"
) {
  const renderedUrl =
    "https://gwusports.com/sports/baseball/coaches";

  console.log(`  trying rendered: ${renderedUrl}`);

  stats.urlAttempts += 1;

const renderedResult =
  await fetchRenderedHtml(
    renderedUrl,
    slug,
  );

const renderedHtml =
  renderedResult?.html ?? null;

  if (renderedHtml) {
    const origin = new URL(renderedUrl).origin;
    const $ = cheerio.load(renderedHtml);
    const renderedRecords =
      new Map<string, CoachRecord>();

    const addRenderedCoachRecord = (
      root: cheerio.Cheerio<any>,
    ) => {
      const record = extractCoachRecord(
        $,
        root,
        origin,
        renderedUrl,
      );

      if (!record) return;

      const key = normalizeCoachKey(record.name);

      if (!key) return;

      renderedRecords.set(
        key,
        mergeCoachRecords(
          renderedRecords.get(key),
          record,
        ),
      );
    };

$("table tr").each((_, el) => {
  const row = $(el);
  const cells = row.find("td");

  if (cells.length < 2) {
    return;
  }

  const nameCell = cells.eq(0);
  const titleCell = cells.eq(1);
  const phoneCell = cells.eq(2);
  const emailCell = cells.eq(3);
  const twitterCell = cells.eq(4);

  const name = nameCell
    .text()
    .replace(/\s+/g, " ")
    .trim();

  const title = titleCell
    .text()
    .replace(/\s+/g, " ")
    .trim();

  /*
   * Gardner-Webb uses a manual table parser, so apply the same
   * person-name and staff-title policy used by the generic extractors.
   *
   * This prevents rows such as "Student Assistant" from bypassing
   * looksLikeExcludedStaffTitle().
   */
  if (
    !looksLikePersonName(name) ||
    !looksLikeCoachTitle(title) ||
    looksLikeExcludedStaffTitle(title)
  ) {
    return;
  }

  const profileHref =
    nameCell
      .find(
        'a[href*="/sports/baseball/roster/coaches/"]',
      )
      .first()
      .attr("href") ?? "";

  const emailHref =
    emailCell
      .find('a[href^="mailto:"]')
      .first()
      .attr("href") ?? "";

  const email = emailHref
    .replace(/^mailto:/i, "")
    .split("?")[0]
    .trim();

const phone = cleanPhone(
  phoneCell
    .text()
    .replace(/\s+/g, " ")
    .trim(),
);

  const twitterHandle = twitterCell
    .text()
    .replace(/\s+/g, " ")
    .trim();

  const xUrl = twitterHandle.startsWith("@")
    ? `https://x.com/${twitterHandle.slice(1)}`
    : "";

  const record: CoachRecord = {
    name,
    title,
    email,
    phone,
    bioUrl: profileHref
      ? new URL(profileHref, origin).toString()
      : "",
    contactUrl: renderedUrl,
    headshotUrl: "",
    xUrl,
    instagramUrl: "",
    linkedinUrl: "",
    isHeadCoach: isHeadCoachTitle(title),
    reviewStatus: "AUTO_IMPORTED",
  };

  const key = normalizeCoachKey(record.name);

  if (!key) {
    return;
  }

  renderedRecords.set(
    key,
    mergeCoachRecords(
      renderedRecords.get(key),
      record,
    ),
  );
});

    const renderedCoachCards = $(
      [
        ".sidearm-roster-player",
        ".sidearm-roster-coach",
        ".sidearm-staff-member",
        ".sidearm-roster-staff",
        ".s-person-card",
        ".coach-card",
        ".staff-card",
        ".coaches__item",
        ".coaching-staff__item",
        ".roster-coach",
        ".roster-staff",
        "[class*='coach-card']",
        "[class*='coach_item']",
        "[class*='coach-item']",
        "[class*='staff-card']",
        "[class*='staff-member']",
        "[class*='staff_item']",
        "[class*='staff-item']",
        "article",
      ].join(", "),
    );

    renderedCoachCards.each((_, el) => {
      addRenderedCoachRecord($(el));
    });

    const renderedProfileContainers =
      findCoachContainersFromProfileLinks($);

    for (const container of renderedProfileContainers) {
      addRenderedCoachRecord(container);
    }

    const renderedRegions =
      findCoachingStaffRegions($);

    for (const region of renderedRegions) {
      const containers =
        findCoachContainersFromRegion($, region);

      for (const container of containers) {
        addRenderedCoachRecord(container);
      }
    }

    if (
      renderedRecords.size > 0 &&
      renderedRecords.size <=
        MAX_COACH_RECORDS_PER_PAGE
    ) {
      for (const [key, record] of renderedRecords) {
        schoolRecords.set(
          key,
          mergeCoachRecords(
            schoolRecords.get(key),
            record,
          ),
        );
      }

      console.log(
        `  ✅ parsed ${schoolRecords.size} unique coach record(s) ` +
          `from rendered ${renderedUrl}`,
      );

      stats.successfulPrograms += 1;
      stats.coachRecordsParsed +=
        schoolRecords.size;

      found = true;
    }
  }
}

if (schoolRecords.size === 0) {
  stats.programsWithoutCoachCards += 1;

  rows.push([
    slug,
    "",
    "",
    "",
    "",
    "",
    program.baseballWebsiteUrl ?? "",
    "",
    "",
    "",
    "",
    "false",
    "NEEDS_MANUAL_REVIEW",
  ]);

  console.log(
    "  ⚠️ no structured coach cards found",
  );

  continue;
}

    if (!found && schoolRecords.size < MIN_EXPECTED_COACH_RECORDS) {
      partialSchools.push({
        slug,
        name: program.college.name,
        count: schoolRecords.size,
      });

      console.log(
        `  ⚠️ retained ${schoolRecords.size} partial coach record(s); additional enrichment required`,
      );
    }

for (const uncorrectedRecord of schoolRecords.values()) {
  const record = applyKnownSchoolRecordCorrections(
    slug,
    uncorrectedRecord,
  );

  rows.push([
    slug,
    record.name,
    record.title,
    record.email,
    record.phone,
    record.bioUrl,
    record.contactUrl,
    record.headshotUrl,
    record.xUrl,
    record.instagramUrl,
    record.linkedinUrl,
    String(record.isHeadCoach),
    record.reviewStatus,
  ]);
}
  }

  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");

if (!DRY_RUN) {
  saveSuccessfulPatternCache(
    successfulPatternCache,
  );
} else {
  console.log(
    "\nDRY RUN: URL-pattern cache was not updated.",
  );
}

fs.writeFileSync(
  OUT_FILE,
  csv,
  "utf8",
);

  console.log(
  `\n✅ Wrote ${OUT_FILE}` +
    (
      DRY_RUN
        ? " (dry-run output only)"
        : ""
    ),
);

  if (partialSchools.length > 0) {
    console.log("\n⚠️ Programs with partial coach results:");

    for (const school of partialSchools) {
      console.log(
        `  ${school.name} (${school.slug}): ${school.count} record(s)`,
      );
    }
  }

  stats.emailWarnings = emailWarningCount;

  printRunSummary(stats);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });