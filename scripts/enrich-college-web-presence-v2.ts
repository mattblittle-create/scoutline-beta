// scripts/enrich-college-web-presence-v2.ts

import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";

const ROOT = process.cwd();

const GENERATED_DIR = path.join(
  ROOT,
  "data",
  "enrichment",
  "generated",
);

const DEFAULT_OUTPUT_DIR = path.join(
  GENERATED_DIR,
  `college-web-presence-${timestampForPath()}`,
);

type CsvRow = Record<string, string>;

type LinkCandidate = {
  url: string;
  text: string;
  score: number;
};

type LinkSelectionProfile = {
  scoringTerms: string[];
  requiredAnyTerms?: string[];
  preferredTerms?: string[];
  blockedHosts?: string[];
  blockedTerms?: string[];
  blockedPathPatterns?: RegExp[];
  minimumScore: number;
  sameHostBonus?: number;
};

type DiscoveryStatus =
  | "FOUND"
  | "PARTIAL"
  | "NEEDS_REVIEW"
  | "FAILED";

type SearchProvider =
  | "DUCKDUCKGO"
  | "BING";

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  provider: SearchProvider;
  query: string;
};

type SearchResponse = {
  provider: SearchProvider;
  query: string;
  results: SearchResult[];
  throttled: boolean;
};

type IdentityValidation = {
  validated: boolean;
  score: number;
  reasons: string[];
};

type OutputRow = {
  slug: string;
  name: string;

  nickname: string;
  baseballWebsiteUrl: string;
  rosterUrl: string;
  scheduleUrl: string;
  campsUrl: string;
  questionnaireUrl: string;
  generalContactUrl: string;
  generalContactEmail: string;

  division: string;
  conference: string;
  logoUrl: string;

  programXUrl: string;
  programInstagramUrl: string;
  programYoutubeUrl: string;

  sourceUrl: string;
  discoveryStatus: DiscoveryStatus;
  discoveryNotes: string;
};

const OUTPUT_HEADERS: Array<keyof OutputRow> = [
  "slug",
  "name",

  "nickname",
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

  "programXUrl",
  "programInstagramUrl",
  "programYoutubeUrl",

  "sourceUrl",
  "discoveryStatus",
  "discoveryNotes",
];

/*
 * Search recovery is LAST-RESORT discovery only.
 *
 * Search results never become trusted baseball
 * URLs directly. Every candidate must still pass:
 *
 *   1. fetchHtml()
 *   2. looksLikeBaseballPage()
 *   3. validateSchoolIdentity()
 *
 * before enrichment continues.
 */
const SEARCH_RECOVERY_BLOCKED_HOSTS = [
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "youtu.be",
  "linkedin.com",

  "wikipedia.org",
  "wikimedia.org",

  "niche.com",
  "usnews.com",
  "princetonreview.com",
  "collegeboard.org",
  "collegesimply.com",
  "universities.com",

  "ncaa.com",
  "ncaa.org",
  "naia.org",
  "njcaa.org",

  "maxpreps.com",
  "perfectgame.org",
  "prepbaseballreport.com",
  "baseball-reference.com",
  "d2baseball.com",
  "d3baseball.com",
  "hudl.com",

  // Third-party college/program databases, analytics,
  // encyclopedias, and athletics-platform corporate sites
  // are discovery clues only, never trusted program URLs.
  "collegefactual.com",
  "64analytics.com",
  "indyencyclopedia.org",
  "sidearmsports.com",
  "prestosports.com",
  "stretchinternet.com",
  "amyosport.com",

  "history.com",
  "worldatlas.com",
  "expedia.com",
  "tripadvisor.com",
  "travelocity.com",
  "kayak.com",
  "booking.com",
  "hotels.com",
  "heyexplorer.com",

  "yelp.com",
  "mapquest.com",

  "amazon.com",
  "ebay.com",

  "bing.com",
  "duckduckgo.com",
];

const SEARCH_RECOVERY_BLOCKED_PATH_TERMS = [
  "/news/",
  "/article/",
  "/story/",
  "/tickets/",
  "/ticketing/",
  "/shop/",
  "/store/",
  "/donate/",
  "/giving/",
  "/foundation/",
  "/campaign/",
  "/events/",
];

const ATHLETICS_TEXT_TERMS = [
  "athletics",
  "athletic department",
  "sports",
  "varsity sports",
  "intercollegiate athletics",
];

const BASEBALL_TEXT_TERMS = [
  "baseball",
  "men's baseball",
  "mens baseball",
];

const ROSTER_TERMS = [
  "roster",
  "baseball roster",
  "2026 baseball roster",
  "2025 baseball roster",
];

const ROSTER_LINK_PROFILE: LinkSelectionProfile = {
  scoringTerms: ROSTER_TERMS,

  requiredAnyTerms: [
    "roster",
    "baseball roster",
  ],

  preferredTerms: [
    "/sports/baseball/roster",
    "/baseball/roster",
  ],

  blockedHosts: [
    "usabaseball.com",
  ],

  blockedTerms: [
    "national team roster",
    "roster revealed",
    "news",
    "article",
  ],

blockedPathPatterns: [
  /\/news\//i,
  /\/article\//i,

  // Coach and staff biographies sometimes live
  // beneath the roster path but are not rosters.
  /\/roster\/coaches\//i,
  /\/roster\/staff\//i,
],

  minimumScore: 25,
  sameHostBonus: 25,
};

const SCHEDULE_TERMS = [
  "schedule",
  "baseball schedule",
  "2026 baseball schedule",
  "2025 baseball schedule",
];

const SCHEDULE_LINK_PROFILE: LinkSelectionProfile = {
  scoringTerms: SCHEDULE_TERMS,

  requiredAnyTerms: [
    "schedule",
    "baseball schedule",
  ],

  preferredTerms: [
    "/sports/baseball/schedule",
    "/baseball/schedule",
  ],

  blockedHosts: [
    "ticketmaster.com",
    "ticketsmarter.com",
    "stubhub.com",
    "seatgeek.com",
  ],

  blockedTerms: [
    "tickets",
    "ticketing",
    "facility",
    "facilities",
    "venue",
    "stadium",
    "ballpark",
  ],

  blockedPathPatterns: [
    /\/news\//i,
    /\/article\//i,
    /\/facilities\//i,
    /\/tickets?\//i,
  ],

  minimumScore: 25,
  sameHostBonus: 25,
};

const CAMPS_TERMS = [
  "camp",
  "camps",
  "baseball camps",
  "prospect camp",
  "prospect camps",
  "clinics",
];

const BLOCKED_CAMP_HOSTS = [
  "ticketsmarter.com",
  "ticketmaster.com",
  "stubhub.com",
  "seatgeek.com",
  "bkstr.com",
  "barnesandnoble.com",
  "fanatics.com",
];

const BLOCKED_CAMP_TERMS = [
  "ticket",
  "tickets",
  "bookstore",
  "merchandise",
  "shop",
  "store",
  "parking",
  "premium seating",
  "donate",
  "giving",
];

const STRONG_CAMP_TERMS = [
  "baseball camp",
  "baseball camps",
  "prospect camp",
  "prospect camps",
  "elite camp",
  "summer camp",
  "youth camp",
  "camps and clinics",
  "camp registration",
];

const COMMON_CAMP_PATHS = [
  "/camps",
  "/camps/",
  "/camps-and-clinics",
  "/camps-and-clinics/",
  "/baseball/camps",
  "/baseball/camps/",
  "/baseball/camps-and-clinics",
  "/baseball/camps-and-clinics/",
  "/sports/baseball/camps",
  "/sports/baseball/camps/",
  "/sports/baseball/camps-and-clinics",
  "/sports/baseball/camps-and-clinics/",
];

const CAMP_LINK_PROFILE: LinkSelectionProfile = {
  scoringTerms: CAMPS_TERMS,

  requiredAnyTerms: [
    "camp",
    "camps",
    "clinic",
    "clinics",
    "prospect",
    "showcase",
  ],

  preferredTerms: [
    "baseball camp",
    "baseball camps",
    "prospect camp",
    "prospect camps",
    "elite camp",
    "summer camp",
    "camp registration",
    "camps and clinics",
  ],

  blockedHosts: BLOCKED_CAMP_HOSTS,

  blockedTerms: BLOCKED_CAMP_TERMS,

blockedPathPatterns: [
  /^\/?$/,
  /^\/sports\/baseball\/?$/i,
  /^\/sport\/baseball\/?$/i,
  /^\/baseball\/?$/i,
  /\/about\/community-programs\/?$/i,
],

  minimumScore: 25,

  sameHostBonus: 10,
};

const QUESTIONNAIRE_TERMS = [
  "questionnaire",
  "recruit questionnaire",
  "recruiting questionnaire",
  "prospective student-athlete",
  "prospective student athlete",
  "recruits",
  "recruiting",
];

const QUESTIONNAIRE_LINK_PROFILE: LinkSelectionProfile = {
  scoringTerms: QUESTIONNAIRE_TERMS,

  requiredAnyTerms: [
    "questionnaire",
    "recruit questionnaire",
    "recruiting questionnaire",
    "prospective student-athlete",
    "prospective student athlete",
    "recruiting form",
    "recruiting information",
    "armssoftware",
    "jumpforward",
    "frontrush",
    "formstack",
    "sb_output.aspx?form=",
  ],

  preferredTerms: [
    "questionnaire",
    "recruit questionnaire",
    "recruiting questionnaire",
    "prospective student-athlete",
    "prospective student athlete",
    "recruiting form",
    "armssoftware",
    "jumpforward",
    "frontrush",
    "formstack",
    "sb_output.aspx?form=",
  ],

  blockedHosts: [
    "facebook.com",
    "instagram.com",
    "x.com",
    "twitter.com",
    "youtube.com",
  ],

  blockedTerms: [
    "recruiting coordinator",
    "assistant coach",
    "head coach",
    "coaching staff",
    "staff directory",
    "press release",
    "announces",
    "named assistant",
  ],

  blockedPathPatterns: [
    /^\/?$/,
    /^\/index\.aspx\/?$/i,
    /^\/sports\/baseball\/?$/i,
    /^\/sports\/baseball\/coaches\/?$/i,
    /\/news\//i,
  ],

  minimumScore: 35,
  sameHostBonus: 10,
};

const CONTACT_TERMS = [
  "contact",
  "staff directory",
  "coaches",
  "baseball staff",
];

const OFFICIAL_BASEBALL_URL_OVERRIDES: Record<string, string> = {
  // Existing verified overrides
  "California State University, Bakersfield": "https://gorunners.com/sports/baseball",
  "Coppin State University": "https://coppinstatesports.com/sports/baseball",
  "Oral Roberts University": "https://oruathletics.com/sports/baseball",
  "South Dakota State University": "https://gojacks.com/sports/baseball",
  "University of Delaware": "https://bluehens.com/sports/baseball",
  "University of New Haven": "https://newhavenchargers.com/sports/baseball",
  "Bentley": "https://bentleyfalcons.com/sports/baseball",
  "Bentley University": "https://bentleyfalcons.com/sports/baseball",

  // NCAA D2 verified recovery overrides
  "Biola": "https://athletics.biola.edu/sports/baseball",
  "Charleston (WV)": "https://ucgoldeneagles.com/sports/baseball",
  "Fort Hays State": "https://fhsuathletics.com/sports/baseball",
  "Georgia College": "https://gcsubobcats.com/sports/baseball",
  "Georgian Court": "https://gculions.com/sports/baseball",
  "Glenville State": "https://gstatepioneers.com/sports/baseball",
  "IUP": "https://iupathletics.com/sports/baseball",
  "Indianapolis": "https://athletics.uindy.edu/sports/baseball",
  "Lincoln (PA)": "https://lulions.com/sports/baseball",
  "Lock Haven": "https://www.golhu.com/sports/baseball",
  "Mansfield": "https://gomounties.com/sports/baseball",
  "Maryville (MO)": "https://maryvillesaints.com/sports/baseball",
  "Miles": "https://milesgoldenbears.com/sports/baseball",
  "Mississippi College": "https://www.gochoctaws.com/sports/baseball",
  "Missouri S&T": "https://minerathletics.com/sports/baseball",
  "New Mexico Highlands": "https://nmhuathletics.com/sports/baseball",
  "Slippery Rock": "https://rockathletics.com/sports/baseball",
  "Southwest Minnesota State": "https://smsumustangs.com/sports/baseball",
  "UIS": "https://uisprairiestars.com/sports/baseball",
  "USC Aiken": "https://pacersports.com/sports/baseball",
  "UT Dallas": "https://utdcomets.com/sports/baseball",
  "Wayne State (MI)": "https://wsuathletics.com/sports/baseball",
  "Wayne State (NE)": "https://wscwildcats.com/sports/baseball",
  "Young Harris": "https://yhcathletics.com/sports/baseball",
};

const PROGRAM_FIELD_OVERRIDES: Record<
  string,
  Partial<OutputRow>
> = {
  "Dallas Baptist University": {
    baseballWebsiteUrl:
      "https://dbupatriots.com/sports/baseball",

    rosterUrl:
      "https://dbupatriots.com/sports/baseball/roster",

    scheduleUrl:
      "https://dbupatriots.com/sports/baseball/schedule/2026",

    generalContactUrl:
      "https://dbupatriots.com/sports/baseball/coaches",

    generalContactEmail:
      "tylerj@dbu.edu",
  },
};

function timestampForPath(): string {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
}

function getArgValue(
  flag: string,
): string | undefined {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function hasFlag(
  flag: string,
): boolean {
  return process.argv.includes(flag);
}

function parsePositiveInt(
  value: string | undefined,
): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : null;
}

function parseCsv(
  input: string,
): CsvRow[] {
  const records: string[][] = [];

  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    const next = input[index + 1];

    if (
      char === '"' &&
      inQuotes &&
      next === '"'
    ) {
      field += '"';
      index++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (
      char === "," &&
      !inQuotes
    ) {
      row.push(field);
      field = "";
      continue;
    }

    if (
      (char === "\n" || char === "\r") &&
      !inQuotes
    ) {
      if (
        char === "\r" &&
        next === "\n"
      ) {
        index++;
      }

      row.push(field);
      field = "";

      if (
        row.some(
          (value) => value.trim() !== "",
        )
      ) {
        records.push(row);
      }

      row = [];
      continue;
    }

    field += char;
  }

  if (
    field.length > 0 ||
    row.length > 0
  ) {
    row.push(field);

    if (
      row.some(
        (value) => value.trim() !== "",
      )
    ) {
      records.push(row);
    }
  }

  const [headers, ...dataRows] = records;

  if (!headers) {
    return [];
  }

  return dataRows.map((values) => {
    const result: CsvRow = {};

    headers.forEach((header, index) => {
result[cleanString(header)] =
  cleanString(values[index]);
    });

    return result;
  });
}

function escapeCsv(
  value: unknown,
): string {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function normalizeUrl(
  value: unknown,
  baseUrl?: string,
): string | null {
  const cleaned = String(value ?? "").trim();

  if (!cleaned) {
    return null;
  }

  if (
    cleaned.startsWith("mailto:") ||
    cleaned.startsWith("tel:") ||
    cleaned.startsWith("javascript:") ||
    cleaned.startsWith("#")
  ) {
    return null;
  }

  try {
    const url = baseUrl
      ? new URL(cleaned, baseUrl)
      : new URL(
          /^https?:\/\//i.test(cleaned)
            ? cleaned
            : `https://${cleaned}`,
        );

url.hash = "";

const redirectParam =
  url.searchParams.get("redirect") ??
  url.searchParams.get("url") ??
  url.searchParams.get("target");

if (redirectParam) {
  try {
    return normalizeUrl(
      decodeURIComponent(redirectParam),
    );
  } catch {
    return normalizeUrl(redirectParam);
  }
}

if (
  (
    url.hostname.toLowerCase() === "x.com" ||
    url.hostname.toLowerCase() === "www.x.com"
  ) &&
  url.pathname.startsWith("/@")
) {
  url.pathname =
    `/${url.pathname.slice(2)}`;
}

const normalizedUrl = url.toString();

const lowerUrl =
  normalizedUrl.toLowerCase();

/*
 * Don't preserve social-media content URLs.
 * Let the scraper rediscover the official
 * profile/channel instead.
 */
if (
  lowerUrl.includes("instagram.com/")
) {
  if (
    lowerUrl.includes("/p/") ||
    lowerUrl.includes("/reel/") ||
    lowerUrl.includes("/reels/") ||
    lowerUrl.includes("/tv/")
  ) {
    return null;
  }
}

if (
  lowerUrl.includes("youtube.com/") ||
  lowerUrl.includes("youtu.be/")
) {
  const isChannelUrl = [
    "/channel/",
    "/@",
    "/user/",
    "/c/",
  ].some((path) =>
    lowerUrl.includes(path),
  );

  if (!isChannelUrl) {
    return null;
  }
}

return normalizedUrl;
  } catch {
    return null;
  }
}

function cleanString(
  value: unknown,
): string {
  return String(value ?? "")
    .replace(
      /[\u200B-\u200D\u2060\uFEFF]/g,
      "",
    )
    .trim();
}

function normalizeText(
  value: unknown,
): string {
  return cleanString(value)
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function hostnameWithoutWww(
  value: string,
): string {
  try {
    return new URL(value)
      .hostname
      .replace(/^www\./i, "")
      .toLowerCase();
  } catch {
    return "";
  }
}

function uniqueStrings(
  values: Array<string | null | undefined>,
): string[] {
  return Array.from(
    new Set(
      values.filter(
        (value): value is string =>
          Boolean(value),
      ),
    ),
  );
}

function scoreTextAgainstTerms(
  text: string,
  terms: string[],
): number {
  const normalized = normalizeText(text);

  let score = 0;

  for (const term of terms) {
    const normalizedTerm = normalizeText(term);

    if (
      normalized === normalizedTerm
    ) {
      score += 100;
    } else if (
      normalized.includes(normalizedTerm)
    ) {
      score += 40;
    }
  }

  return score;
}

function scoreUrlAgainstTerms(
  url: string,
  terms: string[],
): number {
  const normalizedUrl = normalizeText(url)
    .replace(/[-_/]+/g, " ");

  let score = 0;

  for (const term of terms) {
    const normalizedTerm = normalizeText(term);

    if (
      normalizedUrl.includes(normalizedTerm)
    ) {
      score += 25;
    }
  }

  return score;
}

function extractLinks(
  html: string,
  pageUrl: string,
): Array<{
  url: string;
  text: string;
}> {
  const $ = cheerio.load(html);

  const links: Array<{
    url: string;
    text: string;
  }> = [];

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    const url = normalizeUrl(href, pageUrl);

    if (!url) {
      return;
    }

    const text = $(element)
      .text()
      .replace(/\s+/g, " ")
      .trim();

    links.push({
      url,
      text,
    });
  });

  return links;
}

function rankLinks(
  links: Array<{
    url: string;
    text: string;
  }>,
  terms: string[],
  preferredHost?: string,
): LinkCandidate[] {
  return links
    .map((link) => {
      let score =
        scoreTextAgainstTerms(
          link.text,
          terms,
        ) +
        scoreUrlAgainstTerms(
          link.url,
          terms,
        );

      if (
        preferredHost &&
        hostnameWithoutWww(link.url) ===
          preferredHost
      ) {
        score += 10;
      }

      if (
        /\.(pdf|jpg|jpeg|png|gif|svg|webp)$/i.test(
          new URL(link.url).pathname,
        )
      ) {
        score -= 100;
      }

      return {
        ...link,
        score,
      };
    })
    .filter(
      (candidate) => candidate.score > 0,
    )
    .sort(
      (a, b) => b.score - a.score,
    );
}

function chooseBestLink(
  links: Array<{
    url: string;
    text: string;
  }>,
  terms: string[],
  preferredHost?: string,
): string {
  return (
    rankLinks(
      links,
      terms,
      preferredHost,
    )[0]?.url ?? ""
  );
}

function matchesProfileTerm(
  combined: string,
  rawTerm: string,
): boolean {
  const term =
    normalizeText(rawTerm);

  if (!term) {
    return false;
  }

  const containsUrlSyntax =
    /[/?=&._:-]/.test(term);

  if (containsUrlSyntax) {
    return combined.includes(term);
  }

  const escapedTerm =
    term.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

  const flexibleWhitespaceTerm =
    escapedTerm.replace(
      /\s+/g,
      "\\s+",
    );

  return new RegExp(
    `\\b${flexibleWhitespaceTerm}\\b`,
    "i",
  ).test(combined);
}

function chooseBestLinkByProfile(
  links: Array<{
    url: string;
    text: string;
  }>,
  profile: LinkSelectionProfile,
  preferredHost?: string,
): string {
  const candidates =
    links
      .map((link) => {
        const normalizedText =
          normalizeText(link.text);

        const normalizedUrl =
          normalizeText(link.url);

        const combined =
          `${normalizedText} ${normalizedUrl}`;

        let host = "";
        let pathname = "";

        try {
          const parsed =
            new URL(link.url);

          host =
            hostnameWithoutWww(
              parsed.href,
            );

          pathname =
            parsed.pathname;
        } catch {
          return {
            ...link,
            score: -1_000,
          };
        }

        let score =
          scoreTextAgainstTerms(
            link.text,
            profile.scoringTerms,
          ) +
          scoreUrlAgainstTerms(
            link.url,
            profile.scoringTerms,
          );

        if (
          preferredHost &&
          host === preferredHost
        ) {
          score +=
            profile.sameHostBonus ??
            10;
        }

        for (
          const term of
            profile.preferredTerms ?? []
        ) {
if (
  matchesProfileTerm(
    combined,
    term,
  )
) {
  score += 100;
}
        }

        const hasRequiredSignal =
          !profile.requiredAnyTerms?.length ||
profile.requiredAnyTerms.some(
  (term) =>
    matchesProfileTerm(
      combined,
      term,
    ),
);

        if (!hasRequiredSignal) {
          score -= 1_000;
        }

        if (
          profile.blockedHosts?.some(
            (blockedHost) =>
              host === blockedHost ||
              host.endsWith(
                `.${blockedHost}`,
              ),
          )
        ) {
          score -= 1_000;
        }

        if (
          profile.blockedTerms?.some(
            (term) =>
              combined.includes(
                normalizeText(term),
              ),
          )
        ) {
          score -= 1_000;
        }

        if (
          profile.blockedPathPatterns?.some(
            (pattern) =>
              pattern.test(pathname),
          )
        ) {
          score -= 1_000;
        }

        if (
          /\.(pdf|jpg|jpeg|png|gif|svg|webp)$/i.test(
            pathname,
          )
        ) {
          score -= 1_000;
        }

        return {
          ...link,
          score,
        };
      })
      .filter(
        (candidate) =>
          candidate.score >=
          profile.minimumScore,
      )
      .sort(
        (a, b) =>
          b.score - a.score,
      );

  return candidates[0]?.url ?? "";
}

/*
function chooseBestCampLink(
  links: Array<{
    url: string;
    text: string;
  }>,
  preferredHost?: string,
): string {
  const ranked =
    links
      .map((link) => {
        const normalizedText =
          normalizeText(link.text);

        const normalizedUrl =
          normalizeText(link.url);

        const combined =
          `${normalizedText} ${normalizedUrl}`;

        const host =
          hostnameWithoutWww(
            link.url,
          );

        let score =
          scoreTextAgainstTerms(
            link.text,
            CAMPS_TERMS,
          ) +
          scoreUrlAgainstTerms(
            link.url,
            CAMPS_TERMS,
          );

        for (
          const term of
            STRONG_CAMP_TERMS
        ) {
          if (
            combined.includes(
              normalizeText(term),
            )
          ) {
            score += 100;
          }
        }

        if (
          preferredHost &&
          host === preferredHost
        ) {
          score += 10;
        }

        if (
          BLOCKED_CAMP_HOSTS.some(
            (blockedHost) =>
              host === blockedHost ||
              host.endsWith(
                `.${blockedHost}`,
              ),
          )
        ) {
          score -= 1_000;
        }

        if (
          BLOCKED_CAMP_TERMS.some(
            (term) =>
              combined.includes(term),
          )
        ) {
          score -= 500;
        }

        try {
          const pathname =
            new URL(link.url)
              .pathname
              .replace(/\/+$/, "")
              .toLowerCase();

          if (
            pathname ===
              "/sports/baseball" ||
            pathname ===
              "/sport/baseball" ||
            pathname ===
              "/baseball"
          ) {
            score -= 500;
          }

          if (
            /\.(pdf|jpg|jpeg|png|gif|svg|webp)$/i.test(
              pathname,
            )
          ) {
            score -= 500;
          }
        } catch {
          score -= 1_000;
        }

        return {
          ...link,
          score,
        };
      })
      .filter(
        (candidate) =>
          candidate.score > 0,
      )
      .sort(
        (a, b) =>
          b.score - a.score,
      );

  const bestCandidate =
    ranked[0];

  if (!bestCandidate) {
    return "";
  }

  const combined =
    normalizeText(
      `${bestCandidate.text} ${bestCandidate.url}`,
    );

  const hasStrongCampSignal =
    STRONG_CAMP_TERMS.some(
      (term) =>
        combined.includes(
          normalizeText(term),
        ),
    );

  const hasGenericCampSignal =
    /\bcamps?\b/i.test(
      combined,
    );

  if (
    !hasStrongCampSignal &&
    !hasGenericCampSignal
  ) {
    return "";
  }

  const minimumScore =
    hasStrongCampSignal
      ? 75
      : 25;

  if (
    bestCandidate.score <
    minimumScore
  ) {
    return "";
  }

  return bestCandidate.url;
}
*/

function extractMetaContent(
  html: string,
  selectors: string[],
): string {
  const $ = cheerio.load(html);

  for (const selector of selectors) {
    const value = $(selector)
      .first()
      .attr("content");

    if (value?.trim()) {
      return value.trim();
    }
  }

  return "";
}

function extractLogoUrl(
  html: string,
  pageUrl: string,
): string {
  const metaLogo = extractMetaContent(
    html,
    [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[property="twitter:image"]',
    ],
  );

  return (
    normalizeUrl(
      metaLogo,
      pageUrl,
    ) ?? ""
  );
}

function isUsableContactEmail(
  value: string,
): boolean {
  const normalized =
    value.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  const blockedDomains = [
    "@sentry.wmt.dev",
    "@example.com",
    "@example.org",
  ];

  return !blockedDomains.some(
    (domain) =>
      normalized.endsWith(domain),
  );
}

function extractEmail(
  html: string,
): string {
  const $ = cheerio.load(html);

  const mailtoValues = $(
    'a[href^="mailto:"]',
  )
    .map((_, element) =>
      String(
        $(element).attr("href") ?? "",
      )
        .replace(/^mailto:/i, "")
        .split("?")[0]
        .trim(),
    )
    .get();

  const usableMailto =
    mailtoValues.find(
      isUsableContactEmail,
    );

  if (usableMailto) {
    return usableMailto;
  }

  const bodyText = $("body")
    .text()
    .replace(/\s+/g, " ");

  const matches =
    bodyText.match(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    ) ?? [];

  return (
    matches.find(
      isUsableContactEmail,
    ) ?? ""
  );
}

function extractSocialUrl(
  links: Array<{
    url: string;
    text: string;
  }>,
  platform: "x" | "instagram" | "youtube",
  baseballHost?: string,
): string {
  const platformHosts = {
    x: ["x.com", "twitter.com"],
    instagram: ["instagram.com"],
    youtube: ["youtube.com", "youtu.be"],
  };

  const blockedFragments = [
    "/share",
    "/intent",
    "/home",
    "/p/",
    "/reel/",
    "/reels/",
    "/tv/",
  ];

  const otherSportTerms = [
    "football",
    "basketball",
    "softball",
    "soccer",
    "volleyball",
    "lacrosse",
    "wrestling",
    "tennis",
    "golf",
    "track",
    "swimming",
    "hockey",
  ];

  const candidates = links
    .map((link) => {
      const normalizedUrl = link.url.toLowerCase();
      const normalizedText = normalizeText(link.text);
      const combined = `${normalizedText} ${normalizedUrl}`;

      const platformMatches =
        platformHosts[platform].some((host) =>
          hostnameWithoutWww(link.url) === host ||
          hostnameWithoutWww(link.url).endsWith(`.${host}`),
        );

      if (!platformMatches) {
        return { ...link, score: -1_000 };
      }

      if (
        blockedFragments.some((fragment) =>
          normalizedUrl.includes(fragment),
        )
      ) {
        return { ...link, score: -1_000 };
      }

      if (
        platform === "youtube" &&
        !["/channel/", "/@", "/c/", "/user/"].some(
          (fragment) => normalizedUrl.includes(fragment),
        )
      ) {
        return { ...link, score: -1_000 };
      }

      let score = 10;

      if (/\bbaseball\b/i.test(combined)) {
        score += 200;
      }

      if (
        /\b(bsball|baseballteam|baseballprogram)\b/i.test(
          combined.replace(/[^a-z0-9]+/g, ""),
        )
      ) {
        score += 100;
      }

      if (
        normalizedText.includes("follow") ||
        normalizedText.includes("instagram") ||
        normalizedText.includes("twitter") ||
        normalizedText.includes("youtube")
      ) {
        score += 15;
      }

      if (
        otherSportTerms.some((term) =>
          combined.includes(term),
        )
      ) {
        score -= 500;
      }

      // A same-site redirect wrapper is useful context, but never enough
      // to outweigh another sport or a content/share URL.
      if (
        baseballHost &&
        normalizedText.includes(baseballHost)
      ) {
        score += 5;
      }

      return { ...link, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.url ?? "";
}

async function fetchHtml(
  url: string,
): Promise<{
  finalUrl: string;
  html: string;
} | null> {
  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    20_000,
  );

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ScoutLineDataEnrichment/1.0; +https://www.myscoutline.com)",
        Accept:
          "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return null;
    }

    const contentType =
      response.headers.get(
        "content-type",
      ) ?? "";

    if (
      !contentType
        .toLowerCase()
        .includes("text/html")
    ) {
      return null;
    }

    return {
      finalUrl: response.url,
      html: await response.text(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(
  milliseconds: number,
): Promise<void> {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds,
      ),
  );
}

function randomDelay(
  min: number,
  max: number,
): number {
  return (
    min +
    Math.floor(
      Math.random() *
        (max - min + 1),
    )
  );
}

function isSearchRecoveryBlockedUrl(
  value: string,
): boolean {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return true;
  }

  const host =
    parsed.hostname
      .replace(/^www\./i, "")
      .toLowerCase();

  if (
    SEARCH_RECOVERY_BLOCKED_HOSTS.some(
      (blockedHost) =>
        host === blockedHost ||
        host.endsWith(
          `.${blockedHost}`,
        ),
    )
  ) {
    return true;
  }

  const lowerUrl =
    parsed.toString().toLowerCase();

  return SEARCH_RECOVERY_BLOCKED_PATH_TERMS.some(
    (term) =>
      lowerUrl.includes(term),
  );
}

const UNTRUSTED_PROGRAM_HOSTS = uniqueStrings([
  ...SEARCH_RECOVERY_BLOCKED_HOSTS,
  "collegefactual.com",
  "64analytics.com",
  "indyencyclopedia.org",
  "sidearmsports.com",
  "prestosports.com",
  "stretchinternet.com",
]);

function isKnownUntrustedProgramUrl(
  value: string,
): boolean {
  try {
    const host =
      new URL(value).hostname
        .replace(/^www\./i, "")
        .toLowerCase();

    return UNTRUSTED_PROGRAM_HOSTS.some(
      (blockedHost) =>
        host === blockedHost ||
        host.endsWith(`.${blockedHost}`),
    );
  } catch {
    return true;
  }
}

function sameOrSubdomainHost(
  candidateUrl: string,
  referenceUrl: string,
): boolean {
  const candidateHost =
    hostnameWithoutWww(candidateUrl);
  const referenceHost =
    hostnameWithoutWww(referenceUrl);

  if (!candidateHost || !referenceHost) {
    return false;
  }

  return (
    candidateHost === referenceHost ||
    candidateHost.endsWith(`.${referenceHost}`) ||
    referenceHost.endsWith(`.${candidateHost}`)
  );
}

function hasCanonicalAthleticsBaseballPath(
  value: string,
): boolean {
  try {
    const pathname =
      new URL(value)
        .pathname
        .replace(/\/+$/, "")
        .toLowerCase();

    return (
      /^\/sports\/baseball(?:\/|$)/i.test(pathname) ||
      /^\/sport\/baseball(?:\/|$)/i.test(pathname) ||
      /^\/sports\/bsb(?:\/|$)/i.test(pathname) ||
      /^\/baseball(?:\/|$)/i.test(pathname) ||
      /^\/bsb(?:\/|$)/i.test(pathname)
    );
  } catch {
    return false;
  }
}

function pageLinksBackToInstitution(
  html: string,
  pageUrl: string,
  websiteUrl: string,
): boolean {
  const institutionalHost =
    hostnameWithoutWww(
      websiteUrl,
    );

  if (!institutionalHost) {
    return false;
  }

  const links =
    extractLinks(
      html,
      pageUrl,
    );

  return links.some((link) => {
    const linkHost =
      hostnameWithoutWww(
        link.url,
      );

    return (
      linkHost === institutionalHost ||
      linkHost.endsWith(
        `.${institutionalHost}`,
      ) ||
      institutionalHost.endsWith(
        `.${linkHost}`,
      )
    );
  });
}

function looksLikeOfficialAthleticsHost(
  pageUrl: string,
  websiteUrl: string,
  html: string,
): boolean {
  if (isKnownUntrustedProgramUrl(pageUrl)) {
    return false;
  }

  /*
   * Same-domain and institutional subdomain pages are
   * trusted provenance because they remain inside the
   * school's own web property.
   */
  if (sameOrSubdomainHost(pageUrl, websiteUrl)) {
    return true;
  }

  /*
   * Separate athletics domains are common, but content
   * similarity alone is not proof that an external site
   * is official.
   *
   * For an external domain, require at least one strong
   * provenance signal:
   *
   *   1. canonical athletics baseball URL structure, or
   *   2. an explicit link back to the institution.
   *
   * This rejects third-party college/program profile
   * pages that merely contain the correct school,
   * nickname, city/state, and baseball terminology.
   */
  const hasCanonicalBaseballPath =
    hasCanonicalAthleticsBaseballPath(
      pageUrl,
    );

  const linksBackToInstitution =
    pageLinksBackToInstitution(
      html,
      pageUrl,
      websiteUrl,
    );

  if (
    !hasCanonicalBaseballPath &&
    !linksBackToInstitution
  ) {
    return false;
  }

  const $ = cheerio.load(html);
  const body =
    normalizeText($("body").text());
  const links =
    extractLinks(html, pageUrl);

  const sportsPathLinks =
    links.filter((link) => {
      try {
        const pathname =
          new URL(link.url).pathname.toLowerCase();

        return (
          pathname.includes("/sports/") ||
          pathname.includes("/sport/")
        );
      } catch {
        return false;
      }
    }).length;

  const athleticsSignals = [
    "roster",
    "schedule",
    "coaches",
    "staff directory",
    "athletics",
  ].filter((term) =>
    body.includes(term),
  ).length;

  /*
   * Canonical baseball paths are themselves a strong
   * athletics-platform signal. For noncanonical external
   * URLs, the institutional backlink must be accompanied
   * by normal athletics/program structure.
   */
  if (hasCanonicalBaseballPath) {
    return looksLikeBaseballPage(
      html,
      pageUrl,
    );
  }

  return (
    linksBackToInstitution &&
    (
      looksLikeAthleticsHub(
        html,
        pageUrl,
      ) ||
      (
        looksLikeBaseballPage(
          html,
          pageUrl,
        ) &&
        sportsPathLinks >= 2 &&
        athleticsSignals >= 2
      )
    )
  );
}
function looksSearchThrottled(
  html: string,
): boolean {
  const body =
    normalizeText(
      cheerio
        .load(html)("body")
        .text(),
    );

  const signals = [
    "unusual traffic",
    "automated queries",
    "verify you are human",
    "captcha",
    "access denied",
    "too many requests",
    "temporarily blocked",
    "rate limit",
    "rate exceeded",
    "robot check",
  ];

  return signals.some(
    (signal) =>
      body.includes(signal),
  );
}

async function fetchSearchHtml(
  url: string,
): Promise<{
  finalUrl: string;
  html: string;
} | null> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      20_000,
    );

  try {
    const response =
      await fetch(url, {
        redirect: "follow",

        signal:
          controller.signal,

        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",

          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",

          "Accept-Language":
            "en-US,en;q=0.9",

          "Cache-Control":
            "no-cache",
        },
      });

    if (!response.ok) {
      return null;
    }

    const contentType =
      response.headers.get(
        "content-type",
      ) ?? "";

    if (
      !contentType
        .toLowerCase()
        .includes("text/html")
    ) {
      return null;
    }

    return {
      finalUrl:
        response.url,

      html:
        await response.text(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function unwrapDuckDuckGoUrl(
  rawHref: string,
): string | null {
  const normalized =
    normalizeUrl(
      rawHref,
      "https://html.duckduckgo.com",
    );

  if (!normalized) {
    return null;
  }

  try {
    const parsed =
      new URL(normalized);

    if (
      parsed.hostname.includes(
        "duckduckgo.com",
      )
    ) {
      const redirect =
        parsed.searchParams.get(
          "uddg",
        );

      if (redirect) {
        return normalizeUrl(
          decodeURIComponent(
            redirect,
          ),
        );
      }
    }

    return normalized;
  } catch {
    return null;
  }
}

function unwrapBingUrl(
  rawHref: string,
): string | null {
  const normalized =
    normalizeUrl(rawHref);

  if (!normalized) {
    return null;
  }

  try {
    const parsed =
      new URL(normalized);

    const host =
      parsed.hostname
        .replace(/^www\./i, "")
        .toLowerCase();

    if (
      host !== "bing.com"
    ) {
      return normalized;
    }

    const encoded =
      parsed.searchParams.get(
        "u",
      );

    if (!encoded) {
      return null;
    }

    let payload =
      encoded;

    if (
      payload.startsWith("a1")
    ) {
      payload =
        payload.slice(2);
    }

    payload =
      payload
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    while (
      payload.length % 4 !== 0
    ) {
      payload += "=";
    }

    const decoded =
      Buffer.from(
        payload,
        "base64",
      )
        .toString("utf8")
        .trim();

    return normalizeUrl(
      decoded,
    );
  } catch {
    return null;
  }
}

function cleanSearchRecoveryResults(
  results: SearchResult[],
): SearchResult[] {
  const seen =
    new Set<string>();

  return results
    .filter(
      (result) => {
        const normalized =
          normalizeUrl(
            result.url,
          );

        if (
          !normalized ||
          isSearchRecoveryBlockedUrl(
            normalized,
          )
        ) {
          return false;
        }

        const key =
          normalized
            .replace(/\/+$/, "")
            .toLowerCase();

        if (
          seen.has(key)
        ) {
          return false;
        }

        seen.add(key);

        result.url =
          normalized;

        return true;
      },
    )
    .slice(0, 15);
}

async function searchDuckDuckGo(
  query: string,
): Promise<SearchResponse> {
  const url =
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
      query,
    )}`;

  const fetched =
    await fetchSearchHtml(url);

  if (!fetched) {
    return {
      provider: "DUCKDUCKGO",
      query,
      results: [],
      throttled: false,
    };
  }

  if (
    looksSearchThrottled(
      fetched.html,
    )
  ) {
    return {
      provider: "DUCKDUCKGO",
      query,
      results: [],
      throttled: true,
    };
  }

  const $ =
    cheerio.load(
      fetched.html,
    );

  const results:
    SearchResult[] = [];

  $(
    ".result, .web-result",
  ).each(
    (_, element) => {
      const anchor =
        $(element)
          .find(
            "a.result__a, a.result-link",
          )
          .first();

      const href =
        anchor.attr("href");

      const resultUrl =
        href
          ? unwrapDuckDuckGoUrl(
              href,
            )
          : null;

      if (!resultUrl) {
        return;
      }

      results.push({
        title:
          cleanString(
            anchor.text(),
          ),

        url:
          resultUrl,

        snippet:
          cleanString(
            $(element)
              .find(
                ".result__snippet, .result-snippet",
              )
              .first()
              .text(),
          ),

        provider:
          "DUCKDUCKGO",

        query,
      });
    },
  );

  return {
    provider:
      "DUCKDUCKGO",

    query,

    results:
      cleanSearchRecoveryResults(
        results,
      ),

    throttled:
      false,
  };
}

async function searchBing(
  query: string,
): Promise<SearchResponse> {
  const url =
    `https://www.bing.com/search?q=${encodeURIComponent(
      query,
    )}&count=20`;

  const fetched =
    await fetchSearchHtml(url);

  if (!fetched) {
    return {
      provider: "BING",
      query,
      results: [],
      throttled: false,
    };
  }

  if (
    looksSearchThrottled(
      fetched.html,
    )
  ) {
    return {
      provider: "BING",
      query,
      results: [],
      throttled: true,
    };
  }

  const $ =
    cheerio.load(
      fetched.html,
    );

  const results:
    SearchResult[] = [];

  $("li.b_algo").each(
    (_, element) => {
      const anchor =
        $(element)
          .find("h2 a")
          .first();

      const href =
        anchor.attr("href");

      const resultUrl =
        href
          ? unwrapBingUrl(href)
          : null;

      if (!resultUrl) {
        return;
      }

      results.push({
        title:
          cleanString(
            anchor.text(),
          ),

        url:
          resultUrl,

        snippet:
          cleanString(
            $(element)
              .find(
                ".b_caption p, .b_snippet",
              )
              .first()
              .text(),
          ),

        provider:
          "BING",

        query,
      });
    },
  );

  /*
   * Keep the same fallback selector that is
   * already working in seed discovery.
   */
  if (
    results.length === 0
  ) {
    $("#b_results h2 a").each(
      (_, element) => {
        const href =
          $(element).attr(
            "href",
          );

        const resultUrl =
          href
            ? unwrapBingUrl(href)
            : null;

        if (!resultUrl) {
          return;
        }

        results.push({
          title:
            cleanString(
              $(element).text(),
            ),

          url:
            resultUrl,

          snippet: "",

          provider:
            "BING",

          query,
        });
      },
    );
  }

  return {
    provider:
      "BING",

    query,

    results:
      cleanSearchRecoveryResults(
        results,
      ),

    throttled:
      false,
  };
}

async function searchForBaseballRecovery(
  query: string,
): Promise<SearchResult[]> {
  const ddg =
    await searchDuckDuckGo(
      query,
    );

  if (
    ddg.results.length >= 4 &&
    !ddg.throttled
  ) {
    return ddg.results;
  }

  await sleep(
    randomDelay(
      500,
      900,
    ),
  );

  const bing =
    await searchBing(
      query,
    );

  return cleanSearchRecoveryResults([
    ...ddg.results,
    ...bing.results,
  ]);
}

function looksLikeCampPage(
  html: string,
  pageUrl: string,
): boolean {
  const $ = cheerio.load(html);

  const title =
    normalizeText(
      $("title").first().text(),
    );

  const heading =
    normalizeText(
      $("h1").first().text(),
    );

  const body =
    normalizeText(
      $("body").text(),
    );

  const pathname =
    normalizeText(
      new URL(pageUrl).pathname,
    );

  const combined =
    `${title} ${heading} ${pathname} ${body.slice(0, 10_000)}`;

  const hasStrongCampSignal =
    STRONG_CAMP_TERMS.some(
      (term) =>
        combined.includes(
          normalizeText(term),
        ),
    );

  const genericCampMatches =
    combined.match(
      /\bcamps?\b/g,
    )?.length ?? 0;

  const baseballMatches =
    combined.match(
      /\bbaseball\b/g,
    )?.length ?? 0;

  const registrationSignals = [
    "register",
    "registration",
    "sign up",
    "signup",
    "dates",
    "cost",
    "price",
    "ages",
    "grades",
    "clinic",
    "prospect",
  ].filter(
    (term) =>
      combined.includes(term),
  ).length;

  const blockedSignals = [
    "page not found",
    "404",
    "access denied",
    "tickets",
    "ticketing",
    "bookstore",
    "merchandise",
    "official store",
  ].some(
    (term) =>
      combined.includes(term),
  );

  if (blockedSignals) {
    return false;
  }

  if (hasStrongCampSignal) {
    return true;
  }

  return (
    genericCampMatches >= 2 &&
    baseballMatches >= 1 &&
    registrationSignals >= 1
  );
}

async function promoteCanonicalBaseballRoot(
  baseballUrl: string,
  input: CsvRow,
): Promise<{
  baseballUrl: string;
  baseballHtml: string;
} | null> {
  let parsed: URL;

  try {
    parsed = new URL(baseballUrl);
  } catch {
    return null;
  }

  const pathname =
    parsed.pathname
      .replace(/\/+$/, "")
      .toLowerCase();

  if (
    [
      "/sports/baseball",
      "/sport/baseball",
      "/baseball",
      "/sports/bsb",
      "/bsb",
    ].includes(pathname)
  ) {
    return null;
  }

  const candidates = uniqueStrings([
    `${parsed.origin}/sports/baseball`,
    `${parsed.origin}/sport/baseball`,
    `${parsed.origin}/baseball`,
    `${parsed.origin}/sports/bsb`,
    `${parsed.origin}/bsb`,
  ]);

  for (const candidateUrl of candidates) {
    const fetched =
      await fetchHtml(candidateUrl);

    if (
      !fetched ||
      !looksLikeBaseballPage(
        fetched.html,
        fetched.finalUrl,
      )
    ) {
      continue;
    }

    const identity =
      validateSchoolIdentity(
        fetched.html,
        fetched.finalUrl,
        input,
      );

    if (identity.validated) {
      return {
        baseballUrl: fetched.finalUrl,
        baseballHtml: fetched.html,
      };
    }
  }

  return null;
}

async function discoverCanonicalBaseballPage(
  baseballUrl: string,
  pageType: "roster" | "schedule",
): Promise<string> {
  let origin = "";

  try {
    origin = new URL(baseballUrl).origin;
  } catch {
    return "";
  }

  const candidateUrls = uniqueStrings([
    `${origin}/sports/baseball/${pageType}`,
    `${origin}/sports/baseball/${pageType}/`,
    `${origin}/baseball/${pageType}`,
    `${origin}/baseball/${pageType}/`,
  ]);

  for (const candidateUrl of candidateUrls) {
    const fetched = await fetchHtml(candidateUrl);

    if (!fetched) {
      continue;
    }

    try {
      const finalUrl = new URL(
        fetched.finalUrl,
      );

      const pathname = finalUrl.pathname
        .replace(/\/+$/, "")
        .toLowerCase();

      const expectedPaths = [
        `/sports/baseball/${pageType}`,
        `/baseball/${pageType}`,
      ];

      const isCanonicalPage =
        expectedPaths.includes(pathname);

      const body = normalizeText(
        cheerio.load(fetched.html)("body").text(),
      );

      const hasExpectedContent =
        body.includes("baseball") &&
        body.includes(pageType);

      if (
        isCanonicalPage &&
        hasExpectedContent
      ) {
        return fetched.finalUrl;
      }
    } catch {
      continue;
    }
  }

  return "";
}

async function discoverCampByCommonPaths(
  baseballUrl: string,
): Promise<string> {
  let origin = "";

  try {
    origin =
      new URL(baseballUrl).origin;
  } catch {
    return "";
  }

  for (
    const pathname of
      COMMON_CAMP_PATHS
  ) {
    const candidateUrl =
      `${origin}${pathname}`;

    const fetched =
      await fetchHtml(
        candidateUrl,
      );

    if (!fetched) {
      continue;
    }

    if (
      looksLikeCampPage(
        fetched.html,
        fetched.finalUrl,
      )
    ) {
      return fetched.finalUrl;
    }
  }

  return "";
}

function likelyAthleticsUrls(
  websiteUrl: string,
): string[] {
  try {
    const url = new URL(websiteUrl);
    const host = url.hostname
      .replace(/^www\./i, "");

    return uniqueStrings([
      websiteUrl,
      `${url.protocol}//${host}/athletics`,
      `${url.protocol}//${host}/sports`,
      `${url.protocol}//athletics.${host}`,
      `${url.protocol}//sports.${host}`,
      `${url.protocol}//www.${host}/athletics`,
      `${url.protocol}//www.${host}/sports`,
    ]);
  } catch {
    return [websiteUrl];
  }
}

function looksLikeAthleticsHub(
  html: string,
  pageUrl: string,
): boolean {
  const links =
    extractLinks(
      html,
      pageUrl,
    );

  const normalizedBody =
    normalizeText(
      cheerio
        .load(html)("body")
        .text(),
    );

  const sportsPathCount =
    links.filter((link) => {
      try {
        const pathname =
          new URL(link.url)
            .pathname
            .toLowerCase();

        return (
          pathname.includes("/sports/") ||
          pathname.includes("/sport/")
        );
      } catch {
        return false;
      }
    }).length;

  const athleticsNavigationTerms = [
    "roster",
    "schedule",
    "scoreboard",
    "tickets",
    "coaches",
    "staff directory",
  ];

  const navigationMatches =
    athleticsNavigationTerms.filter(
      (term) =>
        normalizedBody.includes(term),
    ).length;

  const hasBaseballLink =
    links.some((link) => {
      const combined =
        normalizeText(
          `${link.text} ${link.url}`,
        );

      return (
        combined.includes("baseball") &&
        (
          combined.includes("/sports/") ||
          combined.includes("/sport/")
        )
      );
    });

  return (
    sportsPathCount >= 3 ||
    (
      sportsPathCount >= 1 &&
      navigationMatches >= 2
    ) ||
    (
      hasBaseballLink &&
      navigationMatches >= 2
    )
  );
}

function rankPossibleAthleticsSites(
  links: Array<{
    url: string;
    text: string;
  }>,
  currentUrl: string,
): LinkCandidate[] {
  const currentHost =
    hostnameWithoutWww(
      currentUrl,
    );

  return links
    .map((link) => {
      const linkHost =
        hostnameWithoutWww(
          link.url,
        );

      const combined =
        normalizeText(
          `${link.text} ${link.url}`,
        );

      let score =
        scoreTextAgainstTerms(
          link.text,
          ATHLETICS_TEXT_TERMS,
        ) +
        scoreUrlAgainstTerms(
          link.url,
          ATHLETICS_TEXT_TERMS,
        );

      if (
        combined.includes("official athletics")
      ) {
        score += 150;
      }

      if (
        combined.includes("athletics website")
      ) {
        score += 100;
      }

      if (
        combined.includes("bulldogs") ||
        combined.includes("mustangs") ||
        combined.includes("bearcats")
      ) {
        score += 30;
      }

      if (
        linkHost &&
        linkHost !== currentHost
      ) {
        score += 50;
      }

      if (
        combined.includes("/sports/")
      ) {
        score += 75;
      }

      const blockedAthleticsSiteTerms = [
        "athletic fund",
        "athleticfund",
        "foundation",
        "booster",
        "boosters",
        "donate",
        "donation",
        "giving",
        "support athletics",
      ];

      if (
        blockedAthleticsSiteTerms.some(
          (term) =>
            combined.includes(term),
        )
      ) {
        score -= 500;
      }

      if (
        /\.(pdf|jpg|jpeg|png|gif|svg|webp)$/i.test(
          new URL(link.url).pathname,
        )
      ) {
        score -= 200;
      }

      return {
        ...link,
        score,
      };
    })
    .filter(
      (candidate) =>
        candidate.score > 0,
    )
    .sort(
      (a, b) =>
        b.score - a.score,
    );
}

async function discoverAthleticsSite(
  websiteUrl: string,
): Promise<{
  athleticsUrl: string;
  sourceHtml: string;
}> {
  const homepage =
    await fetchHtml(
      websiteUrl,
    );

  if (homepage) {
    if (
      looksLikeAthleticsHub(
        homepage.html,
        homepage.finalUrl,
      )
    ) {
      return {
        athleticsUrl:
          homepage.finalUrl,
        sourceHtml:
          homepage.html,
      };
    }

    const homepageLinks =
      extractLinks(
        homepage.html,
        homepage.finalUrl,
      );

    const rankedHomepageLinks =
      rankPossibleAthleticsSites(
        homepageLinks,
        homepage.finalUrl,
      );

    for (
      const candidate of
        rankedHomepageLinks.slice(0, 10)
    ) {
      const fetched =
        await fetchHtml(
          candidate.url,
        );

      if (!fetched) {
        continue;
      }

const fetchedLooksLikeHub =
  looksLikeAthleticsHub(
    fetched.html,
    fetched.finalUrl,
  );

/*
 * A university site may contain an athletics
 * overview page that links to a separate official
 * athletics domain. Prefer that external domain
 * before accepting the institutional page itself.
 */
const secondLevelLinks =
  extractLinks(
    fetched.html,
    fetched.finalUrl,
  );

const rankedSecondLevelLinks =
  rankPossibleAthleticsSites(
    secondLevelLinks,
    fetched.finalUrl,
  );

for (
  const secondCandidate of
    rankedSecondLevelLinks.slice(0, 12)
) {
  const currentHost =
    hostnameWithoutWww(
      fetched.finalUrl,
    );

  const candidateHost =
    hostnameWithoutWww(
      secondCandidate.url,
    );

  if (
    !candidateHost ||
    candidateHost === currentHost
  ) {
    continue;
  }

  const secondFetched =
    await fetchHtml(
      secondCandidate.url,
    );

  if (!secondFetched) {
    continue;
  }

  if (
    looksLikeAthleticsHub(
      secondFetched.html,
      secondFetched.finalUrl,
    )
  ) {
    return {
      athleticsUrl:
        secondFetched.finalUrl,
      sourceHtml:
        secondFetched.html,
    };
  }
}

if (fetchedLooksLikeHub) {
  return {
    athleticsUrl:
      fetched.finalUrl,
    sourceHtml:
      fetched.html,
  };
}
      }
    }

  for (
    const candidateUrl of
      likelyAthleticsUrls(
        websiteUrl,
      )
  ) {
    if (
      candidateUrl === websiteUrl
    ) {
      continue;
    }

    const fetched =
      await fetchHtml(
        candidateUrl,
      );

    if (!fetched) {
      continue;
    }

    if (
      looksLikeAthleticsHub(
        fetched.html,
        fetched.finalUrl,
      )
    ) {
      return {
        athleticsUrl:
          fetched.finalUrl,
        sourceHtml:
          fetched.html,
      };
    }

    const outboundLinks =
      extractLinks(
        fetched.html,
        fetched.finalUrl,
      );

    const rankedOutboundLinks =
      rankPossibleAthleticsSites(
        outboundLinks,
        fetched.finalUrl,
      );

    for (
      const candidate of
        rankedOutboundLinks.slice(0, 8)
    ) {
      const outboundFetched =
        await fetchHtml(
          candidate.url,
        );

      if (
        outboundFetched &&
        looksLikeAthleticsHub(
          outboundFetched.html,
          outboundFetched.finalUrl,
        )
      ) {
        return {
          athleticsUrl:
            outboundFetched.finalUrl,
          sourceHtml:
            outboundFetched.html,
        };
      }
    }
  }

  return {
    athleticsUrl: "",
    sourceHtml: "",
  };
}

const IDENTITY_STOP_WORDS = new Set([
  "the",
  "of",
  "at",
  "and",
  "university",
  "college",
  "campus",
  "system",
]);

function identityTokens(value: string): string[] {
  return normalizeText(value)
    .replace(/[–—-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !IDENTITY_STOP_WORDS.has(token));
}

function normalizeIdentityPhrase(value: string): string {
  return normalizeText(value)
    .replace(/[–—-]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stateIdentityTerms(state: string): string[] {
  const normalized = normalizeText(state);

  const stateNames: Record<string, string> = {
    AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas",
    CA: "california", CO: "colorado", CT: "connecticut", DE: "delaware",
    FL: "florida", GA: "georgia", HI: "hawaii", ID: "idaho",
    IL: "illinois", IN: "indiana", IA: "iowa", KS: "kansas",
    KY: "kentucky", LA: "louisiana", ME: "maine", MD: "maryland",
    MA: "massachusetts", MI: "michigan", MN: "minnesota", MS: "mississippi",
    MO: "missouri", MT: "montana", NE: "nebraska", NV: "nevada",
    NH: "new hampshire", NJ: "new jersey", NM: "new mexico", NY: "new york",
    NC: "north carolina", ND: "north dakota", OH: "ohio", OK: "oklahoma",
    OR: "oregon", PA: "pennsylvania", RI: "rhode island", SC: "south carolina",
    SD: "south dakota", TN: "tennessee", TX: "texas", UT: "utah",
    VT: "vermont", VA: "virginia", WA: "washington", WV: "west virginia",
    WI: "wisconsin", WY: "wyoming", DC: "district of columbia",
  };

  if (!normalized) {
    return [];
  }

  const upper = state.trim().toUpperCase();
  const full = stateNames[upper];

  if (full) {
    return [full, upper.toLowerCase()];
  }

  const matchingAbbreviation = Object.entries(stateNames)
    .find(([, fullName]) => fullName === normalized)?.[0]
    ?.toLowerCase();

  return uniqueStrings([
    normalized,
    matchingAbbreviation,
  ]);
}

function validateSchoolIdentity(
  html: string,
  pageUrl: string,
  input: CsvRow,
  options?: {
    trustedOfficialOverrideUrl?: string;
  },
): IdentityValidation {
  const $ = cheerio.load(html);

  const rawName = cleanString(input.name);
  const nickname = cleanString(
    input.baseballNickname || input.nickname,
  );
  const city = cleanString(input.city);
  const state = cleanString(input.state);

    const trustedOfficialOverrideUrl =
    normalizeUrl(
      options?.trustedOfficialOverrideUrl,
    );

  const normalizedPageUrl =
    normalizeUrl(pageUrl);

  const isTrustedOfficialOverride =
    Boolean(
      trustedOfficialOverrideUrl &&
      normalizedPageUrl &&
      (
        normalizedPageUrl.replace(/\/+$/, "") ===
          trustedOfficialOverrideUrl.replace(/\/+$/, "") ||
        (
          sameOrSubdomainHost(
            normalizedPageUrl,
            trustedOfficialOverrideUrl,
          ) &&
          hasCanonicalAthleticsBaseballPath(
            normalizedPageUrl,
          )
        )
      ),
    );

  const title = normalizeIdentityPhrase(
    $("title").first().text(),
  );
  const heading = normalizeIdentityPhrase(
    $("h1").first().text(),
  );
  const titleHeading = `${title} ${heading}`.trim();
  const body = normalizeIdentityPhrase(
    $("body").text().slice(0, 80_000),
  );

  let pathname = "";
  try {
    pathname = new URL(pageUrl).pathname.toLowerCase();
  } catch {
    // Keep blank pathname; URL validity is handled elsewhere.
  }

  const nameWithoutParenthetical = rawName
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const normalizedName = normalizeIdentityPhrase(
    nameWithoutParenthetical,
  );

  const tokens = identityTokens(nameWithoutParenthetical);
  const distinctiveTokens = tokens.filter((token) => token.length >= 3);

  const titleTokenMatches = distinctiveTokens.filter((token) =>
    new RegExp(`\\b${token}\\b`, "i").test(titleHeading),
  ).length;

  const bodyTokenMatches = distinctiveTokens.filter((token) =>
    new RegExp(`\\b${token}\\b`, "i").test(body),
  ).length;

  const titleTokenRatio = distinctiveTokens.length
    ? titleTokenMatches / distinctiveTokens.length
    : 0;

  const bodyTokenRatio = distinctiveTokens.length
    ? bodyTokenMatches / distinctiveTokens.length
    : 0;

  const exactNameInTitle =
    Boolean(normalizedName) && titleHeading.includes(normalizedName);
  const exactNameInBody =
    Boolean(normalizedName) && body.includes(normalizedName);

  const normalizedNickname = normalizeIdentityPhrase(nickname);
  const nicknameMatch =
    Boolean(normalizedNickname) &&
    (titleHeading.includes(normalizedNickname) ||
      body.includes(normalizedNickname));

  const normalizedCity = normalizeIdentityPhrase(city);
  const cityMatch =
    Boolean(normalizedCity) &&
    (titleHeading.includes(normalizedCity) || body.includes(normalizedCity));

  const stateTerms = stateIdentityTerms(state);
  const stateMatch = stateTerms.some((term) => {
    if (term.length <= 2) {
      return new RegExp(`\\b${term}\\b`, "i").test(titleHeading);
    }
    return titleHeading.includes(term) || body.includes(term);
  });

  /*
   * A state name is not independent geographic evidence when
   * it is already part of the school identity itself. Without
   * this guard, Georgia College can validate against Georgia
   * and Missouri S&T can validate against Missouri simply
   * because the state word appears in both school names.
   */
  const stateAddsIndependentEvidence =
    stateMatch &&
    !stateTerms.some((term) =>
      term.length > 2 &&
      normalizeIdentityPhrase(nameWithoutParenthetical).includes(term),
    );

  const baseballSignal =
    pathname.includes("baseball") ||
    titleHeading.includes("baseball") ||
    body.includes("baseball");

  const canonicalBaseballPath =
    /^\/(sports?\/)?baseball\/?$/i.test(pathname);

  let score = 0;
  const reasons: string[] = [];

  if (exactNameInTitle) {
    score += 220;
    reasons.push("exact school identity in title/heading");
  } else if (exactNameInBody) {
    score += 80;
    reasons.push("exact school identity in page body");
  }

  if (distinctiveTokens.length > 0) {
    score += Math.round(titleTokenRatio * 120);
    score += Math.round(bodyTokenRatio * 40);
    reasons.push(
      `school tokens title ${titleTokenMatches}/${distinctiveTokens.length}, body ${bodyTokenMatches}/${distinctiveTokens.length}`,
    );
  }

  if (nicknameMatch) {
    score += 90;
    reasons.push("nickname match");
  }

  if (cityMatch) {
    score += 35;
    reasons.push("city match");
  }

  if (stateMatch) {
    score += 60;
    reasons.push("state match");
  }

  if (baseballSignal) {
    score += 35;
    reasons.push("baseball page signal");
  }

  if (canonicalBaseballPath) {
    score += 40;
    reasons.push("canonical baseball path");
  }

  const parentheticalMatch =
    rawName.match(/\(([^)]+)\)/);

  const parentheticalTerms =
    parentheticalMatch
      ? uniqueStrings([
          ...stateIdentityTerms(parentheticalMatch[1]),
          normalizeIdentityPhrase(parentheticalMatch[1]),
        ])
      : [];

  const parentheticalGeoMatch =
    parentheticalTerms.some((term) =>
      term.length <= 2
        ? new RegExp(`\\b${term}\\b`, "i").test(titleHeading)
        : titleHeading.includes(term) || body.includes(term),
    );

  if (parentheticalGeoMatch) {
    score += 80;
    reasons.push("parenthetical/geographic qualifier match");
  }

  const requiresParentheticalConfirmation =
    parentheticalTerms.length > 0;

  const ambiguousShortIdentity =
    distinctiveTokens.length <= 1 ||
    requiresParentheticalConfirmation;

  const strongNameEvidence =
    exactNameInTitle ||
    titleTokenRatio >= 0.75 ||
    (nicknameMatch && titleTokenRatio >= 0.5);

  const geographicEvidence =
    stateAddsIndependentEvidence ||
    parentheticalGeoMatch ||
    cityMatch;

  /*
   * For a short/ambiguous school identity, an exact full
   * institutional name or the program nickname is strong
   * independent evidence even when the athletics page does
   * not print a city/state. Parenthetical schools remain
   * governed by the stricter qualifier rule below.
   */
  const ambiguousIdentityConfirmation =
    geographicEvidence ||
    exactNameInTitle ||
    nicknameMatch;

const trustedOverrideIdentityEvidence =
  isTrustedOfficialOverride &&
  exactNameInTitle &&
  canonicalBaseballPath;

  if (trustedOverrideIdentityEvidence) {
    reasons.push(
      "verified official baseball URL override",
    );
  }

const validated =
  baseballSignal &&
  score >= 150 &&
  strongNameEvidence &&
  (
    !requiresParentheticalConfirmation ||
    parentheticalGeoMatch ||
    trustedOverrideIdentityEvidence
  ) &&
  (
    !ambiguousShortIdentity ||
    ambiguousIdentityConfirmation ||
    trustedOverrideIdentityEvidence
  );

  if (!validated) {
    if (!baseballSignal) {
      reasons.push("REJECT: missing baseball signal");
    }

    if (!strongNameEvidence) {
      reasons.push("REJECT: weak school-name evidence");
    }

if (
  requiresParentheticalConfirmation &&
  !parentheticalGeoMatch &&
  !trustedOverrideIdentityEvidence
) {
  reasons.push(
    "REJECT: parenthetical school qualifier was not confirmed",
  );
} else if (
  ambiguousShortIdentity &&
  !ambiguousIdentityConfirmation &&
  !trustedOverrideIdentityEvidence
) {
  reasons.push(
    "REJECT: ambiguous school identity lacks independent confirmation",
  );
}

    if (score < 150) {
      reasons.push(`REJECT: identity score ${score} < 150`);
    }
  }

  return {
    validated,
    score,
    reasons,
  };
}

function looksLikeBaseballPage(
  html: string,
  pageUrl: string,
): boolean {
  const $ = cheerio.load(html);

  const pathname =
    new URL(pageUrl)
      .pathname
      .toLowerCase();

  const title =
    normalizeText(
      $("title").first().text(),
    );

  const heading =
    normalizeText(
      $("h1").first().text(),
    );

  const body =
    normalizeText(
      $("body").text(),
    );

  const links =
    extractLinks(
      html,
      pageUrl,
    );

  /*
   * A baseball-related article, press release, story,
   * or institutional news page is useful as a discovery
   * clue, but it must never become the trusted
   * baseballWebsiteUrl.
   */
  const blockedBaseballPagePatterns = [
    /\/news\//i,
    /\/article\//i,
    /\/articles\//i,
    /\/story\//i,
    /\/stories\//i,
    /\/press-release\//i,
    /\/press-releases\//i,
  ];

  if (
    blockedBaseballPagePatterns.some(
      (pattern) =>
        pattern.test(pathname),
    )
  ) {
    return false;
  }

  /*
   * Institutional CMS sites often publish news articles
   * directly from the root with descriptive slugs rather
   * than /news/ or /article/ paths.
   *
   * A non-athletics root-level URL containing "baseball"
   * is therefore not enough to establish that the page is
   * the official baseball program hub.
   *
   * Examples:
   *   /baseballs-kyle-richards-signs-pro-contract-...
   *   /baseball-announces-2026-schedule/
   *
   * Legitimate program landing pages are handled below by
   * recognized athletics/baseball path structures.
   */
  const pathSegments =
    pathname
      .split("/")
      .filter(Boolean);

  const looksLikeRootLevelBaseballArticle =
    pathSegments.length === 1 &&
    pathSegments[0].includes("baseball") &&
    pathSegments[0] !== "baseball";

  if (
    looksLikeRootLevelBaseballArticle
  ) {
    return false;
  }

  const hasStrongBaseballPath =
    pathname === "/sports/baseball" ||
    pathname === "/sports/baseball/" ||
    pathname === "/sport/baseball" ||
    pathname === "/sport/baseball/" ||
    pathname === "/baseball" ||
    pathname === "/baseball/" ||
    pathname === "/sports/bsb" ||
    pathname === "/sports/bsb/" ||
    pathname === "/bsb" ||
    pathname === "/bsb/";

  /*
   * Institutional article slugs frequently contain
   * "baseball" even though they are not program landing
   * pages. Therefore pathname.includes("baseball") alone
   * is intentionally NOT enough.
   */
  const hasBaseballIdentity =
    hasStrongBaseballPath ||
    title.includes("baseball") ||
    heading.includes("baseball");

  const baseballNavigationCount =
    links.filter((link) => {
      const combined =
        normalizeText(
          `${link.text} ${link.url}`,
        );

      return (
        combined.includes("baseball") &&
        (
          combined.includes("roster") ||
          combined.includes("schedule") ||
          combined.includes("coach") ||
          combined.includes("news")
        )
      );
    }).length;

  const navigationTermCount = [
    "roster",
    "schedule",
    "coach",
    "staff",
  ].filter(
    (term) =>
      body.includes(term),
  ).length;

  const hasProgramNavigation =
    navigationTermCount >= 2;

  /*
   * A canonical athletics baseball path is already a
   * strong program-page signal. Some Sidearm pages render
   * navigation client-side, so the raw HTML may not expose
   * every roster/schedule/coaches link.
   */
  if (
    hasStrongBaseballPath &&
    (
      body.includes("baseball") ||
      title.includes("baseball") ||
      heading.includes("baseball")
    )
  ) {
    return true;
  }

  /*
   * For a noncanonical URL, require evidence that this is
   * an actual program hub rather than merely content about
   * baseball.
   */
  return (
    hasBaseballIdentity &&
    (
      hasProgramNavigation ||
      baseballNavigationCount >= 2
    )
  );
}

async function discoverBaseballPage(
  athleticsUrl: string,
  athleticsHtml: string,
): Promise<{
  baseballUrl: string;
  baseballHtml: string;
}> {
  if (!athleticsUrl) {
    return {
      baseballUrl: "",
      baseballHtml: "",
    };
  }

  const preferredHost =
    hostnameWithoutWww(
      athleticsUrl,
    );

  if (athleticsHtml) {
    const links =
      extractLinks(
        athleticsHtml,
        athleticsUrl,
      );

    const ranked =
      rankLinks(
        links,
        BASEBALL_TEXT_TERMS,
        preferredHost,
      );

    for (
      const candidate of
        ranked.slice(0, 12)
    ) {
      const fetched =
        await fetchHtml(
          candidate.url,
        );

      if (!fetched) {
        continue;
      }

      if (
        looksLikeBaseballPage(
          fetched.html,
          fetched.finalUrl,
        )
      ) {
        return {
          baseballUrl:
            fetched.finalUrl,
          baseballHtml:
            fetched.html,
        };
      }
    }
  }

  const athleticsOrigin =
    new URL(athleticsUrl).origin;

  const fallbackUrls =
    uniqueStrings([
      `${athleticsOrigin}/sports/baseball`,
      `${athleticsOrigin}/sports/baseball/`,
      `${athleticsOrigin}/sport/baseball`,
      `${athleticsOrigin}/baseball`,
      `${athleticsOrigin}/sports/bsb`,
      `${athleticsOrigin}/sports/bsb/`,
      `${athleticsOrigin}/sports/bsb/index`,
      `${athleticsOrigin}/bsb`,
    ]);

  for (
    const candidateUrl of
      fallbackUrls
  ) {
    const fetched =
      await fetchHtml(
        candidateUrl,
      );

    if (!fetched) {
      continue;
    }

    if (
      looksLikeBaseballPage(
        fetched.html,
        fetched.finalUrl,
      )
    ) {
      return {
        baseballUrl:
          fetched.finalUrl,
        baseballHtml:
          fetched.html,
      };
    }
  }

  return {
    baseballUrl: "",
    baseballHtml: "",
  };
}

async function probeCanonicalBaseballPathsFromSearchResult(
  candidateUrl: string,
  websiteUrl: string,
  input: CsvRow,
): Promise<{
  baseballUrl: string;
  baseballHtml: string;
} | null> {
  let origin = "";

  try {
    origin =
      new URL(candidateUrl).origin;
  } catch {
    return null;
  }

  const probeUrls =
    uniqueStrings([
      `${origin}/sports/baseball`,
      `${origin}/sports/baseball/`,
      `${origin}/sport/baseball`,
      `${origin}/baseball`,
      `${origin}/sports/bsb`,
      `${origin}/sports/bsb/`,
      `${origin}/sports/bsb/index`,
      `${origin}/bsb`,
    ]);

  for (
    const probeUrl of probeUrls
  ) {
    const fetched =
      await fetchHtml(
        probeUrl,
      );

    if (
      !fetched ||
      isSearchRecoveryBlockedUrl(
        fetched.finalUrl,
      ) ||
      isKnownUntrustedProgramUrl(
        fetched.finalUrl,
      )
    ) {
      continue;
    }

    if (
      !looksLikeBaseballPage(
        fetched.html,
        fetched.finalUrl,
      )
    ) {
      continue;
    }

    const identity =
      validateSchoolIdentity(
        fetched.html,
        fetched.finalUrl,
        input,
      );

    if (
      !identity.validated
    ) {
      continue;
    }

    if (
      !looksLikeOfficialAthleticsHost(
        fetched.finalUrl,
        websiteUrl,
        fetched.html,
      )
    ) {
      continue;
    }

    return {
      baseballUrl:
        fetched.finalUrl,
      baseballHtml:
        fetched.html,
    };
  }

  return null;
}

async function recoverBaseballPageBySearch(
  input: CsvRow,
): Promise<{
  baseballUrl: string;
  baseballHtml: string;
  provider: SearchProvider | "";
  query: string;
}> {
  const name =
    cleanString(
      input.name,
    );

  const city =
    cleanString(
      input.city,
    );

  const state =
    cleanString(
      input.state,
    );

  if (!name) {
    return {
      baseballUrl: "",
      baseballHtml: "",
      provider: "",
      query: "",
    };
  }

  /*
   * Intentionally small query set.
   *
   * Search recovery is expensive and is only
   * reached after normal deterministic discovery
   * has already failed.
   */
  const queries =
    uniqueStrings([
      state
        ? `${name} baseball athletics ${state}`
        : `${name} baseball athletics`,

      `${name} baseball roster`,

      `"${name}" baseball`,

      `"${name}" baseball athletics`,

      city || state
        ? `"${name}" ${city} ${state} baseball`
            .replace(/\s+/g, " ")
            .trim()
        : "",
    ]);

  const collected:
    SearchResult[] = [];

  for (
    const query of queries
  ) {
    const results =
      await searchForBaseballRecovery(
        query,
      );

    collected.push(
      ...results,
    );

    /*
     * Once search has produced a reasonable
     * candidate pool, stop spending requests.
     */
    if (
      collected.length >= 10
    ) {
      break;
    }

    await sleep(
      randomDelay(
        500,
        850,
      ),
    );
  }

  const deduped =
    cleanSearchRecoveryResults(
      collected,
    );

  /*
   * Search result ranking is intentionally
   * lightweight.
   *
   * Search discovers possibilities.
   * V2 validation determines truth.
   */
  const ranked =
    deduped
      .map((result) => {
        const combined =
          normalizeText(
            `${result.title} ${result.snippet} ${result.url}`,
          );

        let score = 0;

        if (
          combined.includes(
            normalizeText(name),
          )
        ) {
          score += 100;
        }

        if (
          combined.includes(
            "baseball",
          )
        ) {
          score += 75;
        }

        if (
          combined.includes(
            "athletics",
          )
        ) {
          score += 30;
        }

        if (
          combined.includes(
            "roster",
          )
        ) {
          score += 20;
        }

        try {
          const pathname =
            new URL(
              result.url,
            )
              .pathname
              .replace(/\/+$/, "")
              .toLowerCase();

          if (
            pathname ===
              "/sports/baseball" ||
            pathname ===
              "/sport/baseball" ||
            pathname ===
              "/baseball"
          ) {
            score += 150;
          } else if (
            pathname.includes(
              "/baseball",
            )
          ) {
            score += 75;
          }
        } catch {
          score -= 1_000;
        }

        return {
          result,
          score,
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score,
      );

  const visitedHosts =
    new Map<string, number>();

  for (
    const { result } of
      ranked.slice(0, 12)
  ) {
    const host =
      hostnameWithoutWww(
        result.url,
      );

    const hostVisits =
      visitedHosts.get(host) ??
      0;

    if (
      hostVisits >= 2
    ) {
      continue;
    }

    visitedHosts.set(
      host,
      hostVisits + 1,
    );

    const fetched =
      await fetchHtml(
        result.url,
      );

    if (
      !fetched ||
      isSearchRecoveryBlockedUrl(
        fetched.finalUrl,
      )
    ) {
      continue;
    }

    /*
     * Search may surface a roster, schedule,
     * athletics homepage, or another page on the
     * correct official host instead of the baseball
     * landing page itself.
     *
     * Before judging the returned page, probe the
     * standard baseball paths on that same origin.
     * Every probed page must independently pass the
     * baseball-page, school-identity, and official-
     * athletics-host gates.
     */
    const canonicalProbe =
      await probeCanonicalBaseballPathsFromSearchResult(
        fetched.finalUrl,
        normalizeUrl(
          input.websiteUrl,
        ) ?? "",
        input,
      );

    if (canonicalProbe) {
      return {
        baseballUrl:
          canonicalProbe.baseballUrl,

        baseballHtml:
          canonicalProbe.baseballHtml,

        provider:
          result.provider,

        query:
          result.query,
      };
    }

    /*
     * First gate:
     * this must actually behave like a baseball
     * program page, not merely mention baseball.
     */
    if (
      !looksLikeBaseballPage(
        fetched.html,
        fetched.finalUrl,
      )
    ) {
      continue;
    }

    /*
     * Second and decisive gate:
     * reuse V2's current school identity validator.
     *
     * This is what protects Caldwell and similar
     * ambiguous-name cases.
     */
    const identity =
      validateSchoolIdentity(
        fetched.html,
        fetched.finalUrl,
        input,
      );

    if (
      !identity.validated
    ) {
      continue;
    }

    if (
      !looksLikeOfficialAthleticsHost(
        fetched.finalUrl,
        normalizeUrl(input.websiteUrl) ?? "",
        fetched.html,
      )
    ) {
      continue;
    }

    return {
      baseballUrl:
        fetched.finalUrl,

      baseballHtml:
        fetched.html,

      provider:
        result.provider,

      query:
        result.query,
    };
  }

  return {
    baseballUrl: "",
    baseballHtml: "",
    provider: "",
    query: "",
  };
}

function determineStatus(
  row: OutputRow,
): DiscoveryStatus {
  if (!row.baseballWebsiteUrl) {
    return "FAILED";
  }

  // Identity validation happens before this function is called.
  // Once the official baseball program is validated, missing secondary
  // links are treated as missing data rather than a weaker program match.
  return "FOUND";
}

async function enrichRow(
  input: CsvRow,
): Promise<OutputRow> {
  const name =
    String(input.name ?? "").trim();

  const slug =
    String(input.slug ?? "").trim();

  const websiteUrl =
    normalizeUrl(
      input.websiteUrl,
    ) ?? "";

  const baseRow: OutputRow = {
    slug,
    name,

    nickname:
      String(
        input.baseballNickname ?? "",
      ).trim(),

    baseballWebsiteUrl:
      String(
        input.baseballWebsiteUrl ?? "",
      ).trim(),

    rosterUrl:
      String(
        input.rosterUrl ?? "",
      ).trim(),

    scheduleUrl:
      String(
        input.scheduleUrl ?? "",
      ).trim(),

campsUrl: (() => {
  const normalized =
    normalizeUrl(
      input.campsUrl,
    );

  if (!normalized) {
    return "";
  }

  try {
    const parsed =
      new URL(normalized);

    const host =
      hostnameWithoutWww(
        normalized,
      );

    const combined =
      `${host} ${parsed.pathname} ${parsed.search}`
        .toLowerCase();

    const hasBlockedHost =
      BLOCKED_CAMP_HOSTS.some(
        (blockedHost) =>
          host === blockedHost ||
          host.endsWith(
            `.${blockedHost}`,
          ),
      );

    const hasInvalidCampSignal = [
      "/campaigns/",
      "rowdygives",
      "basketball-arena",
      "community-programs",
    ].some((signal) =>
      combined.includes(signal),
    );

    if (
      hasBlockedHost ||
      hasInvalidCampSignal
    ) {
      return "";
    }

    return normalized;
  } catch {
    return "";
  }
})(),

questionnaireUrl: (() => {
  const normalized =
    normalizeUrl(
      input.questionnaireUrl,
    );

  if (!normalized) {
    return "";
  }

  try {
    const pathname =
      new URL(normalized)
        .pathname
        .replace(/\/+$/, "")
        .toLowerCase();

    if (
      pathname === "" ||
      pathname === "/index.aspx"
    ) {
      return "";
    }

    return normalized;
  } catch {
    return "";
  }
})(),

    generalContactUrl:
      String(
        input.generalContactUrl ?? "",
      ).trim(),

generalContactEmail: (() => {
  const email =
    String(
      input.generalContactEmail ?? "",
    ).trim();

  return isUsableContactEmail(email)
    ? email
    : "";
})(),

    division:
      String(
        input.division || "NCAA_D1",
      ).trim(),

    conference:
      String(
        input.conference ?? "",
      ).trim(),

    logoUrl:
      String(
        input.logoUrl ?? "",
      ).trim(),

programXUrl:
  normalizeUrl(
    input.programXUrl,
  ) ?? "",

programInstagramUrl:
  normalizeUrl(
    input.programInstagramUrl,
  ) ?? "",

programYoutubeUrl:
  normalizeUrl(
    input.programYoutubeUrl,
  ) ?? "",

    sourceUrl: "",
    discoveryStatus:
      "NEEDS_REVIEW",
    discoveryNotes: "",
  };

  if (!websiteUrl) {
    baseRow.discoveryStatus =
      "FAILED";

    baseRow.discoveryNotes =
      "Missing institutional websiteUrl.";

    return baseRow;
  }

  const officialBaseballOverride =
    OFFICIAL_BASEBALL_URL_OVERRIDES[
      name
    ];

  let baseball: {
    baseballUrl: string;
    baseballHtml: string;
  };

if (baseRow.baseballWebsiteUrl) {
  const existingBaseballUrl =
    normalizeUrl(
      baseRow.baseballWebsiteUrl,
    );

  if (!existingBaseballUrl) {
    baseRow.discoveryStatus =
      "NEEDS_REVIEW";

    baseRow.discoveryNotes =
      "Existing baseballWebsiteUrl could not be normalized.";

    return baseRow;
  }

  const existingCandidates =
    uniqueStrings([
      existingBaseballUrl,
      existingBaseballUrl.endsWith("/")
        ? existingBaseballUrl.slice(0, -1)
        : `${existingBaseballUrl}/`,
    ]);

  let fetchedExisting: {
    finalUrl: string;
    html: string;
  } | null = null;

  for (
    const candidateUrl of
      existingCandidates
  ) {
    fetchedExisting =
      await fetchHtml(
        candidateUrl,
      );

    if (fetchedExisting) {
      break;
    }
  }

if (!fetchedExisting) {
  baseRow.sourceUrl =
    existingBaseballUrl;

  const fieldOverride =
    PROGRAM_FIELD_OVERRIDES[name];

  if (fieldOverride) {
    Object.assign(
      baseRow,
      fieldOverride,
    );

    baseRow.discoveryStatus =
      determineStatus(baseRow);

    baseRow.discoveryNotes =
      "Verified program field overrides were applied because the official athletics site blocked or rejected the enrichment request.";

    return baseRow;
  }

  baseRow.discoveryStatus =
    "NEEDS_REVIEW";

  baseRow.discoveryNotes =
    "Existing baseballWebsiteUrl was retained, but the site blocked or rejected the enrichment request.";

  return baseRow;
}

  baseball = {
    baseballUrl:
      fetchedExisting.finalUrl,
    baseballHtml:
      fetchedExisting.html,
  };
} else if (officialBaseballOverride) {
    const overrideUrl =
      new URL(
        officialBaseballOverride,
      );

    const overrideCandidates =
      uniqueStrings([
        officialBaseballOverride,
        officialBaseballOverride.endsWith("/")
          ? officialBaseballOverride.slice(0, -1)
          : `${officialBaseballOverride}/`,
        `${overrideUrl.protocol}//www.${overrideUrl.hostname.replace(
          /^www\./i,
          "",
        )}${overrideUrl.pathname}`,
      ]);

    let fetchedOverride: {
      finalUrl: string;
      html: string;
    } | null = null;

    for (
      const candidateUrl of
        overrideCandidates
    ) {
      fetchedOverride =
        await fetchHtml(
          candidateUrl,
        );

      if (fetchedOverride) {
        break;
      }
    }

    if (!fetchedOverride) {
      baseRow.baseballWebsiteUrl =
        officialBaseballOverride;

      baseRow.sourceUrl =
        officialBaseballOverride;

      baseRow.discoveryStatus =
        "NEEDS_REVIEW";

      baseRow.discoveryNotes =
        "Verified official baseball URL override retained, but the site blocked or rejected the enrichment request.";

      return baseRow;
    }

    baseball = {
      baseballUrl:
        fetchedOverride.finalUrl,
      baseballHtml:
        fetchedOverride.html,
    };
  } else {
    /*
     * The seed-discovery layer may already have
     * identified the official baseball page and
     * placed it in websiteUrl.
     *
     * Example:
     *   https://asugrizzlies.com/sports/baseball
     *
     * Check the incoming seed itself before
     * assuming it is an institutional homepage
     * that needs athletics-site discovery.
     */
    const fetchedSeed =
      await fetchHtml(
        websiteUrl,
      );

    if (
      fetchedSeed &&
      looksLikeBaseballPage(
        fetchedSeed.html,
        fetchedSeed.finalUrl,
      )
    ) {
      baseball = {
        baseballUrl:
          fetchedSeed.finalUrl,
        baseballHtml:
          fetchedSeed.html,
      };
    } else {
      const athletics =
        await discoverAthleticsSite(
          websiteUrl,
        );

if (!athletics.athleticsUrl) {
  const recovered =
    await recoverBaseballPageBySearch(
      input,
    );

  if (
    !recovered.baseballUrl
  ) {
    baseRow.discoveryStatus =
      "FAILED";

    baseRow.discoveryNotes =
      "Seed was not a baseball page, athletics-site discovery failed, and search recovery found no school-identity-validated baseball program page.";

    return baseRow;
  }

  baseball = {
    baseballUrl:
      recovered.baseballUrl,

    baseballHtml:
      recovered.baseballHtml,
  };

  baseRow.discoveryNotes =
    `Recovered official baseball program through ${recovered.provider} search fallback. Query: ${recovered.query}`;
} else {

      /*
       * The seed may itself already be the
       * athletics homepage. discoverAthleticsSite()
       * handles that case and returns it here.
       */
      baseball =
        await discoverBaseballPage(
          athletics.athleticsUrl,
          athletics.sourceHtml,
        );

if (!baseball.baseballUrl) {
  const recovered =
    await recoverBaseballPageBySearch(
      input,
    );

  if (
    !recovered.baseballUrl
  ) {
    baseRow.sourceUrl =
      athletics.athleticsUrl;

    baseRow.discoveryStatus =
      "NEEDS_REVIEW";

    baseRow.discoveryNotes =
      "Athletics website found, but baseball page was not confidently identified and search recovery found no school-identity-validated baseball program page.";

    return baseRow;
  }

  baseball = {
    baseballUrl:
      recovered.baseballUrl,

    baseballHtml:
      recovered.baseballHtml,
  };

  baseRow.discoveryNotes =
    `Athletics site was found but normal baseball discovery failed. Recovered official baseball program through ${recovered.provider} search fallback. Query: ${recovered.query}`;
}
    }
  }
  }

  /*
   * Search/seed discovery may land on a roster, schedule,
   * archive, or other deep baseball page. Prefer a canonical
   * baseball program root when that root independently
   * validates as the same school.
   */
  const promotedBaseballRoot =
    await promoteCanonicalBaseballRoot(
      baseball.baseballUrl,
      input,
    );

  if (promotedBaseballRoot) {
    baseball = promotedBaseballRoot;
  }

  /*
   * Final URL-shape safety check before identity validation.
   * School identity validation answers "is this the right
   * school?" It does NOT by itself answer "is this the
   * official baseball program landing page?"
   */
  let baseballPathname = "";

  try {
    baseballPathname =
      new URL(
        baseball.baseballUrl,
      ).pathname.toLowerCase();
  } catch {
    baseballPathname = "";
  }

  const baseballPathSegments =
    baseballPathname
      .split("/")
      .filter(Boolean);

  const obviousNonLandingPath =
    [
      /\/news\//i,
      /\/article\//i,
      /\/articles\//i,
      /\/story\//i,
      /\/stories\//i,
      /\/press-release\//i,
      /\/press-releases\//i,

      // Deep program pages are useful discovery clues, but
      // baseballWebsiteUrl should represent the program hub.
      // promoteCanonicalBaseballRoot() already had a chance
      // to recover the root before we reach this gate.
      /\/roster(?:\/|$)/i,
      /\/schedule(?:\/|$)/i,
      /\/coaches?(?:\/|$)/i,
      /\/staff(?:\/|$)/i,
      /\/archives?(?:\/|$)/i,
    ].some(
      (pattern) =>
        pattern.test(
          baseballPathname,
        ),
    ) ||
    (
      baseballPathSegments.length === 1 &&
      baseballPathSegments[0].includes(
        "baseball",
      ) &&
      baseballPathSegments[0] !==
        "baseball"
    );

  if (obviousNonLandingPath) {
    baseRow.sourceUrl =
      baseball.baseballUrl;

    baseRow.baseballWebsiteUrl =
      "";

    baseRow.discoveryStatus =
      "NEEDS_REVIEW";

    baseRow.discoveryNotes =
      `Rejected baseball candidate because the URL appears to be a deep/content page rather than the official baseball program landing page. Candidate: ${baseball.baseballUrl}`;

    return baseRow;
  }
  
  const identityValidation =
    validateSchoolIdentity(
      baseball.baseballHtml,
      baseball.baseballUrl,
      input,
      officialBaseballOverride
        ? {
            trustedOfficialOverrideUrl:
              officialBaseballOverride,
          }
        : undefined,
    );

  if (!identityValidation.validated) {
    baseRow.sourceUrl =
      baseball.baseballUrl;

    // Never preserve an unvalidated baseball URL as trusted output.
    baseRow.baseballWebsiteUrl = "";
    baseRow.discoveryStatus =
      "NEEDS_REVIEW";
    baseRow.discoveryNotes =
      `Rejected baseball candidate because school identity was not validated (score ${identityValidation.score}). ${identityValidation.reasons.join("; ")}. Candidate: ${baseball.baseballUrl}`;

    return baseRow;
  }

  if (
    !looksLikeOfficialAthleticsHost(
      baseball.baseballUrl,
      websiteUrl,
      baseball.baseballHtml,
    )
  ) {
    baseRow.sourceUrl =
      baseball.baseballUrl;

    baseRow.baseballWebsiteUrl = "";
    baseRow.discoveryStatus =
      "NEEDS_REVIEW";
    baseRow.discoveryNotes =
      `Rejected baseball candidate because it did not pass the official institutional/athletics-source gate. Candidate: ${baseball.baseballUrl}`;

    return baseRow;
  }

  // From this point forward the baseball program identity is trusted.
  baseRow.baseballWebsiteUrl =
    baseball.baseballUrl;

  const links =
    extractLinks(
      baseball.baseballHtml,
      baseball.baseballUrl,
    );

  const preferredHost =
    hostnameWithoutWww(
      baseball.baseballUrl,
    );

baseRow.rosterUrl =
  baseRow.rosterUrl ||
  chooseBestLinkByProfile(
    links,
    ROSTER_LINK_PROFILE,
    preferredHost,
  );

if (!baseRow.rosterUrl) {
  baseRow.rosterUrl =
    await discoverCanonicalBaseballPage(
      baseball.baseballUrl,
      "roster",
    );
}

baseRow.scheduleUrl =
  baseRow.scheduleUrl ||
  chooseBestLinkByProfile(
    links,
    SCHEDULE_LINK_PROFILE,
    preferredHost,
  );

if (!baseRow.scheduleUrl) {
  baseRow.scheduleUrl =
    await discoverCanonicalBaseballPage(
      baseball.baseballUrl,
      "schedule",
    );
}

baseRow.campsUrl =
  baseRow.campsUrl ||
  chooseBestLinkByProfile(
    links,
    CAMP_LINK_PROFILE,
    preferredHost,
  );

  if (!baseRow.campsUrl) {
  baseRow.campsUrl =
    await discoverCampByCommonPaths(
      baseball.baseballUrl,
    );
}

baseRow.questionnaireUrl =
  normalizeUrl(
    baseRow.questionnaireUrl,
  ) ||
  chooseBestLinkByProfile(
    links,
    QUESTIONNAIRE_LINK_PROFILE,
    preferredHost,
  );

  baseRow.generalContactUrl =
    baseRow.generalContactUrl ||
    chooseBestLink(
      links,
      CONTACT_TERMS,
      preferredHost,
    );

  baseRow.generalContactEmail =
    baseRow.generalContactEmail ||
    extractEmail(
      baseball.baseballHtml,
    );

  baseRow.logoUrl =
    baseRow.logoUrl ||
    extractLogoUrl(
      baseball.baseballHtml,
      baseball.baseballUrl,
    );

baseRow.programXUrl =
  baseRow.programXUrl ||
  extractSocialUrl(
    links,
    "x",
    preferredHost,
  );

  baseRow.programInstagramUrl =
    baseRow.programInstagramUrl ||
    extractSocialUrl(
      links,
      "instagram",
      preferredHost,
    );

  baseRow.programYoutubeUrl =
    baseRow.programYoutubeUrl ||
    extractSocialUrl(
      links,
      "youtube",
      preferredHost,
    );

baseRow.sourceUrl =
  baseball.baseballUrl;

const fieldOverride =
  PROGRAM_FIELD_OVERRIDES[name];

if (fieldOverride) {
  Object.assign(
    baseRow,
    fieldOverride,
  );
}

baseRow.discoveryStatus =
  determineStatus(baseRow);

  const foundFields = [
    baseRow.rosterUrl &&
      "roster",
    baseRow.scheduleUrl &&
      "schedule",
    baseRow.campsUrl &&
      "camps",
    baseRow.questionnaireUrl &&
      "questionnaire",
    baseRow.generalContactUrl &&
      "contact",
    baseRow.programXUrl &&
      "X",
    baseRow.programInstagramUrl &&
      "Instagram",
    baseRow.programYoutubeUrl &&
      "YouTube",
  ].filter(Boolean);

  const identityNote =
    `Identity validated (score ${identityValidation.score}): ${identityValidation.reasons.join("; ")}.`;

  baseRow.discoveryNotes =
    foundFields.length > 0
      ? `${identityNote} Discovered: ${foundFields.join(", ")}.`
      : `${identityNote} Baseball page found, but no secondary links were confidently identified.`;

  return baseRow;
}

function applyCrossRecordCollisionQa(rows: OutputRow[]): void {
  const byHost = new Map<string, OutputRow[]>();

  for (const row of rows) {
    if (!row.baseballWebsiteUrl) {
      continue;
    }

    const host = hostnameWithoutWww(row.baseballWebsiteUrl);
    if (!host) {
      continue;
    }

    const existing = byHost.get(host) ?? [];
    existing.push(row);
    byHost.set(host, existing);
  }

  for (const [host, hostRows] of byHost.entries()) {
    if (hostRows.length < 2) {
      continue;
    }

    const uniqueSchoolNames = uniqueStrings(
      hostRows.map((row) => row.name),
    );

    if (uniqueSchoolNames.length < 2) {
      continue;
    }

    for (const row of hostRows) {
      row.discoveryStatus = "NEEDS_REVIEW";
      row.discoveryNotes = [
        row.discoveryNotes,
        `Identity collision: baseball host ${host} was also assigned to ${uniqueSchoolNames
          .filter((name) => name !== row.name)
          .join(", ")}.`,
      ]
        .filter(Boolean)
        .join(" ");
    }
  }
}

function findNewestWebPresenceInputCsv(): string {
  if (
    !fs.existsSync(GENERATED_DIR)
  ) {
    throw new Error(
      `Generated directory not found: ${GENERATED_DIR}`,
    );
  }

  const matchingFiles =
    fs.readdirSync(
      GENERATED_DIR,
      {
        withFileTypes: true,
      },
    )
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.startsWith(
            "college-web-presence-input.",
          ) &&
          entry.name.endsWith(".csv"),
      )
      .map((entry) => {
        const filePath =
          path.join(
            GENERATED_DIR,
            entry.name,
          );

        return {
          filePath,
          modifiedAt:
            fs.statSync(
              filePath,
            ).mtimeMs,
        };
      })
      .sort(
        (a, b) =>
          b.modifiedAt -
          a.modifiedAt,
      );

  const newestFile =
    matchingFiles[0];

  if (!newestFile) {
    throw new Error(
      [
        "No college web-presence input CSV was found.",
        "",
        "Run the input exporter first:",
        "npm run export:college-web-input -- --division NCAA_D1 --limit 5",
      ].join("\n"),
    );
  }

  return newestFile.filePath;
}

function resolveInputPath(): string {
  const fileArg =
    getArgValue("--file");

  if (!fileArg) {
    return findNewestWebPresenceInputCsv();
  }

  return path.isAbsolute(fileArg)
    ? fileArg
    : path.join(
        ROOT,
        fileArg,
      );
}

function resolveOutputDirectory(): string {
  const outputArg =
    getArgValue("--output");

  if (!outputArg) {
    return DEFAULT_OUTPUT_DIR;
  }

  return path.isAbsolute(outputArg)
    ? outputArg
    : path.join(
        ROOT,
        outputArg,
      );
}

function writeOutputCsv(
  outputDirectory: string,
  rows: OutputRow[],
): string {
  fs.mkdirSync(
    outputDirectory,
    {
      recursive: true,
    },
  );

  const outputPath =
    path.join(
      outputDirectory,
      "college-web-presence.generated.csv",
    );

  const lines = [
    OUTPUT_HEADERS.join(","),
    ...rows.map((row) =>
      OUTPUT_HEADERS
        .map(
          (header) =>
            escapeCsv(
              row[header],
            ),
        )
        .join(","),
    ),
  ];

  fs.writeFileSync(
    outputPath,
    lines.join("\n"),
    "utf8",
  );

  return outputPath;
}

async function main(): Promise<void> {
  const inputPath =
    resolveInputPath();

  const outputDirectory =
    resolveOutputDirectory();

  const limit =
    parsePositiveInt(
      getArgValue("--limit"),
    );

  const startAt =
    parsePositiveInt(
      getArgValue("--start-at"),
    ) ?? 1;

  const verbose =
    hasFlag("--verbose");

  if (
    !fs.existsSync(inputPath)
  ) {
    throw new Error(
      `Input CSV not found: ${inputPath}`,
    );
  }

  const raw =
    fs.readFileSync(
      inputPath,
      "utf8",
    )
      .replace(
        /^\uFEFF/,
        "",
      );

  const allRows =
    parseCsv(raw);

  const selectedRows =
    allRows.slice(
      startAt - 1,
      limit
        ? startAt - 1 + limit
        : undefined,
    );

  console.log("");
  console.log(
    "=".repeat(100),
  );
  console.log(
    "SCOUTLINE COLLEGE WEB-PRESENCE ENRICHMENT",
  );
  console.log(
    "=".repeat(100),
  );
  console.log("");
  console.log(
    `Input CSV:  ${inputPath}`,
  );
  console.log(
    `Input rows: ${allRows.length}`,
  );
  console.log(
    `Start row:  ${startAt}`,
  );
  console.log(
    `Rows run:   ${selectedRows.length}`,
  );
  console.log("");
  console.log(
    "Mode: discovery only; no ScoutLine database writes.",
  );
  console.log("");

  const outputRows: OutputRow[] = [];

  for (
    let index = 0;
    index < selectedRows.length;
    index++
  ) {
    const input =
      selectedRows[index];

    const label =
      `${startAt + index}/${allRows.length}`;

    console.log(
      `[${label}] ${input.name}`,
    );

    const enriched =
      await enrichRow(input);

    outputRows.push(
      enriched,
    );

    console.log(
      `  ${enriched.discoveryStatus}: ${enriched.baseballWebsiteUrl || "no baseball URL"}`,
    );

    if (
      verbose &&
      enriched.discoveryNotes
    ) {
      console.log(
        `  ${enriched.discoveryNotes}`,
      );
    }
  }

  applyCrossRecordCollisionQa(
    outputRows,
  );

  const outputPath =
    writeOutputCsv(
      outputDirectory,
      outputRows,
    );

  const statusCounts =
    outputRows.reduce<
      Record<DiscoveryStatus, number>
    >(
      (counts, row) => {
        counts[
          row.discoveryStatus
        ]++;

        return counts;
      },
      {
        FOUND: 0,
        PARTIAL: 0,
        NEEDS_REVIEW: 0,
        FAILED: 0,
      },
    );

  console.log("");
  console.log("SUMMARY");
  console.log(
    "-".repeat(100),
  );
  console.log(
    `Rows processed:  ${outputRows.length}`,
  );
  console.log(
    `Found:           ${statusCounts.FOUND}`,
  );
  console.log(
    `Partial:         ${statusCounts.PARTIAL}`,
  );
  console.log(
    `Needs review:    ${statusCounts.NEEDS_REVIEW}`,
  );
  console.log(
    `Failed:          ${statusCounts.FAILED}`,
  );
  console.log("");
  console.log(
    `Output CSV: ${outputPath}`,
  );
  console.log("");
  console.log(
    "Enrichment complete. No ScoutLine database records were created, updated, or deleted.",
  );
}

main().catch(
  (error: unknown) => {
    console.error("");
    console.error(
      "College web-presence enrichment failed.",
    );

    if (
      error instanceof Error
    ) {
      console.error(
        error.message,
      );
      console.error(
        error.stack,
      );
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  },
);