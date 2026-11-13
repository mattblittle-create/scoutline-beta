// scripts/discover-college-website-seeds.ts

import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

import {
  CollegeAthleticDivision,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

const ROOT = process.cwd();

const GENERATED_DIR = path.join(
  ROOT,
  "data",
  "enrichment",
  "generated",
);

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

const ARGS = process.argv.slice(2);

type SupportedDivision =
  | "NCAA_D1"
  | "NCAA_D2"
  | "NCAA_D3"
  | "NAIA"
  | "NJCAA_D1"
  | "NJCAA_D2"
  | "NJCAA_D3";

type SearchProvider =
  | "DIRECT"
  | "DUCKDUCKGO"
  | "BING";

type SeedConfidence =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "NONE";

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
  statusCode: number | null;
};

type IdentityEvaluation = {
  valid: boolean;
  score: number;

  exactSchoolPhrase: boolean;
  exactSchoolPhraseInTitle: boolean;
  exactSchoolPhraseInHeading: boolean;

  tokenMatches: number;
  tokenCount: number;
  tokenRatio: number;

  domainTokenMatches: number;

  cityMatch: boolean;
  stateMatch: boolean;

  isEduDomain: boolean;
  canonicalBaseballPath: boolean;
  baseballPath: boolean;
  athleticsPath: boolean;

  athleticsSignals: number;
  baseballSignal: boolean;

  reasons: string[];
};

type Candidate = {
  seedUrl: string;
  finalUrl: string;

  score: number;

  provider: SearchProvider;
  sourceQuery: string;

  pageTitle: string;

  identityValidated: boolean;
  validationReason: string[];

  isEduDomain: boolean;
  canonicalBaseballPath: boolean;
};

type OutputRow = {
  slug: string;
  name: string;
  websiteUrl: string;

  baseballNickname: string;
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

  city: string;
  state: string;

  directCandidateFound: string;
  searchCandidateFound: string;
  identityValidated: string;

  seedSource: string;
  seedConfidence: SeedConfidence;
  seedScore: string;
  seedNotes: string;
};

const OUTPUT_HEADERS: Array<keyof OutputRow> = [
  "slug",
  "name",
  "websiteUrl",

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

  "programXUrl",
  "programInstagramUrl",
  "programYoutubeUrl",

  "city",
  "state",

  "directCandidateFound",
  "searchCandidateFound",
  "identityValidated",

  "seedSource",
  "seedConfidence",
  "seedScore",
  "seedNotes",
];

/**
 * Hosts that should never be treated as an official
 * college/athletics seed.
 *
 * This list intentionally includes common search-result
 * false positives observed during D2 QA.
 */
const BLOCKED_HOSTS = [
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
];

/**
 * Bing itself must never survive outbound URL unwrapping.
 */
const SEARCH_PROVIDER_HOSTS = [
  "bing.com",
  "duckduckgo.com",
];

/**
 * URL paths that are poor seeds even when the host itself
 * could theoretically be relevant.
 */
const BLOCKED_URL_TERMS = [
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

/**
 * IMPORTANT:
 * "state" is intentionally NOT a stop word.
 *
 * Removing "state" caused:
 *
 *   Adams State -> Adams
 *   Albany State -> Albany
 *
 * which created obvious false positives.
 */
const SCHOOL_STOP_WORDS = new Set([
  "university",
  "college",
  "the",
  "of",
  "at",
  "and",
  "campus",
  "main",
  "school",
  "institute",
  "institution",
]);

const ATHLETICS_SIGNALS = [
  "athletics",
  "official athletics",
  "baseball",
  "roster",
  "schedule",
  "coaches",
  "sports",
  "student athletes",
  "student-athletes",
];

const BASEBALL_PATHS = [
  "/sports/baseball",
  "/sport/baseball",
  "/baseball",
];

function getArgValue(
  flag: string,
): string | null {
  const index = ARGS.indexOf(flag);

  if (
    index === -1 ||
    index >= ARGS.length - 1
  ) {
    return null;
  }

  const value = ARGS[index + 1];

  if (
    !value ||
    value.startsWith("--")
  ) {
    return null;
  }

  return value;
}

function hasFlag(
  flag: string,
): boolean {
  return ARGS.includes(flag);
}

function parsePositiveInt(
  value: string | null,
): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(
    value,
    10,
  );

  return (
    Number.isFinite(parsed) &&
    parsed > 0
  )
    ? parsed
    : null;
}

function clean(
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
  return clean(value)
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[\u2010-\u2015]/g,
      "-",
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeSchoolName(
  value: string,
): string {
  return clean(value)
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[\u2010-\u2015]/g,
      "-",
    )
    .replace(
      /\s*-\s*/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function schoolNameVariants(
  value: string,
): string[] {
  const original = clean(value);

  const normalized =
    normalizeSchoolName(value);

  const variants = [
    original,
    normalized,
  ];

  /**
   * University of X -> X
   */
  const withoutUniversityOf =
    normalized
      .replace(
        /^University of\s+/i,
        "",
      )
      .trim();

  /**
   * X University -> X
   */
  const withoutUniversity =
    normalized
      .replace(
        /\s+University$/i,
        "",
      )
      .trim();

  /**
   * X College -> X
   */
  const withoutCollege =
    normalized
      .replace(
        /\s+College$/i,
        "",
      )
      .trim();

  variants.push(
    withoutUniversityOf,
    withoutUniversity,
    withoutCollege,
  );

  return Array.from(
    new Set(
      variants.filter(Boolean),
    ),
  );
}

function schoolIdentityTokens(
  schoolName: string,
): string[] {
  return normalizeText(schoolName)
    .split(" ")
    .filter(Boolean)
    .filter(
      (token) =>
        token.length >= 3 &&
        !SCHOOL_STOP_WORDS.has(token),
    );
}

function meaningfulSchoolPhrase(
  schoolName: string,
): string {
  return schoolIdentityTokens(
    schoolName,
  ).join(" ");
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

function normalizeUrl(
  value: unknown,
  baseUrl?: string,
): string | null {
  const raw = clean(value);

  if (!raw) {
    return null;
  }

  if (
    raw.startsWith("mailto:") ||
    raw.startsWith("tel:") ||
    raw.startsWith("javascript:") ||
    raw.startsWith("#")
  ) {
    return null;
  }

  try {
    const url = baseUrl
      ? new URL(raw, baseUrl)
      : new URL(
          /^https?:\/\//i.test(raw)
            ? raw
            : `https://${raw}`,
        );

    url.hash = "";

    return url.toString();
  } catch {
    return null;
  }
}

function isEduDomain(
  url: string,
): boolean {
  const host =
    hostnameWithoutWww(url);

  return (
    host.endsWith(".edu") ||
    host === "edu"
  );
}

function isBlockedHost(
  url: string,
): boolean {
  const host =
    hostnameWithoutWww(url);

  if (!host) {
    return true;
  }

  return [
    ...BLOCKED_HOSTS,
    ...SEARCH_PROVIDER_HOSTS,
  ].some(
    (blockedHost) =>
      host === blockedHost ||
      host.endsWith(
        `.${blockedHost}`,
      ),
  );
}

function isBlockedUrl(
  url: string,
): boolean {
  const lower =
    url.toLowerCase();

  return BLOCKED_URL_TERMS.some(
    (term) =>
      lower.includes(term),
  );
}

function escapeCsv(
  value: unknown,
): string {
  const text =
    String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replace(
      /"/g,
      '""',
    )}"`;
  }

  return text;
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

async function fetchHtmlDetailed(
  url: string,
  timeoutMs = 20_000,
): Promise<{
  finalUrl: string;
  html: string;
  statusCode: number;
} | null> {
  const controller =
    new AbortController();

  const timeout = setTimeout(
    () =>
      controller.abort(),
    timeoutMs,
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

      statusCode:
        response.status,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function looksThrottled(
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

    let payload = encoded;

    /**
     * Bing outbound URLs commonly prefix
     * the base64 destination with "a1".
     */
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

function cleanSearchResults(
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

        if (!normalized) {
          return false;
        }

        if (
          isBlockedHost(
            normalized,
          ) ||
          isBlockedUrl(
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
    await fetchHtmlDetailed(
      url,
      20_000,
    );

  if (!fetched) {
    return {
      provider:
        "DUCKDUCKGO",

      query,

      results: [],

      throttled:
        false,

      statusCode:
        null,
    };
  }

  const throttled =
    looksThrottled(
      fetched.html,
    );

  if (throttled) {
    return {
      provider:
        "DUCKDUCKGO",

      query,

      results: [],

      throttled:
        true,

      statusCode:
        fetched.statusCode,
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
        anchor.attr(
          "href",
        );

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
          clean(
            anchor.text(),
          ),

        url:
          resultUrl,

        snippet:
          clean(
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
      cleanSearchResults(
        results,
      ),

    throttled:
      false,

    statusCode:
      fetched.statusCode,
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
    await fetchHtmlDetailed(
      url,
      20_000,
    );

  if (!fetched) {
    return {
      provider:
        "BING",

      query,

      results: [],

      throttled:
        false,

      statusCode:
        null,
    };
  }

  const throttled =
    looksThrottled(
      fetched.html,
    );

  if (throttled) {
    return {
      provider:
        "BING",

      query,

      results: [],

      throttled:
        true,

      statusCode:
        fetched.statusCode,
    };
  }

  const $ =
    cheerio.load(
      fetched.html,
    );

  const results:
    SearchResult[] = [];

  $("li.b_algo")
    .each(
      (_, element) => {
        const anchor =
          $(element)
            .find(
              "h2 a",
            )
            .first();

        const href =
          anchor.attr(
            "href",
          );

        const resultUrl =
          href
            ? unwrapBingUrl(
                href,
              )
            : null;

        if (!resultUrl) {
          return;
        }

        results.push({
          title:
            clean(
              anchor.text(),
            ),

          url:
            resultUrl,

          snippet:
            clean(
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

  /**
   * Fallback selector if Bing changes
   * the standard b_algo markup.
   */
  if (
    results.length === 0
  ) {
    $("#b_results h2 a")
      .each(
        (_, element) => {
          const href =
            $(element).attr(
              "href",
            );

          const resultUrl =
            href
              ? unwrapBingUrl(
                  href,
                )
              : null;

          if (!resultUrl) {
            return;
          }

          results.push({
            title:
              clean(
                $(element)
                  .text(),
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
      cleanSearchResults(
        results,
      ),

    throttled:
      false,

    statusCode:
      fetched.statusCode,
  };
}

function buildQueries(
  schoolName: string,
  city: string,
  state: string,
): string[] {
  const variants =
    schoolNameVariants(
      schoolName,
    );

  const queries:
    string[] = [];

  for (
    const variant of variants
  ) {
    /*
     * Start with broader searches.
     * These work better for abbreviated
     * database names like:
     *
     * Alabama-Huntsville
     * Arkansas-Fort Smith
     * American International
     */
    if (state) {
      queries.push(
        `${variant} baseball athletics ${state}`,
      );
    } else {
      queries.push(
        `${variant} baseball athletics`,
      );
    }

    queries.push(
      `${variant} baseball roster`,
    );

    queries.push(
      `${variant} university baseball`,
    );

    /*
     * Then use quoted searches for precision.
     */
    queries.push(
      `"${variant}" baseball`,
    );

    queries.push(
      `"${variant}" baseball athletics`,
    );

    queries.push(
      `"${variant}" official athletics`,
    );

    if (state) {
      queries.push(
        `"${variant}" baseball ${state}`,
      );
    }
  }

  /*
   * Add a location-specific query when we
   * have city and/or state information.
   */
  if (
    (city || state) &&
    variants.length > 0
  ) {
    queries.push(
      `"${variants[0]}" ${city} ${state} athletics`,
    );
  }

  return Array.from(
    new Set(
      queries
        .map(
          (query) =>
            query
              .replace(
                /\s+/g,
                " ",
              )
              .trim(),
        )
        .filter(Boolean),
    ),
  ).slice(0, 14);
}

async function multiProviderSearch(
  query: string,
  verbose: boolean,
): Promise<SearchResult[]> {
  const ddg =
    await searchDuckDuckGo(
      query,
    );

  if (verbose) {
    console.log(
      `    DDG: ${ddg.results.length} result(s)${
        ddg.throttled
          ? " [THROTTLED]"
          : ""
      }`,
    );
  }

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

  if (verbose) {
    console.log(
      `    Bing: ${bing.results.length} result(s)${
        bing.throttled
          ? " [THROTTLED]"
          : ""
      }`,
    );
  }

  return cleanSearchResults([
    ...ddg.results,
    ...bing.results,
  ]);
}

function countDomainTokenMatches(
  url: string,
  schoolName: string,
): number {
  const host =
    hostnameWithoutWww(url);

  if (!host) {
    return 0;
  }

  const normalizedHost =
    normalizeText(
      host.replace(/\./g, " "),
    );

  return schoolIdentityTokens(
    schoolName,
  ).filter(
    (token) =>
      normalizedHost.includes(
        token,
      ),
  ).length;
}

function pathSignals(
  pageUrl: string,
): {
  canonicalBaseballPath: boolean;
  baseballPath: boolean;
  athleticsPath: boolean;
} {
  try {
    const pathname =
      new URL(pageUrl)
        .pathname
        .replace(/\/+$/, "")
        .toLowerCase();

    const canonicalBaseballPath =
      BASEBALL_PATHS.includes(
        pathname,
      );

    const baseballPath =
      canonicalBaseballPath ||
      pathname.includes(
        "/baseball",
      );

    const athleticsPath =
      pathname.includes(
        "/athletics",
      ) ||
      pathname.includes(
        "/sports",
      );

    return {
      canonicalBaseballPath,
      baseballPath,
      athleticsPath,
    };
  } catch {
    return {
      canonicalBaseballPath:
        false,

      baseballPath:
        false,

      athleticsPath:
        false,
    };
  }
}

function evaluateIdentity(
  html: string,
  pageUrl: string,
  schoolName: string,
  city: string,
  state: string,
): IdentityEvaluation {
  const $ =
    cheerio.load(html);

  const title =
    clean(
      $("title")
        .first()
        .text(),
    );

  const heading =
    clean(
      $("h1")
        .first()
        .text(),
    );

  const body =
    clean(
      $("body")
        .text(),
    )
      .replace(/\s+/g, " ")
      .slice(0, 25_000);

  const normalizedTitle =
    normalizeText(title);

  const normalizedHeading =
    normalizeText(heading);

  const normalizedBody =
    normalizeText(body);

  const fullCombined =
    `${normalizedTitle} ${normalizedHeading} ${normalizedBody}`;

  const schoolPhrase =
    meaningfulSchoolPhrase(
      schoolName,
    );

  const variants =
    schoolNameVariants(
      schoolName,
    )
      .map(
        normalizeText,
      )
      .filter(Boolean);

  const exactSchoolPhraseInTitle =
    variants.some(
      (variant) =>
        normalizedTitle.includes(
          variant,
        ),
    ) ||
    (
      Boolean(schoolPhrase) &&
      normalizedTitle.includes(
        schoolPhrase,
      )
    );

  const exactSchoolPhraseInHeading =
    variants.some(
      (variant) =>
        normalizedHeading.includes(
          variant,
        ),
    ) ||
    (
      Boolean(schoolPhrase) &&
      normalizedHeading.includes(
        schoolPhrase,
      )
    );

  const exactSchoolPhraseInBody =
    variants.some(
      (variant) =>
        normalizedBody.includes(
          variant,
        ),
    ) ||
    (
      Boolean(schoolPhrase) &&
      normalizedBody.includes(
        schoolPhrase,
      )
    );

  const exactSchoolPhrase =
    exactSchoolPhraseInTitle ||
    exactSchoolPhraseInHeading ||
    exactSchoolPhraseInBody;

  const tokens =
    schoolIdentityTokens(
      schoolName,
    );

  const tokenMatches =
    tokens.filter(
      (token) =>
        fullCombined.includes(
          token,
        ),
    ).length;

  const tokenCount =
    tokens.length;

  const tokenRatio =
    tokenCount
      ? tokenMatches /
        tokenCount
      : 0;

  const domainTokenMatches =
    countDomainTokenMatches(
      pageUrl,
      schoolName,
    );

  const cityMatch =
    Boolean(city) &&
    fullCombined.includes(
      normalizeText(city),
    );

  const stateMatch =
    Boolean(state) &&
    fullCombined.includes(
      normalizeText(state),
    );

  const hasKnownState =
  Boolean(
    clean(state),
  );

  const eduDomain =
    isEduDomain(
      pageUrl,
    );

  const {
    canonicalBaseballPath,
    baseballPath,
    athleticsPath,
  } =
    pathSignals(
      pageUrl,
    );

  const athleticsMatches =
    ATHLETICS_SIGNALS.filter(
      (signal) =>
        fullCombined.includes(
          normalizeText(signal),
        ),
    ).length;

  const baseballSignal =
    fullCombined.includes(
      "baseball",
    );

  const reasons:
    string[] = [];

  let score = 0;

  if (
    exactSchoolPhraseInTitle
  ) {
    score += 130;

    reasons.push(
      "exact school identity in title",
    );
  } else if (
    exactSchoolPhraseInHeading
  ) {
    score += 110;

    reasons.push(
      "exact school identity in heading",
    );
  } else if (
    exactSchoolPhraseInBody
  ) {
    score += 60;

    reasons.push(
      "exact school identity in body",
    );
  }

  if (tokenCount) {
    score +=
      Math.round(
        tokenRatio * 70,
      );

    reasons.push(
      `school tokens ${tokenMatches}/${tokenCount}`,
    );
  }

  if (
    domainTokenMatches > 0
  ) {
    score +=
      domainTokenMatches *
      25;

    reasons.push(
      `domain tokens ${domainTokenMatches}`,
    );
  }

  if (eduDomain) {
    score += 80;

    reasons.push(
      ".edu domain",
    );
  }

  if (
    canonicalBaseballPath
  ) {
    score += 130;

    reasons.push(
      "canonical baseball path",
    );
  } else if (
    baseballPath
  ) {
    score += 70;

    reasons.push(
      "baseball URL path",
    );
  }

  if (
    athleticsPath
  ) {
    score += 25;

    reasons.push(
      "athletics URL path",
    );
  }

  if (
    baseballSignal
  ) {
    score += 25;

    reasons.push(
      "baseball page signal",
    );
  }

  if (
    athleticsMatches >= 3
  ) {
    score += 35;

    reasons.push(
      `athletics signals ${athleticsMatches}`,
    );
  }

  if (cityMatch) {
    score += 15;

    reasons.push(
      "city match",
    );
  }

  if (stateMatch) {
    score += 10;

    reasons.push(
      "state match",
    );
  }

  /**
   * ---------------------------
   * VALIDATION GATES
   * ---------------------------
   *
   * Score alone is not enough.
   */

  let valid = false;

  /**
   * BEST CASE:
   * Canonical baseball page + school identity.
   *
   * Supports independent athletics domains like:
   *
   *   asugrizzlies.com/sports/baseball
   */
  if (
    canonicalBaseballPath &&
    baseballSignal &&
    (
      exactSchoolPhrase ||
      tokenRatio >= 0.75
    )
  ) {
    valid = true;
  }

  /**
   * Official university domain.
   *
   * One-token names such as Adelphi or Ashland
   * may be legitimate when the .edu domain and
   * page identity agree.
   */
if (
  !valid &&
  eduDomain &&
  (
    /*
     * Multi-token schools may validate strongly
     * from domain + page identity.
     */
    (
      tokenCount >= 2 &&
      domainTokenMatches === tokenCount &&
      tokenRatio >= 0.75 &&
      (
        !hasKnownState ||
        stateMatch
      )
    ) ||

    /*
     * Single-token schools are much more
     * ambiguous (Augustana, Ashland, Barry, etc.).
     *
     * When ScoutLine has a state, require the
     * page to agree with that state before an
     * institutional .edu domain can validate.
     */
    (
      tokenCount === 1 &&
      domainTokenMatches === 1 &&
      tokenRatio === 1 &&
      (
        !hasKnownState ||
        stateMatch
      )
    ) ||

    /*
     * Exact page identity must still agree with
     * known geography.
     */
    (
      exactSchoolPhrase &&
      (
        !hasKnownState ||
        stateMatch
      )
    ) ||

    /*
     * Strong-token fallback.
     */
    (
      tokenRatio >= 0.75 &&
      domainTokenMatches > 0 &&
      (
        !hasKnownState ||
        stateMatch
      )
    )
  )
) {
  valid = true;
}

  /**
   * Independent athletics domains.
   *
   * Require stronger baseball + school evidence.
   */
  if (
    !valid &&
    !eduDomain &&
    baseballPath &&
    baseballSignal &&
    athleticsMatches >= 2 &&
    (
      exactSchoolPhraseInTitle ||
      exactSchoolPhraseInHeading ||
      (
        tokenRatio >= 0.8 &&
        domainTokenMatches > 0
      )
    )
  ) {
    valid = true;
  }

  /**
   * Athletics homepage/domain without baseball
   * in pathname.
   */
  if (
    !valid &&
    !eduDomain &&
    athleticsMatches >= 4 &&
    baseballSignal &&
    (
      exactSchoolPhraseInTitle ||
      exactSchoolPhraseInHeading
    )
  ) {
    valid = true;
  }

  /**
   * Generic third-party domains must NEVER pass
   * merely because text matches happen to exist.
   */
  if (
    !eduDomain &&
    !canonicalBaseballPath &&
    !baseballPath &&
    !exactSchoolPhraseInTitle &&
    !exactSchoolPhraseInHeading
  ) {
    valid = false;
  }

  return {
    valid,
    score,

    exactSchoolPhrase,
    exactSchoolPhraseInTitle,
    exactSchoolPhraseInHeading,

    tokenMatches,
    tokenCount,
    tokenRatio,

    domainTokenMatches,

    cityMatch,
    stateMatch,

    isEduDomain:
      eduDomain,

    canonicalBaseballPath,
    baseballPath,
    athleticsPath,

    athleticsSignals:
      athleticsMatches,

    baseballSignal,

    reasons,
  };
}


function uniqueStrings(
  values: string[],
): string[] {
  return Array.from(
    new Set(
      values
        .map((value) =>
          clean(value)
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  );
}

function buildDirectDomainCandidates(
  schoolName: string,
): string[] {
  const tokens =
    schoolIdentityTokens(
      schoolName,
    );

  const compact =
    tokens.join("");

  const initials =
    tokens
      .map(
        (token) =>
          token[0] ?? "",
      )
      .join("");

  const firstPlusInitials =
    tokens.length >= 2
      ? [
          tokens[0],
          ...tokens
            .slice(1)
            .map(
              (token) =>
                token[0] ?? "",
            ),
        ].join("")
      : compact;

  const bases =
    uniqueStrings([
      compact,
      `${compact}u`,
      `${compact}university`,
      initials,
      `${initials}u`,
      `u${initials}`,
      `${initials}c`,
      firstPlusInitials,
    ]).filter(
      (value) =>
        value.length >= 2,
    );

  const domains:
    string[] = [];

  for (const base of bases) {
    domains.push(
      `${base}.edu`,
    );
  }

  /*
   * Athletics-specific domains are less predictable,
   * so keep this candidate set intentionally small.
   *
   * These patterns catch common official structures:
   *
   *   arkansastechsports.com
   *   uamsports.com
   *   <acronym>athletics.com
   */
  for (
    const base of uniqueStrings([
      compact,
      initials,
      `u${initials}`,
      `${initials}u`,
    ])
  ) {
    if (
      base.length < 2
    ) {
      continue;
    }

    domains.push(
      `${base}sports.com`,
      `${base}athletics.com`,
    );
  }

  return uniqueStrings(
    domains,
  ).slice(0, 18);
}

function extractLikelyOfficialLinks(
  html: string,
  baseUrl: string,
): string[] {
  const $ =
    cheerio.load(
      html,
    );

  const links:
    Array<{
      url: string;
      score: number;
    }> = [];

  $("a[href]").each(
    (_, element) => {
      const href =
        $(element).attr(
          "href",
        );

      const url =
        href
          ? normalizeUrl(
              href,
              baseUrl,
            )
          : null;

      if (
        !url ||
        isBlockedHost(url) ||
        isBlockedUrl(url)
      ) {
        return;
      }

      const anchorText =
        normalizeText(
          $(element).text(),
        );

      const lowerUrl =
        url.toLowerCase();

      let score = 0;

      if (
        anchorText.includes(
          "baseball",
        )
      ) {
        score += 100;
      }

      if (
        anchorText.includes(
          "athletics",
        )
      ) {
        score += 80;
      }

      if (
        anchorText.includes(
          "sports",
        )
      ) {
        score += 35;
      }

      if (
        lowerUrl.includes(
          "/sports/baseball",
        ) ||
        lowerUrl.includes(
          "/sport/baseball",
        )
      ) {
        score += 140;
      } else if (
        lowerUrl.includes(
          "baseball",
        )
      ) {
        score += 80;
      }

      if (
        lowerUrl.includes(
          "athletics",
        ) ||
        lowerUrl.includes(
          "sports",
        )
      ) {
        score += 30;
      }

      if (
        score > 0
      ) {
        links.push({
          url,
          score,
        });
      }
    },
  );

  const seen =
    new Set<string>();

  return links
    .sort(
      (a, b) =>
        b.score - a.score,
    )
    .map(
      (item) =>
        item.url,
    )
    .filter(
      (url) => {
        const key =
          url
            .replace(
              /\/+$/,
              "",
            )
            .toLowerCase();

        if (
          seen.has(key)
        ) {
          return false;
        }

        seen.add(key);

        return true;
      },
    )
    .slice(0, 8);
}

async function validateDirectUrl(
  url: string,
  school: {
    name: string;
    city: string;
    state: string;
  },
  verbose: boolean,
): Promise<Candidate | null> {
  const fetched =
    await fetchHtmlDetailed(
      url,
      7_000,
    );

  if (
    !fetched ||
    isBlockedHost(
      fetched.finalUrl,
    ) ||
    isBlockedUrl(
      fetched.finalUrl,
    )
  ) {
    return null;
  }

  const identity =
    evaluateIdentity(
      fetched.html,
      fetched.finalUrl,
      school.name,
      school.city,
      school.state,
    );

  if (verbose) {
    console.log(
      `    Direct: ${fetched.finalUrl} -> ${
        identity.valid
          ? "VALID"
          : "rejected"
      }`,
    );
  }

  if (
    identity.valid
  ) {
    return {
      seedUrl:
        chooseSeedWebsiteUrl(
          fetched.finalUrl,
        ),

      finalUrl:
        fetched.finalUrl,

      score:
        identity.score + 100,

      provider:
        "DIRECT",

      sourceQuery:
        `direct:${hostnameWithoutWww(
          fetched.finalUrl,
        )}`,

      pageTitle:
        clean(
          cheerio
            .load(
              fetched.html,
            )("title")
            .first()
            .text(),
        ),

      identityValidated:
        true,

      validationReason: [
        "direct-domain probe",
        `identity=${identity.score}`,
        ...identity.reasons,
      ],

      isEduDomain:
        identity.isEduDomain,

      canonicalBaseballPath:
        identity.canonicalBaseballPath,
    };
  }

  /*
   * A valid institution homepage can link to an
   * athletics domain that does not resemble the
   * school's name. Follow only the strongest
   * athletics/baseball links and validate them
   * independently.
   */
  const likelyLinks =
    extractLikelyOfficialLinks(
      fetched.html,
      fetched.finalUrl,
    );

  for (
    const linkedUrl of likelyLinks
  ) {
    const linked =
      await fetchHtmlDetailed(
        linkedUrl,
        7_000,
      );

    if (
      !linked ||
      isBlockedHost(
        linked.finalUrl,
      ) ||
      isBlockedUrl(
        linked.finalUrl,
      )
    ) {
      continue;
    }

    const linkedIdentity =
      evaluateIdentity(
        linked.html,
        linked.finalUrl,
        school.name,
        school.city,
        school.state,
      );

    if (
      !linkedIdentity.valid
    ) {
      continue;
    }

    if (verbose) {
      console.log(
        `    Direct-linked: ${linked.finalUrl} -> VALID`,
      );
    }

    return {
      seedUrl:
        chooseSeedWebsiteUrl(
          linked.finalUrl,
        ),

      finalUrl:
        linked.finalUrl,

      score:
        linkedIdentity.score + 120,

      provider:
        "DIRECT",

      sourceQuery:
        `direct-link:${hostnameWithoutWww(
          fetched.finalUrl,
        )}`,

      pageTitle:
        clean(
          cheerio
            .load(
              linked.html,
            )("title")
            .first()
            .text(),
        ),

      identityValidated:
        true,

      validationReason: [
        `linked from ${fetched.finalUrl}`,
        `identity=${linkedIdentity.score}`,
        ...linkedIdentity.reasons,
      ],

      isEduDomain:
        linkedIdentity.isEduDomain,

      canonicalBaseballPath:
        linkedIdentity.canonicalBaseballPath,
    };
  }

  return null;
}

async function discoverDirectCandidate(
  school: {
    name: string;
    city: string;
    state: string;
  },
  verbose: boolean,
): Promise<{
  candidate: Candidate | null;
  directCandidateFound: boolean;
}> {
  const domains =
    buildDirectDomainCandidates(
      school.name,
    );

  let directCandidateFound =
    false;

  for (
    const domain of domains
  ) {
    const urls = [
      `https://${domain}`,
      `https://www.${domain}`,
    ];

    for (
      const url of urls
    ) {
      const fetched =
        await fetchHtmlDetailed(
          url,
          4_500,
        );

      if (!fetched) {
        continue;
      }

      directCandidateFound =
        true;

      /*
       * We already fetched the page to establish
       * existence; now validate through the common
       * helper so redirect/follow-link behavior stays
       * in one place.
       */
      const candidate =
        await validateDirectUrl(
          fetched.finalUrl,
          school,
          verbose,
        );

      if (candidate) {
        return {
          candidate,
          directCandidateFound:
            true,
        };
      }
    }
  }

  return {
    candidate:
      null,
    directCandidateFound,
  };
}

function scoreSearchResult(
  result: SearchResult,
  schoolName: string,
  city: string,
  state: string,
): number {
  const combined =
    normalizeText(
      `${result.title} ${result.snippet}`,
    );

  const tokens =
    schoolIdentityTokens(
      schoolName,
    );

  const tokenMatches =
    tokens.filter(
      (token) =>
        combined.includes(
          token,
        ),
    ).length;

  const tokenRatio =
    tokens.length
      ? tokenMatches /
        tokens.length
      : 0;

  const phrase =
    meaningfulSchoolPhrase(
      schoolName,
    );

  let score = 0;

  if (
    phrase &&
    combined.includes(
      phrase,
    )
  ) {
    score += 100;
  }

  score +=
    Math.round(
      tokenRatio * 50,
    );

  if (
    combined.includes(
      "baseball",
    )
  ) {
    score += 35;
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
      "official athletics",
    )
  ) {
    score += 40;
  }

  if (
    city &&
    combined.includes(
      normalizeText(city),
    )
  ) {
    score += 10;
  }

  if (
    state &&
    combined.includes(
      normalizeText(state),
    )
  ) {
    score += 5;
  }

  const domainMatches =
    countDomainTokenMatches(
      result.url,
      schoolName,
    );

  score +=
    domainMatches * 20;

  if (
    isEduDomain(
      result.url,
    )
  ) {
    score += 50;
  }

  const signals =
    pathSignals(
      result.url,
    );

  if (
    signals.canonicalBaseballPath
  ) {
    score += 120;
  } else if (
    signals.baseballPath
  ) {
    score += 60;
  }

  return score;
}

function chooseSeedWebsiteUrl(
  finalUrl: string,
): string {
  try {
    const parsed =
      new URL(
        finalUrl,
      );

    const pathname =
      parsed.pathname
        .replace(/\/+$/, "")
        .toLowerCase();

    if (
      BASEBALL_PATHS.includes(
        pathname,
      )
    ) {
      return finalUrl;
    }

    if (
      pathname.startsWith(
        "/sports/baseball/",
      )
    ) {
      return (
        `${parsed.origin}/sports/baseball`
      );
    }

    if (
      pathname.startsWith(
        "/sport/baseball/",
      )
    ) {
      return (
        `${parsed.origin}/sport/baseball`
      );
    }

    if (
      pathname.startsWith(
        "/baseball/",
      )
    ) {
      return (
        `${parsed.origin}/baseball`
      );
    }

    return parsed.origin;
  } catch {
    return finalUrl;
  }
}

function candidateConfidence(
  candidate: Candidate | null,
): SeedConfidence {
  if (
    !candidate ||
    !candidate.identityValidated
  ) {
    return "NONE";
  }

  /**
   * Canonical baseball pages are particularly
   * strong seeds.
   */
  if (
    candidate.canonicalBaseballPath &&
    candidate.score >= 250
  ) {
    return "HIGH";
  }

  if (
    candidate.isEduDomain &&
    candidate.score >= 220
  ) {
    return "HIGH";
  }

  if (
    candidate.score >= 190
  ) {
    return "MEDIUM";
  }

  if (
    candidate.score >= 150
  ) {
    return "LOW";
  }

  return "NONE";
}

async function discoverSeedForSchool(
  school: {
    name: string;
    city: string | null;
    state: string | null;
  },
  verbose: boolean,
): Promise<{
  candidate: Candidate | null;
  directCandidateFound: boolean;
  searchCandidateFound: boolean;
}> {
  const city =
    clean(
      school.city,
    );

  const state =
    clean(
      school.state,
    );

  /*
   * V4: probe plausible official institutional /
   * athletics domains before using search engines.
   *
   * Strict identity validation remains mandatory.
   */
  const direct =
    await discoverDirectCandidate(
      {
        name:
          school.name,
        city,
        state,
      },
      verbose,
    );

  if (
    direct.candidate
  ) {
    return {
      candidate:
        direct.candidate,
      directCandidateFound:
        true,
      searchCandidateFound:
        false,
    };
  }

  const queries =
    buildQueries(
      school.name,
      city,
      state,
    );

  const collected:
    SearchResult[] = [];

  let queriesAttempted = 0;

for (
  const query of queries
) {
  queriesAttempted++;

  if (verbose) {
    console.log(
      `  Search: ${query}`,
    );
  }

    const results =
      await multiProviderSearch(
        query,
        verbose,
      );

    collected.push(
      ...results,
    );

    const hosts =
      new Set(
        collected
          .map(
            (result) =>
              hostnameWithoutWww(
                result.url,
              ),
          )
          .filter(Boolean),
      );

    /**
     * Stop querying once we have a decent
     * diversity of candidates.
     */
if (
  queriesAttempted >= 5 &&
  collected.length >= 10 &&
  hosts.size >= 4
) {
  break;
}

    await sleep(
      randomDelay(
        650,
        1100,
      ),
    );
  }

  const deduped =
    new Map<
      string,
      SearchResult
    >();

  for (
    const result of
      collected
  ) {
    const normalized =
      normalizeUrl(
        result.url,
      );

    if (
      !normalized ||
      isBlockedHost(
        normalized,
      ) ||
      isBlockedUrl(
        normalized,
      )
    ) {
      continue;
    }

    const key =
      normalized
        .replace(/\/+$/, "")
        .toLowerCase();

    if (
      !deduped.has(key)
    ) {
      deduped.set(
        key,
        {
          ...result,
          url:
            normalized,
        },
      );
    }
  }

  const searchCandidateFound =
    deduped.size > 0;

  const ranked =
    Array.from(
      deduped.values(),
    )
      .map(
        (result) => ({
          ...result,

          searchScore:
            scoreSearchResult(
              result,
              school.name,
              city,
              state,
            ),
        }),
      )
      .sort(
        (a, b) =>
          b.searchScore -
          a.searchScore,
      )
      .slice(0, 12);

  const validCandidates:
    Candidate[] = [];

  const invalidCandidates:
    Candidate[] = [];

  const hostVisitCounts =
    new Map<string, number>();

  for (
    const result of ranked
  ) {
    const resultHost =
      hostnameWithoutWww(
        result.url,
      );

    const existingHostVisits =
      hostVisitCounts.get(
        resultHost,
      ) ?? 0;

    if (
      existingHostVisits >= 2
    ) {
      continue;
    }

    hostVisitCounts.set(
      resultHost,
      existingHostVisits + 1,
    );

    const fetched =
      await fetchHtmlDetailed(
        result.url,
      );

    if (!fetched) {
      continue;
    }

    if (
      isBlockedHost(
        fetched.finalUrl,
      ) ||
      isBlockedUrl(
        fetched.finalUrl,
      )
    ) {
      continue;
    }

    const identity =
      evaluateIdentity(
        fetched.html,
        fetched.finalUrl,
        school.name,
        city,
        state,
      );

    const totalScore =
      result.searchScore +
      identity.score;

    const candidate:
      Candidate = {
      seedUrl:
        chooseSeedWebsiteUrl(
          fetched.finalUrl,
        ),

      finalUrl:
        fetched.finalUrl,

      score:
        totalScore,

      provider:
        result.provider,

      sourceQuery:
        result.query,

      pageTitle:
        clean(
          cheerio
            .load(
              fetched.html,
            )("title")
            .first()
            .text(),
        ),

      identityValidated:
        identity.valid,

      validationReason: [
        `search=${result.searchScore}`,
        `identity=${identity.score}`,
        ...identity.reasons,
      ],

      isEduDomain:
        identity.isEduDomain,

      canonicalBaseballPath:
        identity.canonicalBaseballPath,
    };

    if (
      identity.valid
    ) {
      validCandidates.push(
        candidate,
      );
    } else {
      invalidCandidates.push(
        candidate,
      );
    }

    /**
     * Very strong validated result:
     * no need to keep hitting more sites.
     */
    if (
      identity.valid &&
      totalScore >= 350
    ) {
      break;
    }

    await sleep(
      randomDelay(
        200,
        450,
      ),
    );
  }

  const bestValid =
    validCandidates
      .sort(
        (a, b) =>
          b.score - a.score,
      )[0] ?? null;

  /**
   * We intentionally DO NOT return an invalid
   * candidate as the usable candidate.
   *
   * This prevents History.com / Expedia /
   * tourism pages from becoming seeds.
   */
  if (bestValid) {
    return {
      candidate:
        bestValid,

      directCandidateFound:
        direct.directCandidateFound,
      searchCandidateFound,
    };
  }

  /**
   * For verbose/manual QA, retain the best invalid
   * candidate as LOW/NONE context only.
   */
  const bestInvalid =
    invalidCandidates
      .sort(
        (a, b) =>
          b.score - a.score,
      )[0] ?? null;

  return {
    candidate:
      bestInvalid,

    directCandidateFound:
      direct.directCandidateFound,

    searchCandidateFound,
  };
}

function buildOutputRow(
  program: {
    college: {
      slug: string;
      name: string;
      city: string | null;
      state: string | null;
    };

    nickname:
      string | null;

    baseballWebsiteUrl:
      string | null;

    rosterUrl:
      string | null;

    scheduleUrl:
      string | null;

    campsUrl:
      string | null;

    questionnaireUrl:
      string | null;

    generalContactUrl:
      string | null;

    generalContactEmail:
      string | null;

    division:
      CollegeAthleticDivision |
      null;

    conference:
      string | null;

    logoUrl:
      string | null;

    programXUrl:
      string | null;

    programInstagramUrl:
      string | null;

    programYoutubeUrl:
      string | null;
  },

  discovery: {
    candidate: Candidate | null;
    directCandidateFound: boolean;
    searchCandidateFound: boolean;
  },
): OutputRow {
  const candidate =
    discovery.candidate;

  const confidence =
    candidateConfidence(
      candidate,
    );

  const usableSeed =
    candidate &&
    candidate.identityValidated &&
    (
      confidence === "HIGH" ||
      confidence === "MEDIUM"
    )
      ? candidate.seedUrl
      : "";

  return {
    slug:
      program.college.slug,

    name:
      program.college.name,

    websiteUrl:
      usableSeed,

    baseballNickname:
      program.nickname ?? "",

    baseballWebsiteUrl:
      program
        .baseballWebsiteUrl ??
      "",

    rosterUrl:
      program.rosterUrl ??
      "",

    scheduleUrl:
      program.scheduleUrl ??
      "",

    campsUrl:
      program.campsUrl ??
      "",

    questionnaireUrl:
      program
        .questionnaireUrl ??
      "",

    generalContactUrl:
      program
        .generalContactUrl ??
      "",

    generalContactEmail:
      program
        .generalContactEmail ??
      "",

    division:
      program.division ??
      "",

    conference:
      program.conference ??
      "",

    logoUrl:
      program.logoUrl ??
      "",

    programXUrl:
      program.programXUrl ??
      "",

    programInstagramUrl:
      program
        .programInstagramUrl ??
      "",

    programYoutubeUrl:
      program
        .programYoutubeUrl ??
      "",

    city:
      program.college.city ??
      "",

    state:
      program.college.state ??
      "",

    directCandidateFound:
      discovery
        .directCandidateFound
        ? "true"
        : "false",

    searchCandidateFound:
      discovery
        .searchCandidateFound
        ? "true"
        : "false",

    identityValidated:
      candidate
        ?.identityValidated
        ? "true"
        : "false",

    seedSource:
      candidate
        ? `${candidate.provider} | ${candidate.sourceQuery}`
        : "",

    seedConfidence:
      confidence,

    seedScore:
      candidate
        ? String(
            candidate.score,
          )
        : "",

    seedNotes:
      candidate
        ? [
            `Candidate: ${candidate.finalUrl}`,
            `Seed: ${candidate.seedUrl}`,

            candidate.pageTitle
              ? `Title: ${candidate.pageTitle}`
              : "",

            candidate.identityValidated
              ? "Identity: VALIDATED"
              : "Identity: REJECTED",

            candidate.validationReason.length
              ? `Signals: ${candidate.validationReason.join("; ")}`
              : "",
          ]
            .filter(Boolean)
            .join(" | ")
        : discovery.searchCandidateFound
          ? "Search results were found, but no candidate page could be validated."
          : discovery.directCandidateFound
            ? "Direct-domain candidates were reachable, but none passed identity validation."
            : "No direct or search candidate found.",
  };
}

function writeCsv(
  outputPath: string,
  rows: OutputRow[],
): void {
  fs.mkdirSync(
    path.dirname(
      outputPath,
    ),
    {
      recursive: true,
    },
  );

  const lines = [
    OUTPUT_HEADERS.join(","),

    ...rows.map(
      (row) =>
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
}

function validateDivision(
  value: string | null,
): SupportedDivision {
  const normalized =
    clean(value)
      .toUpperCase();

  const supported:
    SupportedDivision[] = [
      "NCAA_D1",
      "NCAA_D2",
      "NCAA_D3",
      "NAIA",
      "NJCAA_D1",
      "NJCAA_D2",
      "NJCAA_D3",
    ];

  if (
    !supported.includes(
      normalized as
        SupportedDivision,
    )
  ) {
    throw new Error(
      [
        `Unsupported or missing --division value: ${value ?? "(blank)"}`,
        "",
        `Supported values: ${supported.join(", ")}`,
      ].join("\n"),
    );
  }

  return normalized as
    SupportedDivision;
}

async function main(): Promise<void> {
  const division =
    validateDivision(
      getArgValue(
        "--division",
      ),
    );

  const limit =
    parsePositiveInt(
      getArgValue(
        "--limit",
      ),
    );

  const startAt =
    parsePositiveInt(
      getArgValue(
        "--start-at",
      ),
    ) ?? 1;

  const verbose =
    hasFlag(
      "--verbose",
    );

  const outputArg =
    getArgValue(
      "--output",
    );

  const outputPath =
    outputArg
      ? path.isAbsolute(
          outputArg,
        )
        ? outputArg
        : path.join(
            ROOT,
            outputArg,
          )
      : path.join(
          GENERATED_DIR,
          `college-web-presence-input.${division}.${timestamp}.csv`,
        );

  const programs =
    await prisma
      .collegeBaseballProgram
      .findMany({
        where: {
          division:
            division as
              CollegeAthleticDivision,

          baseballWebsiteUrl:
            null,
        },

        select: {
          nickname: true,

          baseballWebsiteUrl:
            true,

          rosterUrl: true,
          scheduleUrl: true,
          campsUrl: true,

          questionnaireUrl:
            true,

          generalContactUrl:
            true,

          generalContactEmail:
            true,

          division: true,
          conference: true,
          logoUrl: true,

          programXUrl: true,

          programInstagramUrl:
            true,

          programYoutubeUrl:
            true,

          college: {
            select: {
              slug: true,
              name: true,
              city: true,
              state: true,
            },
          },
        },

        orderBy: {
          college: {
            name: "asc",
          },
        },
      });

  const selected =
    programs.slice(
      startAt - 1,

      limit
        ? startAt -
          1 +
          limit
        : undefined,
    );

  console.log("");
  console.log(
    "=".repeat(100),
  );

  console.log(
    "SCOUTLINE COLLEGE WEBSITE SEED DISCOVERY V4",
  );

  console.log(
    "=".repeat(100),
  );

  console.log("");

  console.log(
    `Division:                  ${division}`,
  );

  console.log(
    `Missing baseball URLs:     ${programs.length}`,
  );

  console.log(
    `Start row:                 ${startAt}`,
  );

  console.log(
    `Rows selected:             ${selected.length}`,
  );

  console.log("");

  console.log(
    "Mode: discovery only; no ScoutLine database writes.",
  );

  console.log("");

  const outputRows:
    OutputRow[] = [];

  let directCandidateCount = 0;
  let searchCandidateCount = 0;
  let identityValidatedCount = 0;

  let high = 0;
  let medium = 0;
  let low = 0;
  let none = 0;

  for (
    let index = 0;
    index <
      selected.length;
    index++
  ) {
    const program =
      selected[index];

    const absoluteIndex =
      startAt + index;

    console.log(
      `[${absoluteIndex}/${programs.length}] ${program.college.name}`,
    );

    const discovery =
      await discoverSeedForSchool(
        {
          name:
            program.college.name,

          city:
            program.college.city,

          state:
            program.college.state,
        },

        verbose,
      );

    const row =
      buildOutputRow(
        program,
        discovery,
      );

    outputRows.push(row);

    if (
      row.directCandidateFound ===
      "true"
    ) {
      directCandidateCount++;
    }

    if (
      row.searchCandidateFound ===
      "true"
    ) {
      searchCandidateCount++;
    }

    if (
      row.identityValidated ===
      "true"
    ) {
      identityValidatedCount++;
    }

    if (
      row.seedConfidence ===
      "HIGH"
    ) {
      high++;
    } else if (
      row.seedConfidence ===
      "MEDIUM"
    ) {
      medium++;
    } else if (
      row.seedConfidence ===
      "LOW"
    ) {
      low++;
    } else {
      none++;
    }

    console.log(
      `  ${row.seedConfidence}: ${
        row.websiteUrl ||
        discovery.candidate
          ?.finalUrl ||
        "no candidate"
      }`,
    );

    console.log(
      `  Direct candidate: ${
        row.directCandidateFound
      } | Search candidate: ${
        row.searchCandidateFound
      } | Identity validated: ${
        row.identityValidated
      }`,
    );

    if (
      verbose &&
      row.seedNotes
    ) {
      console.log(
        `  ${row.seedNotes}`,
      );
    }

    await sleep(
      randomDelay(
        850,
        1400,
      ),
    );
  }

  writeCsv(
    outputPath,
    outputRows,
  );

  const usableSeeds =
    high + medium;

  console.log("");
  console.log(
    "=".repeat(100),
  );

  console.log(
    `${division} WEBSITE SEED DISCOVERY V4 SUMMARY`,
  );

  console.log(
    "=".repeat(100),
  );

  console.log(
    `Programs selected:         ${selected.length}`,
  );

  console.log(
    `Direct candidates found:   ${directCandidateCount}`,
  );

  console.log(
    `Search candidates found:   ${searchCandidateCount}`,
  );

  console.log(
    `Identity validated:        ${identityValidatedCount}`,
  );

  console.log(
    `Usable seeds:              ${usableSeeds}`,
  );

  console.log(
    `High confidence:           ${high}`,
  );

  console.log(
    `Medium confidence:         ${medium}`,
  );

  console.log(
    `Low confidence:            ${low}`,
  );

  console.log(
    `No usable candidate:       ${none}`,
  );

  console.log(
    `Validated coverage:        ${
      selected.length
        ? (
            (
              usableSeeds /
              selected.length
            ) *
            100
          ).toFixed(1)
        : "0.0"
    }%`,
  );

  console.log(
    "=".repeat(100),
  );

  console.log("");

  console.log(
    `✅ Wrote ${outputPath}`,
  );

  console.log("");

  console.log(
    "No database changes were made.",
  );

  console.log(
    "Only identity-validated HIGH and MEDIUM direct/search candidates are populated into websiteUrl.",
  );

  console.log(
    "Direct/search candidates that fail school identity validation are retained only in seedNotes for QA.",
  );
}

main()
  .catch(
    (
      error:
        unknown,
    ) => {
      console.error("");

      console.error(
        "College website seed discovery failed.",
      );

      if (
        error instanceof
        Error
      ) {
        console.error(
          error.message,
        );

        console.error(
          error.stack,
        );
      } else {
        console.error(
          error,
        );
      }

      process.exitCode =
        1;
    },
  )
  .finally(
    async () => {
      await prisma
        .$disconnect();
    },
  );