// scripts/enrich-college-web-presence.ts

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

const SCHEDULE_TERMS = [
  "schedule",
  "baseball schedule",
  "2026 baseball schedule",
  "2025 baseball schedule",
];

const CAMPS_TERMS = [
  "camp",
  "camps",
  "baseball camps",
  "prospect camp",
  "prospect camps",
  "clinics",
];

const QUESTIONNAIRE_TERMS = [
  "questionnaire",
  "recruit questionnaire",
  "recruiting questionnaire",
  "prospective student-athlete",
  "prospective student athlete",
  "recruits",
  "recruiting",
];

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
      result[header.trim()] =
        String(values[index] ?? "").trim();
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

    return url.toString();
  } catch {
    return null;
  }
}

function normalizeText(
  value: unknown,
): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
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

function extractEmail(
  html: string,
): string {
  const $ = cheerio.load(html);

  const mailto = $(
    'a[href^="mailto:"]',
  )
    .first()
    .attr("href");

  if (mailto) {
    return mailto
      .replace(/^mailto:/i, "")
      .split("?")[0]
      .trim();
  }

  const bodyText = $("body")
    .text()
    .replace(/\s+/g, " ");

  const match = bodyText.match(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  );

  return match?.[0] ?? "";
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

    return platformMatches && !blocked;
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

    campsUrl:
      String(
        input.campsUrl ?? "",
      ).trim(),

    questionnaireUrl:
      String(
        input.questionnaireUrl ?? "",
      ).trim(),

    generalContactUrl:
      String(
        input.generalContactUrl ?? "",
      ).trim(),

    generalContactEmail:
      String(
        input.generalContactEmail ?? "",
      ).trim(),

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
      String(
        input.programXUrl ?? "",
      ).trim(),

    programInstagramUrl:
      String(
        input.programInstagramUrl ?? "",
      ).trim(),

    programYoutubeUrl:
      String(
        input.programYoutubeUrl ?? "",
      ).trim(),

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

  if (officialBaseballOverride) {
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
    chooseBestLink(
      links,
      ROSTER_TERMS,
      preferredHost,
    );

  baseRow.scheduleUrl =
    baseRow.scheduleUrl ||
    chooseBestLink(
      links,
      SCHEDULE_TERMS,
      preferredHost,
    );

  baseRow.campsUrl =
    baseRow.campsUrl ||
    chooseBestLink(
      links,
      CAMPS_TERMS,
      preferredHost,
    );

  baseRow.questionnaireUrl =
    baseRow.questionnaireUrl ||
    chooseBestLink(
      links,
      QUESTIONNAIRE_TERMS,
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

function findNewestCoreEnrichmentCsv(): string {
  if (
    !fs.existsSync(GENERATED_DIR)
  ) {
    throw new Error(
      `Generated directory not found: ${GENERATED_DIR}`,
    );
  }

  const auditDirectories =
    fs.readdirSync(
      GENERATED_DIR,
      {
        withFileTypes: true,
      },
    )
      .filter(
        (entry) =>
          entry.isDirectory() &&
          entry.name.startsWith(
            "new-d1-core-enrichment-audit-",
          ),
      )
      .map((entry) => {
        const directoryPath =
          path.join(
            GENERATED_DIR,
            entry.name,
          );

        return {
          directoryPath,
          modifiedAt:
            fs.statSync(
              directoryPath,
            ).mtimeMs,
        };
      })
      .sort(
        (a, b) =>
          b.modifiedAt -
          a.modifiedAt,
      );

  for (const directory of auditDirectories) {
    const csvPath =
      path.join(
        directory.directoryPath,
        "new-d1-core-enrichment.csv",
      );

    if (
      fs.existsSync(csvPath)
    ) {
      return csvPath;
    }
  }

  throw new Error(
    "No generated new-d1-core-enrichment.csv file was found.",
  );
}

function resolveInputPath(): string {
  const fileArg =
    getArgValue("--file");

  if (!fileArg) {
    return findNewestCoreEnrichmentCsv();
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
      "college-program-socials.generated.csv",
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