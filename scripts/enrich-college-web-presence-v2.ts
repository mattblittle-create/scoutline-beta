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

const OFFICIAL_BASEBALL_URL_OVERRIDES: Record<
  string,
  string
> = {
  "California State University, Bakersfield":
    "https://gorunners.com/sports/baseball",

  "Coppin State University":
    "https://coppinstatesports.com/sports/baseball",

  "Oral Roberts University":
    "https://oruathletics.com/sports/baseball",

  "South Dakota State University":
    "https://gojacks.com/sports/baseball",

  "University of Delaware":
    "https://bluehens.com/sports/baseball",

  "University of New Haven":
    "https://newhavenchargers.com/sports/baseball",
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
): string {
  const patterns = {
    x: [
      "x.com",
      "twitter.com",
    ],
    instagram: [
      "instagram.com",
    ],
    youtube: [
      "youtube.com",
      "youtu.be",
    ],
  };

const blockedPaths = [
  "/share",
  "/intent",
  "/home",

  // Instagram content URLs
  "/p/",
  "/reel/",
  "/reels/",
  "/tv/",
];

const match = links.find((link) => {
  const normalized = link.url.toLowerCase();

  const platformMatches =
    patterns[platform].some(
      (pattern) =>
        normalized.includes(pattern),
    );

  const blocked =
    blockedPaths.some(
      (pathValue) =>
        normalized.includes(pathValue),
    );

  const isValidYoutubeProfile =
    platform !== "youtube" ||
    [
      "/channel/",
      "/@",
      "/c/",
      "/user/",
    ].some((pathValue) =>
      normalized.includes(pathValue),
    );

  return (
    platformMatches &&
    !blocked &&
    isValidYoutubeProfile
  );
});

return match?.url ?? "";
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

  const hasStrongBaseballPath =
    pathname === "/sports/baseball" ||
    pathname === "/sports/baseball/" ||
    pathname === "/sport/baseball" ||
    pathname === "/sport/baseball/" ||
    pathname === "/baseball" ||
    pathname === "/baseball/";

  const hasBaseballIdentity =
    hasStrongBaseballPath ||
    pathname.includes("/baseball") ||
    pathname.includes("baseball") ||
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
    "news",
  ].filter(
    (term) =>
      body.includes(term),
  ).length;

  const hasProgramNavigation =
    navigationTermCount >= 2;

  /*
   * A canonical athletics URL such as
   * /sports/baseball is already a strong signal.
   * Some Sidearm pages render most navigation
   * client-side, so the fetched HTML may not expose
   * every expected roster/schedule/coaches term.
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

function determineStatus(
  row: OutputRow,
): DiscoveryStatus {
  if (!row.baseballWebsiteUrl) {
    return "FAILED";
  }

  const populatedCoreFields = [
    row.rosterUrl,
    row.scheduleUrl,
    row.campsUrl,
    row.questionnaireUrl,
    row.generalContactUrl,
    row.programXUrl,
    row.programInstagramUrl,
  ].filter(Boolean).length;

  if (populatedCoreFields >= 4) {
    return "FOUND";
  }

  if (populatedCoreFields >= 1) {
    return "PARTIAL";
  }

  return "NEEDS_REVIEW";
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
    const athletics =
      await discoverAthleticsSite(
        websiteUrl,
      );

    if (!athletics.athleticsUrl) {
      baseRow.discoveryStatus =
        "FAILED";

      baseRow.discoveryNotes =
        "Could not discover an official athletics website from the institutional website.";

      return baseRow;
    }

    baseball =
      await discoverBaseballPage(
        athletics.athleticsUrl,
        athletics.sourceHtml,
      );

    if (!baseball.baseballUrl) {
      baseRow.sourceUrl =
        athletics.athleticsUrl;

      baseRow.discoveryStatus =
        "NEEDS_REVIEW";

      baseRow.discoveryNotes =
        "Athletics website found, but baseball page was not confidently identified.";

      return baseRow;
    }
  }

  const links =
    extractLinks(
      baseball.baseballHtml,
      baseball.baseballUrl,
    );

  const preferredHost =
    hostnameWithoutWww(
      baseball.baseballUrl,
    );

  baseRow.baseballWebsiteUrl =
    baseRow.baseballWebsiteUrl ||
    baseball.baseballUrl;

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
  );

  baseRow.programInstagramUrl =
    baseRow.programInstagramUrl ||
    extractSocialUrl(
      links,
      "instagram",
    );

  baseRow.programYoutubeUrl =
    baseRow.programYoutubeUrl ||
    extractSocialUrl(
      links,
      "youtube",
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

  baseRow.discoveryNotes =
    foundFields.length > 0
      ? `Discovered: ${foundFields.join(", ")}.`
      : "Baseball page found, but no secondary links were confidently identified.";

  return baseRow;
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