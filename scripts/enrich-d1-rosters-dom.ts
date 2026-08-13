// scripts/enrich-d1-rosters-dom.ts

import fs from "node:fs";
import path from "node:path";

import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { PrismaClient } from "@prisma/client";
import * as cheerio from "cheerio";

const prisma =
  new PrismaClient();

const execFileAsync =
  promisify(
    execFile,
  );

const OUT_DIR =
  path.join(
    process.cwd(),
    "data",
    "enrichment",
    "generated",
  );

const MIN_POPULATED_ROSTER_SIZE =
  10;

const SUCCESS_COMPLETION_RATE =
  0.9;

type RosterPlayer = {
  season: string;
  name: string;

  positionRaw: string;
  primaryPosition: string;

  classYearRaw: string;
  classBucket: string;

  heightRaw: string;
  heightInches: number | null;

  weightRaw: string;
  weightLb: number | null;

  rosterProfileUrl: string;
};

type PlayerLink = {
  name: string;
  url: string;
};

type ProgramTarget = {
  programId: string;
  collegeName: string;
  collegeSlug: string;
  conference: string;

  rosterUrl: string;
  baseballWebsiteUrl: string;
  collegeProgramWebsiteUrl: string;
};

type DiscoveredRosterSeason = {
  season: string;
  url: string;
  playerLinkCount: number;

  sourceType:
    | "BASE"
    | "LINKED_SEASON"
    | "LINKED_YEAR"
    | "PROBED_SEASON"
    | "PROBED_YEAR";

  seasonConflict: string;
};

type RunStatus =
  | "SUCCESS"
  | "SEASON_AMBIGUOUS"
  | "PARTIAL"
  | "NO_ROSTER"
  | "ERROR";

type ProgramResult = {
  programId: string;
  collegeName: string;
  collegeSlug: string;
  conference: string;

  status: RunStatus;

  season: string;
  selectedRosterUrl: string;

  playersParsed: number;
  completePlayers: number;
  completionRate: number;

  freshmen: number;
  sophomores: number;
  juniors: number;
  seniors: number;
  graduates: number;
  unknownClasses: number;

  sourceType: string;
  seasonConflict: string;
  error: string;

  players: RosterPlayer[];
};

type RegressionCase = {
  name: string;
  slug: string;
  baseRosterUrl: string;

  expectedSeason: string;
  minimumPlayers: number;
};

const REGRESSION_CASES:
  RegressionCase[] = [
    {
      name:
        "Auburn University",
      slug:
        "auburn-university",
      baseRosterUrl:
        "https://auburntigers.com/sports/baseball/roster",
      expectedSeason:
        "2027",
      minimumPlayers:
        20,
    },

    {
      name:
        "Texas A&M University",
      slug:
        "texas-am-university",
      baseRosterUrl:
        "https://12thman.com/sports/baseball/roster",
      expectedSeason:
        "2026",
      minimumPlayers:
        35,
    },

    {
      name:
        "Clemson University",
      slug:
        "clemson-university",
      baseRosterUrl:
        "https://clemsontigers.com/sports/baseball/roster",
      expectedSeason:
        "2026",
      minimumPlayers:
        40,
    },

    {
      name:
        "Radford University",
      slug:
        "radford-university",
      baseRosterUrl:
        "https://radfordathletics.com/sports/baseball/roster",
      expectedSeason:
        "2026",
      minimumPlayers:
        33,
    },

    {
      name:
        "Jacksonville State University",
      slug:
        "jacksonville-state-university",
      baseRosterUrl:
        "https://jaxstatesports.com/sports/baseball/roster",
      expectedSeason:
        "2026",
      minimumPlayers:
        39,
    },

    {
  name:
    "Butler University",
  slug:
    "butler-university",
  baseRosterUrl:
    "https://butlersports.com/sports/baseball/roster",
  expectedSeason:
    "2026",
  minimumPlayers:
    38,
},

{
  name:
    "William & Mary",
  slug:
    "william-mary",
  baseRosterUrl:
    "https://tribeathletics.com/sports/baseball/roster",
  expectedSeason:
    "2027",
  minimumPlayers:
    21,
},

{
  name:
    "Dallas Baptist University",
  slug:
    "dallas-baptist-university",
  baseRosterUrl:
    "https://dbupatriots.com/sports/baseball/roster",
  expectedSeason:
    "2026",
  minimumPlayers:
    38,
},

{
  name:
    "Columbia University",
  slug:
    "columbia-university",
  baseRosterUrl:
    "https://gocolumbialions.com/sports/baseball/roster",
  expectedSeason:
    "2026",
  minimumPlayers:
    37,
},

{
  name:
    "Dartmouth College",
  slug:
    "dartmouth-college",
  baseRosterUrl:
    "https://dartmouthsports.com/sports/baseball/roster",
  expectedSeason:
    "2026",
  minimumPlayers:
    33,
},
  ];

const ARGS =
  process.argv.slice(
    2,
  );

const REGRESSION_MODE =
  ARGS.includes(
    "--regression",
  );

const VERBOSE =
  ARGS.includes(
    "--verbose",
  );

const SCHOOL_FILTER =
  getArgValue(
    "--school",
  );

const LIMIT =
  parseLimit(
    getArgValue(
      "--limit",
    ),
  );

if (
  ARGS.includes(
    "--apply",
  )
) {
  throw new Error(
    "This roster enrichment script is DRY RUN ONLY. --apply is not supported.",
  );
}

function getArgValue(
  flag: string,
) {
  const index =
    ARGS.indexOf(
      flag,
    );

  if (
    index < 0
  ) {
    return "";
  }

  return (
    ARGS[
      index + 1
    ] ?? ""
  );
}

function parseLimit(
  raw: string,
) {
  if (!raw) {
    return 0;
  }

  const value =
    Number(
      raw,
    );

  if (
    !Number.isInteger(
      value,
    ) ||
    value <= 0
  ) {
    throw new Error(
      `Invalid --limit value: ${raw}`,
    );
  }

  return value;
}

function cleanText(
  value:
    | string
    | null
    | undefined,
) {
  return String(
    value ?? "",
  )
    .replace(
      /\u00a0/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function escapeRegex(
  value: string,
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function absolutizeUrl(
  href: string,
  origin: string,
) {
  if (!href) {
    return "";
  }

  try {
    return new URL(
      href,
      origin,
    ).toString();
  } catch {
    return "";
  }
}

function normalizeUrl(
  value: string,
) {
  const raw =
    cleanText(
      value,
    );

  if (!raw) {
    return "";
  }

  try {
    const url =
      new URL(
        raw,
      );

    url.hash = "";

    return url.toString();
  } catch {
    return "";
  }
}

function stripQueryAndHash(
  value: string,
) {
  try {
    const url =
      new URL(
        value,
      );

    url.search = "";
    url.hash = "";

    return url.toString();
  } catch {
    return value;
  }
}

function normalizePrimaryPosition(
  value: string,
) {
  const raw =
    cleanText(
      value,
    )
      .toUpperCase();

  if (!raw) {
    return "";
  }

  const first =
    raw
      .split(
        /[/,|]/,
      )
      .map(
        (part) =>
          part.trim(),
      )
      .filter(
        Boolean,
      )[0] ?? "";

  const aliases:
    Record<
      string,
      string
    > = {
      P: "P",
      RHP: "RHP",
      LHP: "LHP",

      C: "C",

      IF: "INF",
      INF: "INF",
      MIF: "INF",

      OF: "OF",

      "1B": "1B",
      "2B": "2B",
      "3B": "3B",
      SS: "SS",

      UT: "UTIL",
      UTL: "UTIL",
      UTIL: "UTIL",
      UTILITY:
        "UTIL",
    };

  return (
    aliases[
      first
    ] ??
    first
  );
}

function normalizeClassBucket(
  value: string,
) {
  const v =
    cleanText(
      value,
    )
      .toLowerCase()
      .replace(
        /\./g,
        "",
      )
      .trim();

  if (!v) {
    return "";
  }

  if (
    v.includes(
      "graduate",
    ) ||
    v === "gr" ||
    v === "grad"
  ) {
    return "GRADUATE";
  }

  if (
    v.includes(
      "freshman",
    ) ||
    v === "fr" ||
    v === "fy" ||
    v === "first year" ||
    v === "first-year" ||
    v === "r-fr" ||
    v === "rs-fr" ||
    v === "rfr" ||
    v === "rsfr" ||
    v ===
      "redshirt freshman"
  ) {
    return "FRESHMAN";
  }

  if (
    v.includes(
      "sophomore",
    ) ||
    v === "so" ||
    v === "r-so" ||
    v === "rs-so" ||
    v === "rso" ||
    v === "rsso" ||
    v ===
      "redshirt sophomore"
  ) {
    return "SOPHOMORE";
  }

  if (
    v.includes(
      "junior",
    ) ||
    v === "jr" ||
    v === "r-jr" ||
    v === "rs-jr" ||
    v === "rjr" ||
    v === "rsjr" ||
    v ===
      "redshirt junior"
  ) {
    return "JUNIOR";
  }

  if (
    v.includes(
      "senior",
    ) ||
    v === "sr" ||
    v === "r-sr" ||
    v === "rs-sr" ||
    v === "rsr" ||
    v === "rssr" ||
    v ===
      "redshirt senior" ||
    v.includes(
      "fifth",
    ) ||
    v.includes(
      "5th",
    )
  ) {
    return "SENIOR";
  }

  return "UNKNOWN";
}

function parseHeightInches(
  value: string,
): number | null {
  const raw =
    cleanText(
      value,
    );

  if (!raw) {
    return null;
  }

  const match =
    raw.match(
      /(\d)\s*(?:-|['′])\s*(\d{1,2})/,
    );

  if (!match) {
    return null;
  }

  const feet =
    Number(
      match[1],
    );

  const inches =
    Number(
      match[2],
    );

  if (
    !Number.isFinite(
      feet,
    ) ||
    !Number.isFinite(
      inches,
    ) ||
    feet < 4 ||
    feet > 7 ||
    inches < 0 ||
    inches > 11
  ) {
    return null;
  }

  return (
    feet * 12 +
    inches
  );
}

function parseWeightLb(
  value: string,
): number | null {
  const raw =
    cleanText(
      value,
    );

  if (!raw) {
    return null;
  }

  const match =
    raw.match(
      /\b(\d{2,3})\b/,
    );

  if (!match) {
    return null;
  }

  const weight =
    Number(
      match[1],
    );

  if (
    !Number.isFinite(
      weight,
    ) ||
    weight < 100 ||
    weight > 400
  ) {
    return null;
  }

  return weight;
}

async function fetchHtml(
  url: string,
) {
  const MAX_ATTEMPTS =
    3;

  let lastError:
    unknown = null;

  for (
    let attempt = 1;
    attempt <=
    MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const response =
        await fetch(
          url,
          {
            headers: {
              "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
                "AppleWebKit/537.36 (KHTML, like Gecko) " +
                "Chrome/131.0.0.0 Safari/537.36",

              accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

              "accept-language":
                "en-US,en;q=0.9",

              "cache-control":
                "no-cache",

              pragma:
                "no-cache",
            },

            redirect:
              "follow",

            signal:
              AbortSignal.timeout(
                30000,
              ),
          },
        );

      /*
       * Retry only statuses that can reasonably be transient.
       *
       * 404s from season probing are expected and should
       * immediately flow back to roster discovery.
       */
      if (
        response.status ===
          408 ||
        response.status ===
          425 ||
        response.status ===
          429 ||
        response.status >=
          500
      ) {
        const error =
          new Error(
            `HTTP ${response.status} for ${url}`,
          );

        if (
          attempt <
          MAX_ATTEMPTS
        ) {
          lastError =
            error;

          const delayMs =
            750 *
            attempt;

          if (
            VERBOSE
          ) {
            console.log(
              `  ⚠️ Fetch attempt ${attempt}/${MAX_ATTEMPTS} failed for ${url}: ${error.message}`,
            );

            console.log(
              `     Retrying after ${delayMs}ms...`,
            );
          }

          await new Promise<
            void
          >(
            (resolve) =>
              setTimeout(
                resolve,
                delayMs,
              ),
          );

          continue;
        }

        throw error;
      }

      if (
        !response.ok
      ) {
        throw new Error(
          `HTTP ${response.status} for ${url}`,
        );
      }

      return {
        html:
          await response.text(),

        finalUrl:
          response.url ||
          url,
      };
    } catch (
      error
    ) {
      lastError =
        error;

      /*
       * Do not retry normal HTTP errors such as a 404.
       *
       * Season discovery intentionally probes routes that
       * often do not exist.
       */
      if (
        error instanceof
          Error &&
        /^HTTP \d+ for /.test(
          error.message,
        ) &&
        !/^HTTP (408|425|429|5\d\d) for /.test(
          error.message,
        )
      ) {
        throw error;
      }

      if (
        attempt >=
        MAX_ATTEMPTS
      ) {
        break;
      }

      const delayMs =
        750 *
        attempt;

      if (
        VERBOSE
      ) {
        const message =
          error instanceof Error
            ? error.message
            : String(
                error,
              );

        const cause =
          error instanceof Error &&
          "cause" in error &&
          error.cause
            ? ` | cause: ${String(
                error.cause,
              )}`
            : "";

        console.log(
          `  ⚠️ Fetch attempt ${attempt}/${MAX_ATTEMPTS} failed for ${url}: ${message}${cause}`,
        );

        console.log(
          `     Retrying after ${delayMs}ms...`,
        );
      }

      await new Promise<
        void
      >(
        (resolve) =>
          setTimeout(
            resolve,
            delayMs,
          ),
      );
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : String(
          lastError ??
            "unknown fetch error",
        );

  const cause =
    lastError instanceof Error &&
    "cause" in lastError &&
    lastError.cause
      ? ` | cause: ${String(
          lastError.cause,
        )}`
      : "";

const certificateFailure =
  /unable to verify the first certificate/i.test(
    `${message}${cause}`,
  );

if (
  certificateFailure
) {
  if (
    VERBOSE
  ) {
    console.log(
      `  ⚠️ Node TLS validation failed for ${url}. Trying curl.exe fallback...`,
    );
  }

  try {
    return await fetchHtmlWithCurl(
      url,
    );
  } catch (
    curlError
  ) {
    const curlMessage =
      curlError instanceof Error
        ? curlError.message
        : String(
            curlError,
          );

    throw new Error(
      `fetch failed after ${MAX_ATTEMPTS} Node attempts and curl.exe fallback for ${url}: ${message}${cause} | curl: ${curlMessage}`,
    );
  }
}

throw new Error(
  `fetch failed after ${MAX_ATTEMPTS} attempts for ${url}: ${message}${cause}`,
);
}

async function fetchHtmlWithCurl(
  url: string,
) {
  const {
    stdout,
  } =
    await execFileAsync(
      "curl.exe",
      [
        "--location",
        "--fail",
        "--silent",
        "--show-error",
        "--max-time",
        "30",
        "--user-agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/131.0.0.0 Safari/537.36",
        url,
      ],
      {
        maxBuffer:
          15 *
          1024 *
          1024,
      },
    );

  if (
    !stdout
  ) {
    throw new Error(
      `curl.exe returned empty HTML for ${url}`,
    );
  }

  return {
    html:
      stdout,

    finalUrl:
      url,
  };
}

function extractPublishedRosterSeasons(
  html: string,
  sourceUrl: string,
) {
  const $ =
    cheerio.load(
      html,
    );

  const origin =
    new URL(
      sourceUrl,
    ).origin;

  const candidates:
    Array<{
      season: string;
      url: string;
      sourceType:
        | "LINKED_SEASON"
        | "LINKED_YEAR";
    }> = [];

  const seen =
    new Set<string>();

  $("a[href]").each(
    (
      _,
      node,
    ) => {
      const href =
        cleanText(
          $(node).attr(
            "href",
          ),
        );

      if (!href) {
        return;
      }

      /*
       * WMT:
       *
       * /sports/baseball/roster/season/2027
       */
      const seasonMatch =
        href.match(
          /\/sports\/baseball\/roster\/season\/(\d{4})(?:[/?#]|$)/i,
        );

      if (
        seasonMatch?.[1]
      ) {
        const season =
          seasonMatch[1];

        const url =
          absolutizeUrl(
            `/sports/baseball/roster/season/${season}`,
            origin,
          );

        const key =
          `LINKED_SEASON:${url}`;

        if (
          url &&
          !seen.has(
            key,
          )
        ) {
          seen.add(
            key,
          );

          candidates.push({
            season,
            url,
            sourceType:
              "LINKED_SEASON",
          });
        }

        return;
      }

      /*
       * Standard Sidearm:
       *
       * /sports/baseball/roster/2026
       *
       * This intentionally requires the path segment after
       * /roster/ to be exactly four digits so player profile
       * URLs such as /roster/john-smith/12345 cannot match.
       */
      const yearMatch =
        href.match(
          /\/sports\/baseball\/roster\/(\d{4})(?:[/?#]|$)/i,
        );

      if (
        yearMatch?.[1]
      ) {
        const season =
          yearMatch[1];

        const url =
          absolutizeUrl(
            `/sports/baseball/roster/${season}`,
            origin,
          );

        const key =
          `LINKED_YEAR:${url}`;

        if (
          url &&
          !seen.has(
            key,
          )
        ) {
          seen.add(
            key,
          );

          candidates.push({
            season,
            url,
            sourceType:
              "LINKED_YEAR",
          });
        }
      }
    },
  );

  return candidates.sort(
    (
      a,
      b,
    ) =>
      Number(
        b.season,
      ) -
      Number(
        a.season,
      ),
  );
}

function isRosterPlayerHref(
  href: string,
) {
  const value =
    cleanText(
      href,
    );

  if (!value) {
    return false;
  }

  /*
   * WMT:
   *
   * /sports/baseball/roster/player/name
   */
  if (
    /\/sports\/baseball\/roster\/player\/[^/?#]+/i.test(
      value,
    )
  ) {
    return true;
  }

  /*
   * WMT season-specific:
   *
   * /sports/baseball/roster/season/2027/player/name
   */
  if (
    /\/sports\/baseball\/roster\/season\/\d{4}\/player\/[^/?#]+/i.test(
      value,
    )
  ) {
    return true;
  }

  /*
   * Standard Sidearm:
   *
   * /sports/baseball/roster/player-name/12345
   */
  if (
    /\/sports\/baseball\/roster\/[^/?#]+\/\d+(?:[/?#]|$)/i.test(
      value,
    )
  ) {
    return true;
  }

  return false;
}

function cleanRosterPlayerName(
  value: string,
) {
  let cleaned =
    cleanText(
      value,
    ).trim();

  /*
   * Sidearm accessibility text may wrap the actual player
   * name in utility labels such as:
   *
   * Visit Brady Powell
   * Brady Powell jersey number 1 full bio
   * Brady Powell Jersey Number 1 View Full Bio
   * Brady Powell - View Full Bio
   * Full Bio for Brady Powell
   *
   * Strip those wrappers iteratively until the text stops
   * changing.
   */
  let previous = "";

  while (
    cleaned &&
    cleaned !== previous
  ) {
    previous =
      cleaned;

    cleaned =
      cleaned
        .replace(
          /^visit\s+/i,
          "",
        )
        .replace(
          /^full bio for\s+/i,
          "",
        )
        .replace(
          /^view full bio for\s+/i,
          "",
        )
        .replace(
          /^view full bio\s+/i,
          "",
        )
        .replace(
          /^full bio\s+/i,
          "",
        )
        .replace(
          /\s*-\s*view full bio\s*$/i,
          "",
        )
        .replace(
          /\s*-\s*full bio\s*$/i,
          "",
        )
        .replace(
          /\s*view full bio\s*$/i,
          "",
        )
        .replace(
          /\s*full bio\s*$/i,
          "",
        )
        .replace(
          /\s*jersey number\s*#?\d+\s*$/i,
          "",
        )
        .trim();
  }

  if (!cleaned) {
    return "";
  }

  if (
    /^(?:roster|roster for baseball|baseball roster|view roster|team roster)$/i.test(
      cleaned,
    )
  ) {
    return "";
  }

  return cleaned;
}

function countPlayerProfileLinks(
  $: cheerio.CheerioAPI,
) {
  const hrefs =
    $("a[href]")
      .map(
        (
          _,
          node,
        ) =>
          cleanText(
            $(node).attr(
              "href",
            ),
          ),
      )
      .get()
      .filter(
        isRosterPlayerHref,
      );

  return new Set(
    hrefs,
  ).size;
}

type SeasonDetection = {
  season: string;

  titleSeason: string;
  bodySeason: string;

  ambiguous: boolean;
  conflict: string;
};

function detectSeasonFromPage(
  $: cheerio.CheerioAPI,
  schoolName: string,
): SeasonDetection {
  const pageTitle =
    cleanText(
      $("title").text(),
    );

  const clone =
    $.root().clone();

  clone
    .find(
      "script, style, noscript, template",
    )
    .remove();

  const bodyText =
    cleanText(
      clone
        .find(
          "body",
        )
        .text(),
    );

  let titleSeason = "";
  let bodySeason = "";

  /*
   * TITLE
   *
   * Baseball 2025-26 - Clemson University Athletics
   */
  const titleAcademic =
    pageTitle.match(
      /\bBaseball\s+(20\d{2})-(\d{2})\b/i,
    );

  if (
    titleAcademic?.[1] &&
    titleAcademic?.[2]
  ) {
    titleSeason =
      titleAcademic[1].slice(
        0,
        2,
      ) +
      titleAcademic[2];
  }

  /*
   * 2027 Baseball Roster
   * Baseball 2027 Roster
   */
  if (
    !titleSeason
  ) {
    const titleSingle =
      pageTitle.match(
        /\b(20\d{2})\s+Baseball\s+Roster\b/i,
      ) ??
      pageTitle.match(
        /\bBaseball\s+(20\d{2})\s+Roster\b/i,
      );

    if (
      titleSingle?.[1]
    ) {
      titleSeason =
        titleSingle[1];
    }
  }

  /*
   * BODY
   *
   * Baseball 2025-26 Roster
   */
  const bodyAcademic =
    bodyText.match(
      /\bBaseball\s+(20\d{2})-(\d{2})\s+Roster\b/i,
    );

  if (
    bodyAcademic?.[1] &&
    bodyAcademic?.[2]
  ) {
    bodySeason =
      bodyAcademic[1].slice(
        0,
        2,
      ) +
      bodyAcademic[2];
  }

/*
 * FALL ROSTER
 *
 * College baseball fall rosters belong to the following
 * spring season.
 *
 * Examples:
 *
 * 2026 Fall Baseball Roster -> 2027 baseball season
 * Fall Baseball 2026 Roster -> 2027 baseball season
 *
 * William & Mary is the regression example:
 *
 * Page title:
 * 2027 Baseball Roster
 *
 * Visible heading:
 * 2026 Fall Baseball Roster
 *
 * These are not contradictory. They identify the same
 * baseball cycle.
 */
if (
  !bodySeason
) {
  const fallLeadingYear =
    bodyText.match(
      /\b(20\d{2})\s+Fall\s+Baseball\s+Roster\b/i,
    );

  if (
    fallLeadingYear?.[1]
  ) {
    bodySeason =
      String(
        Number(
          fallLeadingYear[1],
        ) + 1,
      );
  }
}

if (
  !bodySeason
) {
  const fallTrailingYear =
    bodyText.match(
      /\bFall\s+Baseball\s+(20\d{2})\s+Roster\b/i,
    );

  if (
    fallTrailingYear?.[1]
  ) {
    bodySeason =
      String(
        Number(
          fallTrailingYear[1],
        ) + 1,
      );
  }
}

/*
 * STANDARD SEASON ROSTER
 *
 * 2026 Baseball Roster
 * Baseball 2026 Roster
 */
if (
  !bodySeason
) {
  const bodyLeadingYear =
    bodyText.match(
      /\b(20\d{2})\s+Baseball\s+Roster\b/i,
    );

  if (
    bodyLeadingYear?.[1]
  ) {
    bodySeason =
      bodyLeadingYear[1];
  }
}

if (
  !bodySeason
) {
  const bodyTrailingYear =
    bodyText.match(
      /\bBaseball\s+(20\d{2})\s+Roster\b/i,
    );

  if (
    bodyTrailingYear?.[1]
  ) {
    bodySeason =
      bodyTrailingYear[1];
  }
}

  /*
   * 2026 Clemson Roster
   */
  if (
    !bodySeason
  ) {
    const schoolTokens =
      schoolName
        .replace(
          /\bUniversity\b/gi,
          "",
        )
        .replace(
          /\bCollege\b/gi,
          "",
        )
        .trim();

    if (
      schoolTokens
    ) {
      const schoolPattern =
        new RegExp(
          `\\b(20\\d{2})\\s+${escapeRegex(
            schoolTokens,
          )}[^\\n]{0,40}\\s+Roster\\b`,
          "i",
        );

      const schoolMatch =
        bodyText.match(
          schoolPattern,
        );

      if (
        schoolMatch?.[1]
      ) {
        bodySeason =
          schoolMatch[1];
      }
    }
  }

  const ambiguous =
    Boolean(
      titleSeason &&
      bodySeason &&
      titleSeason !==
        bodySeason,
    );

  const conflict =
    ambiguous
      ? `Title identifies ${titleSeason}; visible roster identifies ${bodySeason}`
      : "";

  /*
   * Prefer title when both exist.
   *
   * We do NOT silently treat that as authoritative if they
   * disagree — ambiguous=true forces QA status later.
   */
  const season =
    titleSeason ||
    bodySeason ||
    "";

  return {
    season,
    titleSeason,
    bodySeason,
    ambiguous,
    conflict,
  };
}

async function inspectRosterPage(
  url: string,
  schoolName: string,
) {
  const fetched =
    await fetchHtml(
      url,
    );

  const $ =
    cheerio.load(
      fetched.html,
    );

  const seasonDetection =
    detectSeasonFromPage(
      $,
      schoolName,
    );

  return {
    html:
      fetched.html,

    finalUrl:
      fetched.finalUrl,

    season:
      seasonDetection.season,

    seasonConflict:
      seasonDetection.conflict,

    seasonAmbiguous:
      seasonDetection.ambiguous,

    playerLinkCount:
      countPlayerProfileLinks(
        $,
      ),
  };
}

async function discoverLatestRosterSeason(
  baseRosterUrl: string,
  schoolName: string,
): Promise<DiscoveredRosterSeason> {
  const base =
    await inspectRosterPage(
      baseRosterUrl,
      schoolName,
    );

  const viable:
    DiscoveredRosterSeason[] = [];

  if (
    base.playerLinkCount >=
      MIN_POPULATED_ROSTER_SIZE &&
    base.season
  ) {
    viable.push({
      season:
        base.season,

      url:
        base.finalUrl,

      playerLinkCount:
        base.playerLinkCount,

      sourceType:
        "BASE",

      seasonConflict:
        base.seasonConflict,
    });
  }

  const linked =
    extractPublishedRosterSeasons(
      base.html,
      base.finalUrl,
    );

  const currentYear =
    new Date().getFullYear();

  const yearsToProbe =
    [
      currentYear + 1,
      currentYear,
      currentYear - 1,
      currentYear - 2,
    ];

  const candidates:
    Array<{
      season: string;
      url: string;

      sourceType:
        | "LINKED_SEASON"
        | "LINKED_YEAR"
        | "PROBED_SEASON"
        | "PROBED_YEAR";
    }> = [];

  const seenUrls =
    new Set<string>();

  const addCandidate =
    (
      candidate: {
        season: string;
        url: string;

        sourceType:
          | "LINKED_SEASON"
          | "LINKED_YEAR"
          | "PROBED_SEASON"
          | "PROBED_YEAR";
      },
    ) => {
      const key =
        stripQueryAndHash(
          candidate.url,
        );

      if (
        seenUrls.has(
          key,
        )
      ) {
        return;
      }

      seenUrls.add(
        key,
      );

      candidates.push(
        candidate,
      );
    };

  for (
    const candidate
    of linked
  ) {
    addCandidate(
      candidate,
    );
  }

  const cleanBaseUrl =
    baseRosterUrl.replace(
      /\/$/,
      "",
    );

  for (
    const year
    of yearsToProbe
  ) {
    const season =
      String(
        year,
      );

    /*
     * WMT:
     *
     * /roster/season/2027
     */
    addCandidate({
      season,

      url:
        `${cleanBaseUrl}/season/${season}`,

      sourceType:
        "PROBED_SEASON",
    });

    /*
     * Standard Sidearm:
     *
     * /roster/2026
     */
    addCandidate({
      season,

      url:
        `${cleanBaseUrl}/${season}`,

      sourceType:
        "PROBED_YEAR",
    });
  }

  candidates.sort(
    (
      a,
      b,
    ) =>
      Number(
        b.season,
      ) -
      Number(
        a.season,
      ),
  );

  for (
    const candidate
    of candidates
  ) {
    try {
      const inspected =
        await inspectRosterPage(
          candidate.url,
          schoolName,
        );

      /*
       * A page merely existing is not enough.
       *
       * Texas A&M 2027 and Jacksonville State's current
       * base roster demonstrate why: a roster shell can
       * exist while containing only coaches.
       */
      if (
        inspected.playerLinkCount <
        MIN_POPULATED_ROSTER_SIZE
      ) {
        continue;
      }

      const season =
        inspected.season ||
        candidate.season;

      viable.push({
        season,

        url:
          inspected.finalUrl,

        playerLinkCount:
          inspected.playerLinkCount,

        sourceType:
          candidate.sourceType,

        seasonConflict:
          inspected.seasonConflict,
      });
    } catch {
      /*
       * Missing season routes are expected.
       */
    }
  }

  if (
    viable.length === 0
  ) {
    throw new Error(
      "No populated roster season found.",
    );
  }

  viable.sort(
    (
      a,
      b,
    ) => {
      const seasonDiff =
        Number(
          b.season,
        ) -
        Number(
          a.season,
        );

      if (
        seasonDiff !== 0
      ) {
        return seasonDiff;
      }

      /*
       * For the same season, prefer the populated base page.
       */
      if (
        a.sourceType ===
          "BASE" &&
        b.sourceType !==
          "BASE"
      ) {
        return -1;
      }

      if (
        b.sourceType ===
          "BASE" &&
        a.sourceType !==
          "BASE"
      ) {
        return 1;
      }

      return (
        b.playerLinkCount -
        a.playerLinkCount
      );
    },
  );

  return viable[0];
}

function buildRosterBaseCandidates(
  target: ProgramTarget,
) {
  const candidates:
    string[] = [];

  const add =
    (
      value:
        | string
        | null
        | undefined,
    ) => {
      const normalized =
        normalizeUrl(
          cleanText(
            value,
          ),
        );

      if (!normalized) {
        return;
      }

      const cleaned =
        stripQueryAndHash(
          normalized,
        );

      if (
        !candidates.includes(
          cleaned,
        )
      ) {
        candidates.push(
          cleaned,
        );
      }
    };

  /*
   * Highest-confidence DB field first.
   */
  add(
    target.rosterUrl,
  );

  const websiteSeeds =
    [
      target.baseballWebsiteUrl,
      target.collegeProgramWebsiteUrl,
    ]
      .map(
        cleanText,
      )
      .filter(
        Boolean,
      );

  for (
    const seed
    of websiteSeeds
  ) {
    try {
      const parsed =
        new URL(
          seed,
        );

      const pathname =
        parsed.pathname.replace(
          /\/$/,
          "",
        );

      /*
       * If the DB already contains a roster URL,
       * keep it.
       */
      if (
        /\/sports\/baseball\/roster(?:\/|$)/i.test(
          pathname,
        )
      ) {
        add(
          `${parsed.origin}${pathname}`,
        );
      }

      /*
       * Common WMT / Sidearm route.
       */
      if (
        /\/sports\/baseball(?:\/|$)/i.test(
          pathname,
        )
      ) {
        add(
          `${parsed.origin}/sports/baseball/roster`,
        );
      }

      /*
       * Generic athletics-domain fallback.
       */
      add(
        `${parsed.origin}/sports/baseball/roster`,
      );
    } catch {
      // Ignore malformed seed URLs.
    }
  }

  return candidates;
}

function isPlausibleRosterPlayerName(
  value: string,
) {
  const name =
    cleanRosterPlayerName(
      value,
    );

  if (!name) {
    return "";
  }

  /*
   * Reject obvious utility / navigation labels.
   */
  if (
    /^(?:Roster|Roster for Baseball|Baseball|Baseball Roster|Bio|Full Bio|View Full Bio|Stats|Statistics|Shop|Player|Players)$/i.test(
      name,
    )
  ) {
    return "";
  }

  /*
   * Normal player names should contain at least two
   * name-like components.
   *
   * Examples supported:
   *
   * AJ Aschettino
   * Jason Fultz Jr.
   * Terrence Kiel II
   * D'Marion Terrell
   * LJ Cormier
   */
  if (
    !/^[A-Za-zÀ-ÖØ-öø-ÿ.'’\-]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ.'’\-]+){1,5}$/.test(
      name,
    )
  ) {
    return "";
  }

  return name;
}

function extractVisibleRosterPlayerEvidence(
  $: cheerio.CheerioAPI,
  playerName: string,
) {
  if (!playerName) {
    return "";
  }

  /*
   * Secondary validation path for roster systems where the
   * player-profile anchor is not nested closely enough to the
   * player's physical-data DOM card.
   *
   * Texas A&M / WMT is the important example:
   *
   * Sawyer Farr
   * Sophomore6′4″190 lbsINF
   *
   * We inspect a SMALL visible-text window immediately after
   * each occurrence of the player's name.
   *
   * This does NOT replace DOM-card validation. It is only a
   * fallback when extractPlayerDomText() cannot find a compact
   * individual card.
   */
  const clone =
    $.root().clone();

  clone
    .find(
      "script, style, noscript, template",
    )
    .remove();

  const bodyText =
    cleanText(
      clone
        .find(
          "body",
        )
        .text(),
    );

  let searchFrom = 0;

  while (
    searchFrom <
    bodyText.length
  ) {
    const nameIndex =
      bodyText.indexOf(
        playerName,
        searchFrom,
      );

    if (
      nameIndex < 0
    ) {
      break;
    }

    /*
     * Keep the window deliberately tight.
     *
     * We only want evidence belonging to THIS player, not
     * measurements from another roster card farther down
     * the page.
     */
    const evidenceText =
      cleanText(
        bodyText.slice(
          nameIndex,
          nameIndex + 260,
        ),
      );

    const heightRaw =
      extractHeight(
        evidenceText,
      );

    const weightRaw =
      extractWeight(
        evidenceText,
      );

    const positionRaw =
      extractPosition(
        evidenceText,
      );

    const classYearRaw =
      extractClassYear(
        evidenceText,
        playerName,
      );

    /*
     * Require the complete core roster signature.
     *
     * A random related-player/profile link should not have
     * class + position + height + weight immediately beside
     * the player's name.
     */
    if (
      heightRaw &&
      weightRaw &&
      positionRaw &&
      classYearRaw
    ) {
      return evidenceText;
    }

    searchFrom =
      nameIndex +
      playerName.length;
  }

  return "";
}

function extractTraditionalSidearmPlayerEvidence(
  $: cheerio.CheerioAPI,
  playerName: string,
) {
  if (!playerName) {
    return "";
  }

  /*
   * Traditional Sidearm roster cards can place the player
   * profile link well before the physical-data portion of
   * the same visible roster card.
   *
   * Butler example:
   *
   * Logan Crock So. Noblesville, Ind. Lawrence North
   * Full Bio Sophomore ...
   * Hide/Show Additional Information For Logan Crock
   * UTL UTL 6'4" 195 lbs L/R
   *
   * We do NOT weaken the strict DOM validator.
   *
   * Instead, this is a separate Sidearm-specific fallback
   * requiring:
   *
   * 1. this exact player's name
   * 2. Sidearm's "Additional Information For <player>" marker
   * 3. position
   * 4. class
   * 5. height
   * 6. weight
   *
   * That keeps secondary / related player-profile links from
   * being accepted merely because they exist on the page.
   */

  const clone =
    $.root().clone();

  clone
    .find(
      "script, style, noscript, template",
    )
    .remove();

  const bodyText =
    cleanText(
      clone
        .find(
          "body",
        )
        .text(),
    );

  const additionalInfoPattern =
    new RegExp(
      `(?:Hide\\/Show\\s+)?Additional Information For\\s+${escapeRegex(
        playerName,
      )}`,
      "i",
    );

  let searchFrom = 0;

  while (
    searchFrom <
    bodyText.length
  ) {
    const nameIndex =
      bodyText.indexOf(
        playerName,
        searchFrom,
      );

    if (
      nameIndex < 0
    ) {
      break;
    }

    /*
     * Traditional Sidearm cards can be considerably longer
     * than WMT cards because hometown, high school and
     * previous-school data often come before measurements.
     *
     * 1200 chars remains small enough to stay within an
     * individual roster-card-sized window.
     */
    const evidenceText =
      cleanText(
        bodyText.slice(
          nameIndex,
          nameIndex + 1200,
        ),
      );

    /*
     * Require Sidearm's player-specific roster-card marker.
     */
    if (
      !additionalInfoPattern.test(
        evidenceText,
      )
    ) {
      searchFrom =
        nameIndex +
        playerName.length;

      continue;
    }

    const heightRaw =
      extractHeight(
        evidenceText,
      );

    const weightRaw =
      extractWeight(
        evidenceText,
      );

    const positionRaw =
      extractPosition(
        evidenceText,
      );

    const classYearRaw =
      extractClassYear(
        evidenceText,
        playerName,
      );

    if (
      heightRaw &&
      weightRaw &&
      positionRaw &&
      classYearRaw
    ) {
      return evidenceText;
    }

    searchFrom =
      nameIndex +
      playerName.length;
  }

  return "";
}

function extractPlayerLinks(
  $: cheerio.CheerioAPI,
  sourceUrl: string,
) {
  const origin =
    new URL(
      sourceUrl,
    ).origin;

  /*
   * First collect EVERY href that matches one of our known
   * roster-player URL shapes.
   *
   * Do not require the specific anchor itself to contain
   * roster measurements. WMT and Sidearm frequently place
   * accessibility/profile anchors in a different child
   * element from the player measurements.
   */
  const candidates =
    new Map<
      string,
      {
        url: string;
        names: string[];
      }
    >();

  $("a[href]").each(
    (
      _,
      node,
    ) => {
      const anchor =
        $(node);

      const href =
        cleanText(
          anchor.attr(
            "href",
          ),
        );

      if (
        !href ||
        !isRosterPlayerHref(
          href,
        )
      ) {
        return;
      }

      const absoluteUrl =
        absolutizeUrl(
          href,
          origin,
        );

      if (!absoluteUrl) {
        return;
      }

      const url =
        stripQueryAndHash(
          absoluteUrl,
        );

      const nameCandidates =
        [
          anchor.text(),

          anchor.attr(
            "aria-label",
          ),

          anchor.attr(
            "title",
          ),
        ]
          .map(
            (value) =>
              isPlausibleRosterPlayerName(
                cleanText(
                  value,
                ),
              ),
          )
          .filter(
            Boolean,
          );

      let candidate =
        candidates.get(
          url,
        );

      if (!candidate) {
        candidate = {
          url,
          names: [],
        };

        candidates.set(
          url,
          candidate,
        );
      }

      for (
        const name
        of nameCandidates
      ) {
        if (
          !candidate.names.includes(
            name,
          )
        ) {
          candidate.names.push(
            name,
          );
        }
      }
    },
  );

  const links:
    PlayerLink[] = [];

  for (
    const candidate
    of candidates.values()
  ) {
    if (
      candidate.names.length ===
      0
    ) {
      continue;
    }

    /*
     * Prefer the shortest clean representation.
     *
     * One player URL may have:
     *
     * Brady Powell
     * Visit Brady Powell
     * Brady Powell Jersey Number 1 Full Bio
     *
     * cleanRosterPlayerName() strips most wrappers already,
     * and shortest-first gives us the safest final choice.
     */
    const names =
      [...candidate.names]
        .sort(
          (
            a,
            b,
          ) =>
            a.length -
            b.length,
        );

    const name =
      names[0];

    /*
     * Critical validation step.
     *
     * A valid-looking /roster/...player... URL is NOT enough.
     * Some pages expose:
     *
     * - featured-player links
     * - historical-player links
     * - navigation links
     * - related content
     *
     * Require this URL to have a nearby DOM container with
     * actual player physical measurements.
     *
     * We deliberately use extractPlayerDomText() here instead
     * of checking the individual anchor's parent because the
     * profile link and roster measurements are frequently
     * separate descendants inside the same roster card.
     */
const domText =
  extractPlayerDomText(
    $,
    candidate.url,
    sourceUrl,
    name,
  );

/*
 * Some WMT implementations — Texas A&M in particular —
 * place the player-profile anchor too far away from the
 * physical-data card for our deliberately strict DOM
 * ancestor validation.
 *
 * In that case, use a second independent test against the
 * flattened visible roster text.
 *
 * IMPORTANT:
 * We do NOT weaken extractPlayerDomText(). That strict path
 * is what prevents Clemson/Auburn/Texas A&M secondary
 * profile links from being mistaken for roster players.
 */
const visibleRosterEvidence =
  domText
    ? ""
    : extractVisibleRosterPlayerEvidence(
        $,
        name,
      );

/*
 * Traditional Sidearm fallback.
 *
 * Only run this if neither the strict DOM-card validator nor
 * the compact WMT visible-text validator succeeded.
 *
 * This preserves Auburn, Texas A&M, Clemson, Radford and
 * Jacksonville State behavior exactly as currently tested.
 */
/*
 * Traditional Sidearm DOM fallback.
 *
 * Do not alter either of the two successful validation paths
 * above. Only reach this parser when BOTH failed.
 *
 * Unlike the generic DOM validator, this path can climb
 * farther through the Sidearm card because it requires the
 * player-specific:
 *
 * "Additional Information For <player>"
 *
 * marker before accepting anything.
 */
const traditionalSidearmDomText =
  domText ||
  visibleRosterEvidence
    ? ""
    : extractTraditionalSidearmPlayerDomText(
        $,
        candidate.url,
        sourceUrl,
        name,
      );

/*
 * Flattened-text Sidearm evidence remains the final fallback.
 *
 * Keeping both gives us coverage for Sidearm variations where
 * the accessible player link and roster card are arranged
 * differently in the DOM.
 */
const traditionalSidearmEvidence =
  domText ||
  visibleRosterEvidence ||
  traditionalSidearmDomText
    ? ""
    : extractTraditionalSidearmPlayerEvidence(
        $,
        name,
      );

const evidenceText =
  domText ||
  visibleRosterEvidence ||
  traditionalSidearmDomText ||
  traditionalSidearmEvidence;

if (!evidenceText) {
  continue;
}

/*
 * Do not require every parsed player field at the
 * LINK-DISCOVERY stage.
 *
 * The validation paths above already establish that this
 * candidate belongs to an actual roster card:
 *
 * - extractPlayerDomText()
 * - extractVisibleRosterPlayerEvidence()
 * - extractTraditionalSidearmPlayerDomText()
 * - extractTraditionalSidearmPlayerEvidence()
 *
 * Traditional Sidearm pages such as Butler can distribute
 * class / position / measurements across different pieces
 * of the same card. Requiring all four fields here causes
 * valid Butler player URLs to be discarded before
 * extractRosterPlayers() gets a chance to parse them.
 *
 * Full completeness validation remains downstream in
 * isCompletePlayer(), so this does NOT cause incomplete
 * records to be considered successful.
 */

links.push({
  name,
  url:
    candidate.url,
});
  }

  return links;
}

function extractRosterVisibleText(
  $: cheerio.CheerioAPI,
  firstPlayerName: string,
) {
  const clone =
    $.root().clone();

  clone
    .find(
      "script, style, noscript, template",
    )
    .remove();

  const bodyText =
    cleanText(
      clone
        .find(
          "body",
        )
        .text(),
    );

  const firstPlayerIndex =
    bodyText.indexOf(
      firstPlayerName,
    );

  if (
    firstPlayerIndex < 0
  ) {
    throw new Error(
      `Could not find first roster player in visible text: ${firstPlayerName}`,
    );
  }

  const boundaries =
    [
      "Baseball Coaching Staff",
      "Baseball Coaches",
      "Coaching Staff",
      "Staff Roster",
    ];

  let end =
    bodyText.length;

  for (
    const boundary
    of boundaries
  ) {
    const index =
      bodyText.indexOf(
        boundary,
        firstPlayerIndex,
      );

    if (
      index >= 0 &&
      index < end
    ) {
      end =
        index;
    }
  }

  return cleanText(
    bodyText.slice(
      firstPlayerIndex,
      end,
    ),
  );
}

function extractPosition(
  text: string,
) {
  const normalized =
    cleanText(
      text,
    );

  /*
   * Modern labeled Sidearm layout.
   *
   * Radford can collapse the player name directly into
   * the Position label:
   *
   * Brady PowellPosition MIF Academic Year R-Jr.
   * Mason HatcherPosition RHP Academic Year R-Fr.
   *
   * IMPORTANT:
   * Do NOT require a word boundary before "Position".
   */
  const labeled =
    normalized.match(
      /Position\s+(.+?)\s+Academic Year\b/i,
    );

  if (
    labeled?.[1]
  ) {
    const position =
      cleanText(
        labeled[1],
      )
        .toUpperCase()
        .replace(
          /\s+/g,
          "",
        );

    /*
     * Only accept recognized baseball position values.
     */
    if (
      /^(?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL)(?:\/(?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL))*$/i.test(
        position,
      )
    ) {
      return position;
    }
  }

  /*
   * Traditional Sidearm single-position layout.
   *
   * Northeastern examples:
   *
   * ...Additional Information For AJ Aschettino OF 6'1"...
   * ...Additional Information For Ryan Gerety RHP 6'0"...
   * ...Additional Information For Robbie O'Connor C/1B 6'1"...
   *
   * Unlike Butler, these cards expose the position only once.
   *
   * Anchor this specifically to Sidearm's
   * "Additional Information For" marker rather than globally
   * accepting any position followed by a height. This keeps
   * the existing WMT / Radford / Butler parsers isolated.
   */
  const sidearmSingleBeforeHeight =
    normalized.match(
      /Additional Information For\s+.+?\s+((?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL)(?:\/(?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL))*)\s+(?=\d\s*(?:-|['′]))/i,
    );

  if (
    sidearmSingleBeforeHeight?.[1]
  ) {
    return cleanText(
      sidearmSingleBeforeHeight[1],
    );
  }

  /*
   * Traditional Sidearm duplicated-position layout.
   *
   * Butler examples:
   *
   * ...Additional Information For Logan Crock UTL UTL 6'4"...
   * ...Additional Information For David Ayers OF OF 5'11"...
   * ...Additional Information For Matthew Rhoades SS/2B SS/2B 5'9"...
   *
   * Keep this AFTER the labeled Radford parser so text such as
   * "Position RHP Academic Year R-Fr." is still handled by the
   * higher-confidence labeled path.
   */
  const duplicatedBeforeHeight =
    normalized.match(
      /\b((?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL)(?:\/(?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL))*)\s+\1\s+(?=\d\s*(?:-|['′]))/i,
    );

  if (
    duplicatedBeforeHeight?.[1]
  ) {
    return cleanText(
      duplicatedBeforeHeight[1],
    );
  }

  /*
   * Compact WMT / Clemson / Auburn layout:
   *
   * IF5′11″
   * RHP6′3″
   * INF/C6′1″
   */
  const beforeHeight =
    normalized.match(
      /(?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL)(?:\/(?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL))*(?=\d\s*(?:-|['′]))/i,
    );

  if (
    beforeHeight?.[0]
  ) {
    return cleanText(
      beforeHeight[0],
    );
  }

  /*
   * Compact Sidearm / WMT alternate layout:
   *
   * 190 lbsINF
   * 200 lbsOF/RHP
   */
  const afterWeight =
    normalized.match(
      /\d{2,3}\s*lbs?\.?\s*((?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL)(?:\/(?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL))*)/i,
    );

  if (
    afterWeight?.[1]
  ) {
    return cleanText(
      afterWeight[1],
    );
  }

  return "";
}

function extractHeight(
  text: string,
) {
  const normalized =
    cleanText(
      text,
    );

  /*
   * Modern Sidearm:
   *
   * Height 6' 2''
   */
  const labeled =
    normalized.match(
      /\bHeight\s+(\d)\s*(?:-|['′])\s*(\d{1,2})\s*(?:'{1,2}|["″])?/i,
    );

  if (
    labeled?.[1] &&
    labeled?.[2]
  ) {
    return `${labeled[1]}'${labeled[2]}"`;
  }

  const match =
    normalized.match(
      /(\d)\s*(?:-|['′])\s*(\d{1,2})\s*(?:["″])?/,
    );

  return cleanText(
    match?.[0],
  );
}

function extractWeight(
  text: string,
) {
  const normalized =
    cleanText(
      text,
    );

  const labeled =
    normalized.match(
      /\bWeight\s+(\d{2,3})\s*lbs?\.?/i,
    );

  if (
    labeled?.[1]
  ) {
    return `${labeled[1]} lbs`;
  }

  const match =
    normalized.match(
      /\b(\d{2,3})\s*lbs?\.?/i,
    );

  return cleanText(
    match?.[0],
  );
}

function extractClassYear(
  text: string,
  playerName: string,
) {
  const normalized =
    cleanText(
      text,
    );

  /*
   * Modern labeled Sidearm:
   *
   * Academic Year Sr.
   * Class Junior
   */
const labeledClass =
  normalized.match(
    /\b(?:Academic Year|Class)\s+(Graduate Student|Graduate|Redshirt Freshman|Redshirt Sophomore|Redshirt Junior|Redshirt Senior|Fifth Year|5th Year|First Year|First-Year|Freshman|Sophomore|Junior|Senior|FY\.?|RS-?Fr\.?|R-?Fr\.?|Fr\.?|RS-?So\.?|R-?So\.?|So\.?|RS-?Jr\.?|R-?Jr\.?|Jr\.?|RS-?Sr\.?|R-?Sr\.?|Sr\.?|Gr\.?|Grad)(?=\s|Height\b|$)/i,
  );

  if (
    labeledClass?.[1]
  ) {
    return cleanText(
      labeledClass[1],
    );
  }

  /*
   * Traditional Sidearm class immediately after player name.
   *
   * Butler examples:
   *
   * Logan Crock So. Noblesville, Ind. ...
   * Andrew Hendrickx R-Jr. Hudson, Ohio ...
   * Brian Yadlon Gr. Tinton Falls, N.J. ...
   *
   * Anchor the match to THIS player's name so city/state text
   * elsewhere in the block cannot be mistaken for a class.
   *
   * This is intentionally checked after the labeled
   * "Academic Year" / "Class" parser used by Radford.
   */
  if (
    playerName
  ) {
    const leadingClassPattern =
      new RegExp(
        `^${escapeRegex(
          playerName,
        )}\\s+(Graduate Student|Graduate|Redshirt Freshman|Redshirt Sophomore|Redshirt Junior|Redshirt Senior|Fifth Year|5th Year|Freshman|Sophomore|Junior|Senior|RS-?Fr\\.?|R-?Fr\\.?|Fr\\.?|RS-?So\\.?|R-?So\\.?|So\\.?|RS-?Jr\\.?|R-?Jr\\.?|Jr\\.?|RS-?Sr\\.?|R-?Sr\\.?|Sr\\.?|Gr\\.?|Grad)(?=\\s|$)`,
        "i",
      );

    const leadingClass =
      normalized.match(
        leadingClassPattern,
      );

    if (
      leadingClass?.[1]
    ) {
      return cleanText(
        leadingClass[1],
      );
    }
  }

  /*
   * Trailing-class layout:
   *
   * ...GeorgiaSo.Bryce Clavon Instagram...
   */
  if (
    playerName
  ) {
    const firstNameIndex =
      normalized.indexOf(
        playerName,
      );

    const repeatedNameIndex =
      normalized.indexOf(
        playerName,
        firstNameIndex +
          playerName.length,
      );

    if (
      repeatedNameIndex > 0
    ) {
      const beforeRepeatedName =
        normalized.slice(
          0,
          repeatedNameIndex,
        );

      const graduateMatch =
        beforeRepeatedName.match(
          /\*?(?:RS-?|R-?)?(?:Fr|So|Jr|Sr)\.?\s*\(Graduate\)\s*$/i,
        );

      if (
        graduateMatch
      ) {
        return "Graduate";
      }

      const trailingClassMatch =
        beforeRepeatedName.match(
          /\*?(Redshirt Freshman|Redshirt Sophomore|Redshirt Junior|Redshirt Senior|Graduate Student|Graduate|Fifth Year|5th Year|RS-?Fr\.?|R-?Fr\.?|Fr\.?|RS-?So\.?|R-?So\.?|So\.?|RS-?Jr\.?|R-?Jr\.?|Jr\.?|RS-?Sr\.?|R-?Sr\.?|Sr\.?|Gr\.?|Grad)\s*$/i,
        );

      if (
        trailingClassMatch?.[1]
      ) {
        return cleanText(
          trailingClassMatch[1],
        );
      }
    }
  }

  /*
   * Texas A&M:
   * Sophomore6′4″190 lbsINF
   */
  const beforeHeight =
    normalized.match(
      /(Graduate Student|Graduate|Redshirt Freshman|Redshirt Sophomore|Redshirt Junior|Redshirt Senior|Fifth Year|5th Year|Freshman|Sophomore|Junior|Senior|RS-?Fr\.?|R-?Fr\.?|Fr\.?|RS-?So\.?|R-?So\.?|So\.?|RS-?Jr\.?|R-?Jr\.?|Jr\.?|RS-?Sr\.?|R-?Sr\.?|Sr\.?|Gr\.?|Grad)(?=\d\s*(?:-|['′]))/i,
    );

  if (
    beforeHeight?.[1]
  ) {
    return cleanText(
      beforeHeight[1],
    );
  }

  /*
   * Auburn:
   * IF5′11″185 lbsSenior
   */
  const afterWeight =
    normalized.match(
      /\d{2,3}\s*lbs?\.?\s*(Graduate Student|Graduate|Redshirt Freshman|Redshirt Sophomore|Redshirt Junior|Redshirt Senior|Fifth Year|5th Year|Freshman|Sophomore|Junior|Senior|RS-?Fr\.?|R-?Fr\.?|Fr\.?|RS-?So\.?|R-?So\.?|So\.?|RS-?Jr\.?|R-?Jr\.?|Jr\.?|RS-?Sr\.?|R-?Sr\.?|Sr\.?|Gr\.?|Grad)/i,
    );

  if (
    afterWeight?.[1]
  ) {
    return cleanText(
      afterWeight[1],
    );
  }

  return "";
}

function extractPlayerBlocks(
  rosterText: string,
  links: PlayerLink[],
) {
  const blocks =
    new Map<
      string,
      string
    >();

  for (
    let index = 0;
    index <
    links.length;
    index += 1
  ) {
    const current =
      links[index];

    const next =
      links[
        index + 1
      ];

    const start =
      rosterText.indexOf(
        current.name,
      );

    if (
      start < 0
    ) {
      continue;
    }

    let end =
      rosterText.length;

    if (next) {
      const nextIndex =
        rosterText.indexOf(
          next.name,
          start +
            current.name.length,
        );

      if (
        nextIndex >= 0
      ) {
        end =
          nextIndex;
      }
    }

    blocks.set(
      current.url,
      cleanText(
        rosterText.slice(
          start,
          end,
        ),
      ),
    );
  }

  return blocks;
}

function extractPlayerDomText(
  $: cheerio.CheerioAPI,
  playerUrl: string,
  sourceUrl: string,
  playerName = "",
) {
  const sourceOrigin =
    new URL(
      sourceUrl,
    ).origin;

  /*
   * The individual roster card should be compact.
   *
   * If we have to climb into a very large container to find
   * height/weight, the anchor is probably a secondary player
   * link elsewhere on the page rather than the roster card
   * itself.
   */
  const MAX_ROSTER_CARD_TEXT_LENGTH =
    1500;

  let matchedText = "";

  $("a[href]").each(
    (
      _,
      node,
    ) => {
      if (
        matchedText
      ) {
        return;
      }

      const anchor =
        $(node);

      const href =
        cleanText(
          anchor.attr(
            "href",
          ),
        );

      if (!href) {
        return;
      }

      const absoluteHref =
        absolutizeUrl(
          href,
          sourceOrigin,
        );

      if (!absoluteHref) {
        return;
      }

      /*
       * Player URLs elsewhere in the script are canonicalized
       * without query strings or fragments. Do the same here
       * before comparing.
       */
      const canonicalHref =
        stripQueryAndHash(
          absoluteHref,
        );

      if (
        canonicalHref !==
        playerUrl
      ) {
        return;
      }

      /*
       * Start immediately around this particular player link
       * and climb toward the roster card.
       *
       * Parent containers only get larger as we climb, so the
       * FIRST compact container containing real roster fields
       * is the highest-confidence match.
       */
      let container =
        anchor.parent();

      for (
        let depth = 0;
        depth < 10;
        depth += 1
      ) {
        if (
          !container.length
        ) {
          break;
        }

const text =
  cleanText(
    container.text(),
  );

if (!text) {
  container =
    container.parent();

  continue;
}

/*
 * If we know the player name, scope all roster-field
 * validation to text beginning with THIS player.
 *
 * A larger Sidearm ancestor can contain:
 *
 * Angel Cruz ... RHP 6'5" 195 lbs
 * James Morice ...
 *
 * Merely requiring "James Morice" somewhere in that ancestor
 * still allows Angel Cruz's measurements to satisfy the
 * height/weight checks.
 *
 * By discarding everything BEFORE James's name, measurements
 * belonging to the previous roster card cannot leak into
 * James's record.
 */
let playerScopedText =
  text;

if (
  playerName
) {
  const playerIndex =
    text
      .toLowerCase()
      .indexOf(
        playerName.toLowerCase(),
      );

  if (
    playerIndex < 0
  ) {
    container =
      container.parent();

    continue;
  }

  playerScopedText =
    cleanText(
      text.slice(
        playerIndex,
      ),
    );
}

        if (!text) {
          container =
            container.parent();

          continue;
        }

        /*
         * Once the ancestor is this large, we are leaving the
         * individual player card and entering roster/page-level
         * wrappers.
         *
         * Because subsequent parents can only be larger, stop.
         */
        if (
          text.length >
          MAX_ROSTER_CARD_TEXT_LENGTH
        ) {
          break;
        }

const hasHeight =
  /(?:\bHeight\s+)?\d\s*(?:-|['′])\s*\d{1,2}/i.test(
    playerScopedText,
  );

const hasWeight =
  /(?:\bWeight\s+)?\d{2,3}\s*lbs?/i.test(
    playerScopedText,
  );

const hasPosition =
  /Position\s+(?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL)(?:\/(?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL))*/i.test(
    playerScopedText,
  ) ||
  /((?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL)(?:\/(?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL))*)(?=\s+\1|\d\s*(?:-|['′]))/i.test(
    playerScopedText,
  ) ||
  /\b(?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL)(?:\/(?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL))*\b/i.test(
    playerScopedText,
  );

const hasClass =
  /\b(?:Academic Year|Class)\s+(?:Graduate Student|Graduate|Redshirt Freshman|Redshirt Sophomore|Redshirt Junior|Redshirt Senior|Fifth Year|5th Year|Freshman|Sophomore|Junior|Senior|RS-?Fr\.?|R-?Fr\.?|Fr\.?|RS-?So\.?|R-?So\.?|So\.?|RS-?Jr\.?|R-?Jr\.?|Jr\.?|RS-?Sr\.?|R-?Sr\.?|Sr\.?|Gr\.?|Grad)\b/i.test(
    playerScopedText,
  ) ||
  /\b(?:Graduate Student|Graduate|Redshirt Freshman|Redshirt Sophomore|Redshirt Junior|Redshirt Senior|Freshman|Sophomore|Junior|Senior|R-Fr\.?|R-So\.?|R-Jr\.?|R-Sr\.?|Fr\.?|So\.?|Jr\.?|Sr\.?|Gr\.?)\b/i.test(
    playerScopedText,
  );

        /*
         * Height + weight alone are not enough.
         *
         * A page-level ancestor containing multiple players
         * naturally contains those values. Requiring another
         * roster-specific field greatly reduces the chance that
         * an unrelated profile link gets accepted.
         */
        if (
          hasHeight &&
          hasWeight &&
          (
            hasPosition ||
            hasClass
          )
        ) {
matchedText =
  playerScopedText;

          break;
        }

        container =
          container.parent();
      }
    },
  );

  return matchedText;
}

function extractTraditionalSidearmPlayerDomText(
  $: cheerio.CheerioAPI,
  playerUrl: string,
  sourceUrl: string,
  playerName: string,
) {
  if (
    !playerUrl ||
    !playerName
  ) {
    return "";
  }

  const sourceOrigin =
    new URL(
      sourceUrl,
    ).origin;

  /*
   * Traditional Sidearm roster cards may require climbing
   * farther from the player-profile anchor than the compact
   * WMT / modern Sidearm cards handled by
   * extractPlayerDomText().
   *
   * Butler is the regression case:
   *
   * Logan Crock So. ...
   * Hide/Show Additional Information For Logan Crock
   * UTL UTL 6'4" 195 lbs L/R
   *
   * We can safely allow a larger ancestor because we require
   * the Sidearm player-specific marker containing THIS exact
   * player's name.
   */
  const MAX_TRADITIONAL_SIDEARM_CARD_TEXT_LENGTH =
    5000;

  const playerMarker =
    new RegExp(
      `(?:Hide\\/Show\\s+)?Additional Information For\\s+${escapeRegex(
        playerName,
      )}`,
      "i",
    );

  let matchedText = "";

  $("a[href]").each(
    (
      _,
      node,
    ) => {
      if (
        matchedText
      ) {
        return;
      }

      const anchor =
        $(node);

      const href =
        cleanText(
          anchor.attr(
            "href",
          ),
        );

      if (!href) {
        return;
      }

      const absoluteHref =
        absolutizeUrl(
          href,
          sourceOrigin,
        );

      if (!absoluteHref) {
        return;
      }

      const canonicalHref =
        stripQueryAndHash(
          absoluteHref,
        );

      if (
        canonicalHref !==
        playerUrl
      ) {
        return;
      }

      let container =
        anchor.parent();

      for (
        let depth = 0;
        depth < 16;
        depth += 1
      ) {
        if (
          !container.length
        ) {
          break;
        }

        const text =
          cleanText(
            container.text(),
          );

        if (!text) {
          container =
            container.parent();

          continue;
        }

        /*
         * Once this gets too large, we're clearly entering
         * roster/page-level wrappers rather than one player's
         * card.
         */
        if (
          text.length >
          MAX_TRADITIONAL_SIDEARM_CARD_TEXT_LENGTH
        ) {
          break;
        }

        /*
         * Critical safety check:
         *
         * This ancestor must explicitly identify THIS player
         * through Sidearm's own roster-card marker.
         */
        if (
          !playerMarker.test(
            text,
          )
        ) {
          container =
            container.parent();

          continue;
        }

        /*
         * Scope physical roster data to THIS player's
         * Sidearm marker.
         *
         * Traditional Sidearm ancestors can contain portions
         * of neighboring roster cards. Parsing the entire
         * ancestor can therefore allow the final player in a
         * roster to inherit the previous player's position,
         * height or weight.
         *
         * Example:
         *
         * Angel Cruz ... RHP 6'5" 195 lbs ...
         * James Morice ... Additional Information For James Morice
         *
         * James has no published position/height/weight, so we
         * must not allow Angel's values to satisfy James.
         *
         * Butler's traditional Sidearm layout places the real
         * position / height / weight AFTER this exact marker,
         * making the marker a reliable player-specific boundary.
         */
        const markerIndex =
          text.search(
            playerMarker,
          );

        if (
          markerIndex < 0
        ) {
          container =
            container.parent();

          continue;
        }

        /*
         * Keep the post-marker window intentionally tight.
         *
         * It needs to be large enough for:
         *
         * Additional Information For Logan Crock
         * UTL UTL 6'4" 195 lbs L/R
         *
         * but not large enough to drift into another roster
         * card farther down the page.
         */
        const playerPhysicalText =
          cleanText(
            text.slice(
              markerIndex,
              markerIndex + 500,
            ),
          );

    /*
 * Parse physical fields ONLY from the bounded
 * player-specific post-marker window.
 *
 * Class may occur before the Sidearm marker, so class
 * extraction continues to use the full player card text.
 */
const positionRaw =
  extractPosition(
    playerPhysicalText,
  );

const classYearRaw =
  extractClassYear(
    text,
    playerName,
  );

const heightRaw =
  extractHeight(
    playerPhysicalText,
  );

const weightRaw =
  extractWeight(
    playerPhysicalText,
  );
  
        if (
          positionRaw &&
          classYearRaw &&
          heightRaw &&
          weightRaw
        ) {
          /*
           * Return the combined player-specific evidence.
           *
           * Preserve the class-bearing portion of the card,
           * while ensuring physical fields came only from the
           * post-marker player scope above.
           */
          matchedText =
            cleanText(
              `${playerName} ${classYearRaw} ${playerPhysicalText}`,
            );

          break;
        }

        container =
          container.parent();
      }
    },
  );

  return matchedText;
}

function normalizeRosterTableHeader(
  value: string,
) {
  return cleanText(
    value,
  )
    .toLowerCase()
    .replace(
      /[^a-z0-9/]+/g,
      "",
    );
}

function findRosterTableColumn(
  headers: string[],
  aliases: string[],
) {
  for (
    const alias
    of aliases
  ) {
    const normalizedAlias =
      normalizeRosterTableHeader(
        alias,
      );

    const index =
      headers.findIndex(
        (header) =>
          header ===
          normalizedAlias,
      );

    if (
      index >= 0
    ) {
      return index;
    }
  }

  return -1;
}

function normalizeRosterTableHeight(
  value: string,
) {
  const raw =
    cleanText(
      value,
    );

  if (!raw) {
    return "";
  }

  /*
   * Sidearm tables commonly expose:
   *
   * 5-8
   * 6-4
   * 5' 11"
   * 6'2"
   *
   * Keep extractHeight()/parseHeightInches() compatible
   * by converting the simple feet-inches table form into
   * our normal display representation.
   */
  const dashMatch =
    raw.match(
      /^(\d)\s*-\s*(\d{1,2})$/,
    );

  if (
    dashMatch?.[1] &&
    dashMatch?.[2]
  ) {
    return `${dashMatch[1]}'${dashMatch[2]}"`;
  }

  const parsed =
    extractHeight(
      raw,
    );

  return (
    parsed ||
    raw
  );
}

function normalizeRosterTableWeight(
  value: string,
) {
  const raw =
    cleanText(
      value,
    );

  if (!raw) {
    return "";
  }

  /*
   * Sidearm tables often contain only:
   *
   * 195
   *
   * while card layouts expose:
   *
   * 195 lbs
   */
  const numeric =
    raw.match(
      /^(\d{2,3})$/,
    );

  if (
    numeric?.[1]
  ) {
    return `${numeric[1]} lbs`;
  }

  const parsed =
    extractWeight(
      raw,
    );

  return (
    parsed ||
    raw
  );
}

function extractStructuredRosterTablePlayers(
  $: cheerio.CheerioAPI,
  sourceUrl: string,
  season: string,
): RosterPlayer[] {
  const origin =
    new URL(
      sourceUrl,
    ).origin;

  let bestPlayers:
    RosterPlayer[] = [];

  $("table").each(
    (
      _,
      tableNode,
    ) => {
      const table =
        $(tableNode);

      /*
       * Read the first meaningful header row.
       *
       * Butler currently exposes:
       *
       * No.
       * Name
       * Pos.
       * Yr.
       * B/T
       * Ht.
       * Wt.
       * Hometown / High School
       * Previous School
       */
      let headers:
        string[] = [];

      table
        .find(
          "thead tr",
        )
        .each(
          (
            _,
            rowNode,
          ) => {
            if (
              headers.length
            ) {
              return;
            }

            const rowHeaders =
              $(rowNode)
                .find(
                  "th, td",
                )
                .map(
                  (
                    _,
                    cellNode,
                  ) =>
                    normalizeRosterTableHeader(
                      $(cellNode)
                        .text(),
                    ),
                )
                .get()
                .filter(
                  Boolean,
                );

            if (
              rowHeaders.length >=
              4
            ) {
              headers =
                rowHeaders;
            }
          },
        );

      /*
       * Some Sidearm themes do not use <thead>.
       * Fall back to the first row containing <th>.
       */
      if (
        headers.length ===
        0
      ) {
        table
          .find(
            "tr",
          )
          .each(
            (
              _,
              rowNode,
            ) => {
              if (
                headers.length
              ) {
                return;
              }

              const ths =
                $(rowNode)
                  .find(
                    "th",
                  );

              if (
                ths.length < 4
              ) {
                return;
              }

              headers =
                ths
                  .map(
                    (
                      _,
                      cellNode,
                    ) =>
                      normalizeRosterTableHeader(
                        $(cellNode)
                          .text(),
                      ),
                  )
                  .get();
            },
          );
      }

      if (
        headers.length <
        4
      ) {
        return;
      }

      const nameIndex =
        findRosterTableColumn(
          headers,
          [
            "name",
            "player",
          ],
        );

      const positionIndex =
        findRosterTableColumn(
          headers,
          [
            "pos",
            "position",
          ],
        );

      const classIndex =
        findRosterTableColumn(
          headers,
          [
            "yr",
            "year",
            "class",
            "academic year",
          ],
        );

      const heightIndex =
        findRosterTableColumn(
          headers,
          [
            "ht",
            "height",
          ],
        );

      const weightIndex =
        findRosterTableColumn(
          headers,
          [
            "wt",
            "weight",
          ],
        );

      /*
       * This is intentionally strict.
       *
       * We only activate the table parser when ALL five
       * core ScoutLine roster fields have dedicated columns.
       *
       * That prevents unrelated statistics/schedule tables
       * from ever entering this extraction path.
       */
      if (
        nameIndex < 0 ||
        positionIndex < 0 ||
        classIndex < 0 ||
        heightIndex < 0 ||
        weightIndex < 0
      ) {
        return;
      }

      const tablePlayers:
        RosterPlayer[] = [];

      const seen =
        new Set<string>();

      table
        .find(
          "tbody tr",
        )
        .each(
          (
            _,
            rowNode,
          ) => {
            const row =
              $(rowNode);

            const cells =
              row.find(
                "th, td",
              );

            if (
              cells.length <
              headers.length
            ) {
              return;
            }

            const cellText =
              cells
                .map(
                  (
                    _,
                    cellNode,
                  ) =>
                    cleanText(
                      $(cellNode)
                        .text(),
                    ),
                )
                .get();

            const nameCell =
              cells.eq(
                nameIndex,
              );

            /*
             * Prefer the profile-link text because Sidearm
             * name cells may contain accessibility labels,
             * duplicate names, or other hidden text.
             */
            let playerName = "";

            let profileUrl = "";

            nameCell
              .find(
                "a[href]",
              )
              .each(
                (
                  _,
                  anchorNode,
                ) => {
                  if (
                    playerName &&
                    profileUrl
                  ) {
                    return;
                  }

                  const anchor =
                    $(anchorNode);

                  const href =
                    cleanText(
                      anchor.attr(
                        "href",
                      ),
                    );

                  if (
                    !href ||
                    !isRosterPlayerHref(
                      href,
                    )
                  ) {
                    return;
                  }

                  const candidateName =
                    isPlausibleRosterPlayerName(
                      cleanText(
                        anchor.text(),
                      ),
                    );

                  const absolute =
                    absolutizeUrl(
                      href,
                      origin,
                    );

                  if (
                    candidateName &&
                    absolute
                  ) {
                    playerName =
                      candidateName;

                    profileUrl =
                      stripQueryAndHash(
                        absolute,
                      );
                  }
                },
              );

            /*
             * Some table themes place the player link in
             * another cell or omit it altogether.
             *
             * The dedicated Name column is still safe because
             * we already positively identified this as a roster
             * table from its complete header schema.
             */
            if (
              !playerName
            ) {
              playerName =
                isPlausibleRosterPlayerName(
                  cellText[
                    nameIndex
                  ] ?? "",
                );
            }

            if (
              !profileUrl
            ) {
              row
                .find(
                  "a[href]",
                )
                .each(
                  (
                    _,
                    anchorNode,
                  ) => {
                    if (
                      profileUrl
                    ) {
                      return;
                    }

                    const href =
                      cleanText(
                        $(anchorNode)
                          .attr(
                            "href",
                          ),
                      );

                    if (
                      !href ||
                      !isRosterPlayerHref(
                        href,
                      )
                    ) {
                      return;
                    }

                    const absolute =
                      absolutizeUrl(
                        href,
                        origin,
                      );

                    if (
                      absolute
                    ) {
                      profileUrl =
                        stripQueryAndHash(
                          absolute,
                        );
                    }
                  },
                );
            }

            if (
              !playerName
            ) {
              return;
            }

            const positionRaw =
              cleanText(
                cellText[
                  positionIndex
                ],
              )
                .toUpperCase()
                .replace(
                  /\s+/g,
                  "",
                );

            const classYearRaw =
              cleanText(
                cellText[
                  classIndex
                ],
              );

            const heightRaw =
              normalizeRosterTableHeight(
                cellText[
                  heightIndex
                ] ?? "",
              );

            const weightRaw =
              normalizeRosterTableWeight(
                cellText[
                  weightIndex
                ] ?? "",
              );

            /*
             * Reject table rows that do not look like actual
             * baseball players.
             *
             * This also prevents footer/summary rows from
             * becoming players.
             */
            if (
              !positionRaw ||
              !classYearRaw ||
              !heightRaw ||
              !weightRaw
            ) {
              return;
            }

            if (
              !/^(?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL)(?:\/(?:RHP|LHP|P|C|IF|INF|MIF|OF|1B|2B|3B|SS|UT|UTL|UTIL))*$/i.test(
                positionRaw,
              )
            ) {
              return;
            }

            const heightInches =
              parseHeightInches(
                heightRaw,
              );

            const weightLb =
              parseWeightLb(
                weightRaw,
              );

            const classBucket =
              normalizeClassBucket(
                classYearRaw,
              );

            if (
              heightInches ===
                null ||
              weightLb ===
                null ||
              !classBucket ||
              classBucket ===
                "UNKNOWN"
            ) {
              return;
            }

            const dedupeKey =
              profileUrl ||
              [
                playerName.toLowerCase(),
                positionRaw,
                classYearRaw.toLowerCase(),
                heightInches,
                weightLb,
              ].join(
                "|",
              );

            if (
              seen.has(
                dedupeKey,
              )
            ) {
              return;
            }

            seen.add(
              dedupeKey,
            );

            tablePlayers.push({
              season,

              name:
                playerName,

              positionRaw,

              primaryPosition:
                normalizePrimaryPosition(
                  positionRaw,
                ),

              classYearRaw,

              classBucket,

              heightRaw,

              heightInches,

              weightRaw,

              weightLb,

              rosterProfileUrl:
                profileUrl,
            });
          },
        );

      /*
       * There can be several tables on an athletics page.
       * Keep whichever valid roster table contains the most
       * actual players.
       */
      if (
        tablePlayers.length >
        bestPlayers.length
      ) {
        bestPlayers =
          tablePlayers;
      }
    },
  );

  /*
   * Do not activate this parser for a tiny/partial table.
   *
   * If it does not satisfy our normal populated-roster
   * threshold, return [] and allow every existing parser to
   * behave exactly as before.
   */
  if (
    bestPlayers.length <
    MIN_POPULATED_ROSTER_SIZE
  ) {
    return [];
  }

  return bestPlayers;
}

function extractRosterPlayers(
  html: string,
  sourceUrl: string,
  season: string,
) {
  const $ =
    cheerio.load(
      html,
    );

    const structuredPlayers =
  extractStructuredRosterTablePlayers(
    $,
    sourceUrl,
    season,
  );

if (
  structuredPlayers.length >=
  MIN_POPULATED_ROSTER_SIZE
) {
  if (
    VERBOSE
  ) {
    console.log(
      `STRUCTURED ROSTER TABLE — ${structuredPlayers.length} players`,
    );
  }

  return structuredPlayers;
}

  /*
   * =========================================================
   * HIGHEST-CONFIDENCE PATH:
   * STRUCTURED ROSTER TABLE
   * =========================================================
   *
   * Traditional Sidearm sites may expose a real roster table
   * containing dedicated:
   *
   * Name
   * Position
   * Class
   * Height
   * Weight
   *
   * columns.
   *
   * Butler is our regression example.
   *
   * When this exists and contains a populated roster, use it
   * directly rather than reconstructing cards from flattened
   * text.
   *
   * IMPORTANT:
   *
   * Returning [] from the table parser means every existing
   * WMT / modern Sidearm / traditional Sidearm path below
   * remains completely unchanged.
   */

  /*
   * =========================================================
   * EXISTING EXTRACTION STACK
   * =========================================================
   */

  const links =
    extractPlayerLinks(
      $,
      sourceUrl,
    );

  if (
    links.length === 0
  ) {
    return [];
  }

  const rosterText =
    extractRosterVisibleText(
      $,
      links[0].name,
    );

  const blocks =
    extractPlayerBlocks(
      rosterText,
      links,
    );

  const players:
    RosterPlayer[] = [];

  for (
    const link
    of links
  ) {
    const textBlock =
      blocks.get(
        link.url,
      ) ?? "";

    let positionRaw =
      extractPosition(
        textBlock,
      );

    let classYearRaw =
      extractClassYear(
        textBlock,
        link.name,
      );

    let heightRaw =
      extractHeight(
        textBlock,
      );

    let weightRaw =
      extractWeight(
        textBlock,
      );

/*
 * DOM fallback for incomplete text blocks.
 *
 * Existing successful text parsers stay authoritative.
 * We only fill fields that remain blank.
 *
 * IMPORTANT:
 *
 * If this text block already contains Sidearm's
 *
 * "Additional Information For <player>"
 *
 * marker, we know this is a traditional Sidearm roster card.
 *
 * In that case, DO NOT use the generic DOM fallback. A larger
 * generic ancestor can include a neighboring roster card and
 * leak that player's measurements into an incomplete record.
 *
 * Northeastern / James Morice is the regression example:
 *
 * Angel Cruz ... RHP 6'5" 195 lbs
 * James Morice ... Additional Information For James Morice
 *
 * James has no published position / height / weight, so his
 * record must remain incomplete rather than inheriting Angel's
 * physical data.
 */
if (
  !positionRaw ||
  !classYearRaw ||
  !heightRaw ||
  !weightRaw
) {
  const traditionalSidearmMarker =
    new RegExp(
      `(?:Hide\\/Show\\s+)?Additional Information For\\s+${escapeRegex(
        link.name,
      )}`,
      "i",
    );

  const isTraditionalSidearmBlock =
    traditionalSidearmMarker.test(
      textBlock,
    );

  /*
   * Generic DOM lookup remains unchanged for WMT / modern
   * Sidearm layouts.
   *
   * But once the current text block positively identifies a
   * traditional Sidearm player card, skip this generic path.
   */
  const domText =
    isTraditionalSidearmBlock
      ? ""
      : extractPlayerDomText(
          $,
          link.url,
          sourceUrl,
          link.name,
        );

  /*
   * Traditional Sidearm fallback is player-marker scoped and
   * therefore safe for incomplete traditional Sidearm cards.
   */
  const traditionalSidearmDomText =
    domText
      ? ""
      : extractTraditionalSidearmPlayerDomText(
          $,
          link.url,
          sourceUrl,
          link.name,
        );

  const fallbackText =
    domText ||
    traditionalSidearmDomText;

  if (
    fallbackText
  ) {
    positionRaw =
      positionRaw ||
      extractPosition(
        fallbackText,
      );

    classYearRaw =
      classYearRaw ||
      extractClassYear(
        fallbackText,
        link.name,
      );

    heightRaw =
      heightRaw ||
      extractHeight(
        fallbackText,
      );

    weightRaw =
      weightRaw ||
      extractWeight(
        fallbackText,
      );
  }
}

    if (
      VERBOSE &&
      (
        !positionRaw ||
        !classYearRaw ||
        !heightRaw ||
        !weightRaw
      )
    ) {
      console.log(
        `RAW BLOCK — ${link.name}: ${textBlock.slice(
          0,
          500,
        )}`,
      );
    }

    players.push({
      season,

      name:
        link.name,

      positionRaw,

      primaryPosition:
        normalizePrimaryPosition(
          positionRaw,
        ),

      classYearRaw,

      classBucket:
        normalizeClassBucket(
          classYearRaw,
        ),

      heightRaw,

      heightInches:
        parseHeightInches(
          heightRaw,
        ),

      weightRaw,

      weightLb:
        parseWeightLb(
          weightRaw,
        ),

      rosterProfileUrl:
        link.url,
    });
  }

  return players;
}

function isCompletePlayer(
  player: RosterPlayer,
) {
  return Boolean(
    player.positionRaw &&
    player.classYearRaw &&
    player.classBucket &&
    player.classBucket !==
      "UNKNOWN" &&
    player.heightInches !==
      null &&
    player.weightLb !==
      null,
  );
}

function summarizePlayers(
  players: RosterPlayer[],
) {
  const completePlayers =
    players.filter(
      isCompletePlayer,
    ).length;

  const countClass =
    (
      bucket: string,
    ) =>
      players.filter(
        (player) =>
          player.classBucket ===
          bucket,
      ).length;

  return {
    completePlayers,

    completionRate:
      players.length
        ? completePlayers /
          players.length
        : 0,

    freshmen:
      countClass(
        "FRESHMAN",
      ),

    sophomores:
      countClass(
        "SOPHOMORE",
      ),

    juniors:
      countClass(
        "JUNIOR",
      ),

    seniors:
      countClass(
        "SENIOR",
      ),

    graduates:
      countClass(
        "GRADUATE",
      ),

    unknownClasses:
      players.filter(
        (player) =>
          !player.classBucket ||
          player.classBucket ===
            "UNKNOWN",
      ).length,
  };
}

async function processTarget(
  target: ProgramTarget,
): Promise<ProgramResult> {
  const baseCandidates =
    buildRosterBaseCandidates(
      target,
    );

  if (
    baseCandidates.length ===
    0
  ) {
    return emptyResult(
      target,
      "NO_ROSTER",
      "No usable rosterUrl, baseballWebsiteUrl, or program website URL.",
    );
  }

  let discovered:
    DiscoveredRosterSeason
    | null = null;

  let lastError = "";

  for (
    const baseCandidate
    of baseCandidates
  ) {
    try {
      discovered =
        await discoverLatestRosterSeason(
          baseCandidate,
          target.collegeName,
        );

      break;
    } catch (
      error
    ) {
      lastError =
        error instanceof Error
          ? error.message
          : String(
              error,
            );
    }
  }

  if (!discovered) {
    return emptyResult(
      target,
      "NO_ROSTER",
      lastError ||
        "No populated roster discovered.",
    );
  }

  try {
    const fetched =
      await fetchHtml(
        discovered.url,
      );

    const players =
      extractRosterPlayers(
        fetched.html,
        fetched.finalUrl,
        discovered.season,
      );

    const summary =
      summarizePlayers(
        players,
      );

    let status:
      RunStatus =
        "PARTIAL";

    if (
      players.length <
      MIN_POPULATED_ROSTER_SIZE
    ) {
      status =
        "NO_ROSTER";
    } else if (
      discovered.seasonConflict
    ) {
      status =
        "SEASON_AMBIGUOUS";
    } else if (
      summary.completionRate >=
      SUCCESS_COMPLETION_RATE
    ) {
      status =
        "SUCCESS";
    }

    return {
      programId:
        target.programId,

      collegeName:
        target.collegeName,

      collegeSlug:
        target.collegeSlug,

      conference:
        target.conference,

      status,

      season:
        discovered.season,

      selectedRosterUrl:
        fetched.finalUrl,

      playersParsed:
        players.length,

      completePlayers:
        summary.completePlayers,

      completionRate:
        summary.completionRate,

      freshmen:
        summary.freshmen,

      sophomores:
        summary.sophomores,

      juniors:
        summary.juniors,

      seniors:
        summary.seniors,

      graduates:
        summary.graduates,

      unknownClasses:
        summary.unknownClasses,

      sourceType:
        discovered.sourceType,

      seasonConflict:
        discovered.seasonConflict,

      error:
        discovered.seasonConflict,

      players,
    };
  } catch (
    error
  ) {
    return emptyResult(
      target,
      "ERROR",
      error instanceof Error
        ? error.message
        : String(
            error,
          ),
    );
  }
}

function emptyResult(
  target: ProgramTarget,
  status: RunStatus,
  error: string,
): ProgramResult {
  return {
    programId:
      target.programId,

    collegeName:
      target.collegeName,

    collegeSlug:
      target.collegeSlug,

    conference:
      target.conference,

    status,

    season:
      "",

    selectedRosterUrl:
      "",

    playersParsed:
      0,

    completePlayers:
      0,

    completionRate:
      0,

    freshmen:
      0,

    sophomores:
      0,

    juniors:
      0,

    seniors:
      0,

    graduates:
      0,

    unknownClasses:
      0,

    sourceType:
      "",

    seasonConflict:
      "",

    error,

    players:
      [],
  };
}

function csvEscape(
  value:
    | string
    | number
    | null
    | undefined,
) {
  const raw =
    String(
      value ?? "",
    );

  if (
    /[",\n\r]/.test(
      raw,
    )
  ) {
    return `"${raw.replace(
      /"/g,
      '""',
    )}"`;
  }

  return raw;
}

function writeCsv(
  filename: string,
  rows: Array<
    Array<
      string
      | number
      | null
      | undefined
    >
  >,
) {
  fs.mkdirSync(
    OUT_DIR,
    {
      recursive:
        true,
    },
  );

  const content =
    rows
      .map(
        (row) =>
          row
            .map(
              csvEscape,
            )
            .join(
              ",",
            ),
      )
      .join(
        "\n",
      );

  fs.writeFileSync(
    filename,
    `${content}\n`,
    "utf8",
  );
}

function timestampSlug() {
  return new Date()
    .toISOString()
    .replace(
      /[:.]/g,
      "-",
    );
}

function writeOutputs(
  results: ProgramResult[],
) {
  const stamp =
    timestampSlug();

  const summaryPath =
    path.join(
      OUT_DIR,
      `college-baseball-rosters.dom.summary.${stamp}.csv`,
    );

  const playersPath =
    path.join(
      OUT_DIR,
      `college-baseball-rosters.dom.generated.${stamp}.csv`,
    );

  const summaryRows:
    Array<
      Array<
        string
        | number
      >
    > = [
      [
        "programId",
        "collegeSlug",
        "collegeName",
        "conference",
        "status",
        "season",
        "sourceType",
        "seasonConflict",
        "selectedRosterUrl",
        "playersParsed",
        "completePlayers",
        "completionPct",
        "freshmen",
        "sophomores",
        "juniors",
        "seniors",
        "graduates",
        "unknownClasses",
        "error",
      ],
    ];

  const playerRows:
    Array<
      Array<
        string
        | number
      >
    > = [
      [
        "programId",
        "collegeSlug",
        "collegeName",
        "season",
        "name",
        "positionRaw",
        "primaryPosition",
        "classYearRaw",
        "classBucket",
        "heightRaw",
        "heightInches",
        "weightRaw",
        "weightLb",
        "rosterProfileUrl",
        "sourceRosterUrl",
      ],
    ];

  for (
    const result
    of results
  ) {
    summaryRows.push([
      result.programId,
      result.collegeSlug,
      result.collegeName,
      result.conference,
      result.status,
      result.season,
      result.sourceType,
      result.seasonConflict,
      result.selectedRosterUrl,
      result.playersParsed,
      result.completePlayers,
      (
        result.completionRate *
        100
      ).toFixed(
        1,
      ),
      result.freshmen,
      result.sophomores,
      result.juniors,
      result.seniors,
      result.graduates,
      result.unknownClasses,
      result.error,
    ]);

    for (
      const player
      of result.players
    ) {
      playerRows.push([
        result.programId,
        result.collegeSlug,
        result.collegeName,
        player.season,
        player.name,
        player.positionRaw,
        player.primaryPosition,
        player.classYearRaw,
        player.classBucket,
        player.heightRaw,
        player.heightInches ??
          "",
        player.weightRaw,
        player.weightLb ??
          "",
        player.rosterProfileUrl,
        result.selectedRosterUrl,
      ]);
    }
  }

  writeCsv(
    summaryPath,
    summaryRows,
  );

  writeCsv(
    playersPath,
    playerRows,
  );

  console.log("");
  console.log(
    `Summary CSV: ${summaryPath}`,
  );

  console.log(
    `Player CSV:  ${playersPath}`,
  );
}

function printProgramResult(
  result: ProgramResult,
  index: number,
  total: number,
) {
  const completion =
    (
      result.completionRate *
      100
    ).toFixed(
      1,
    );

  console.log(
    `[${index}/${total}] ${result.collegeName}`,
  );

  console.log(
    `  status:      ${result.status}`,
  );

  console.log(
    `  season:      ${result.season || "(none)"}`,
  );

  console.log(
    `  players:     ${result.playersParsed}`,
  );

  console.log(
    `  complete:    ${result.completePlayers}/${result.playersParsed} (${completion}%)`,
  );

  if (
    result.selectedRosterUrl
  ) {
    console.log(
      `  source:      ${result.selectedRosterUrl}`,
    );
  }

  if (
    result.error
  ) {
    console.log(
      `  error:       ${result.error}`,
    );
  }

  if (
    VERBOSE &&
    result.players.length
  ) {
    for (
      const player
      of result.players
    ) {
      console.log(
        `    ${player.name} | ${player.positionRaw || "?"} | ${player.classYearRaw || "?"} | ${player.heightRaw || "?"} | ${player.weightRaw || "?"}`,
      );
    }
  }

  console.log("");
}

function printFinalSummary(
  results: ProgramResult[],
) {
  const successful =
    results.filter(
      (result) =>
        result.status ===
        "SUCCESS",
    );

  const partial =
    results.filter(
      (result) =>
        result.status ===
        "PARTIAL",
    );

  const noRoster =
    results.filter(
      (result) =>
        result.status ===
        "NO_ROSTER",
    );

  const errors =
    results.filter(
      (result) =>
        result.status ===
        "ERROR",
    );

  const players =
    results.reduce(
      (
        sum,
        result,
      ) =>
        sum +
        result.playersParsed,
      0,
    );

  const complete =
    results.reduce(
      (
        sum,
        result,
      ) =>
        sum +
        result.completePlayers,
      0,
    );

  console.log(
    "=================================================",
  );

  console.log(
    "D1 BASEBALL ROSTER ENRICHMENT SUMMARY",
  );

  console.log(
    "=================================================",
  );

  console.log(
    `Programs scanned:              ${results.length}`,
  );

  console.log(
    `Successful programs:           ${successful.length}`,
  );

  console.log(
    `Partial programs:              ${partial.length}`,
  );

  console.log(
    `No populated roster:           ${noRoster.length}`,
  );

  console.log(
    `Errors:                        ${errors.length}`,
  );

  console.log(
    `Player records parsed:         ${players}`,
  );

  console.log(
    `Complete player records:       ${complete}`,
  );

  console.log(
    `Overall player completeness:   ${
      players
        ? (
            (
              complete /
              players
            ) *
            100
          ).toFixed(
            1,
          )
        : "0.0"
    }%`,
  );

  console.log(
    "=================================================",
  );

  if (
    partial.length
  ) {
    console.log("");
    console.log(
      "PARTIAL PROGRAMS",
    );

    for (
      const result
      of partial
    ) {
      console.log(
        `  ${result.collegeName}: ${result.completePlayers}/${result.playersParsed} complete`,
      );
    }
  }

  if (
    noRoster.length
  ) {
    console.log("");
    console.log(
      "NO POPULATED ROSTER",
    );

    for (
      const result
      of noRoster
    ) {
      console.log(
        `  ${result.collegeName}: ${result.error || "not found"}`,
      );
    }
  }

  if (
    errors.length
  ) {
    console.log("");
    console.log(
      "ERRORS",
    );

    for (
      const result
      of errors
    ) {
      console.log(
        `  ${result.collegeName}: ${result.error}`,
      );
    }
  }
}

async function runRegressionSuite() {
  console.log(
    "=================================================",
  );

  console.log(
    "D1 ROSTER REGRESSION SUITE",
  );

  console.log(
    "=================================================",
  );

  const results:
    ProgramResult[] = [];

  let passed = 0;

  for (
    let index = 0;
    index <
    REGRESSION_CASES.length;
    index += 1
  ) {
    const test =
      REGRESSION_CASES[
        index
      ];

    const target:
      ProgramTarget = {
      programId:
        `regression:${test.slug}`,

      collegeName:
        test.name,

      collegeSlug:
        test.slug,

      conference:
        "",

      rosterUrl:
        test.baseRosterUrl,

      baseballWebsiteUrl:
        test.baseRosterUrl,

      collegeProgramWebsiteUrl:
        "",
    };

    const result =
      await processTarget(
        target,
      );

    results.push(
      result,
    );

    const pass =
      result.status ===
        "SUCCESS" &&
      result.season ===
        test.expectedSeason &&
      result.playersParsed >=
        test.minimumPlayers &&
      result.completePlayers ===
        result.playersParsed;

    if (pass) {
      passed += 1;
    }

    console.log(
      `${pass ? "✅ PASS" : "❌ FAIL"} — ${test.name}`,
    );

    console.log(
      `  expected season: ${test.expectedSeason}`,
    );

    console.log(
      `  actual season:   ${result.season || "(none)"}`,
    );

    console.log(
      `  minimum players: ${test.minimumPlayers}`,
    );

    console.log(
      `  actual players:  ${result.playersParsed}`,
    );

    console.log(
      `  complete:        ${result.completePlayers}/${result.playersParsed}`,
    );

    if (
      result.error
    ) {
      console.log(
        `  error:           ${result.error}`,
      );
    }

    console.log("");
  }

  console.log(
    "=================================================",
  );

  console.log(
    `REGRESSION RESULT: ${passed}/${REGRESSION_CASES.length} passed`,
  );

  console.log(
    "=================================================",
  );

  if (
    passed !==
    REGRESSION_CASES.length
  ) {
    process.exitCode = 1;
  }
}

async function loadD1Targets() {
  const programs =
    await prisma
      .collegeBaseballProgram
      .findMany({
        where: {
          division:
            "NCAA_D1",

          ...(SCHOOL_FILTER
            ? {
                college: {
                  is: {
                    OR: [
                      {
                        name: {
                          equals:
                            SCHOOL_FILTER,
                          mode:
                            "insensitive",
                        },
                      },

                      {
                        slug: {
                          equals:
                            SCHOOL_FILTER,
                          mode:
                            "insensitive",
                        },
                      },
                    ],
                  },
                },
              }
            : {}),
        },

        include: {
          college:
            true,
        },

        orderBy: [
          {
            conference:
              "asc",
          },

          {
            college: {
              name:
                "asc",
            },
          },
        ],

        ...(LIMIT
          ? {
              take:
                LIMIT,
            }
          : {}),
      });

  return programs.map(
    (
      program,
    ): ProgramTarget => ({
      programId:
        program.id,

      collegeName:
        program.college.name,

      collegeSlug:
        program.college.slug,

      conference:
        cleanText(
          program.conference,
        ),

      rosterUrl:
        cleanText(
          program.rosterUrl,
        ),

      baseballWebsiteUrl:
        cleanText(
          program.baseballWebsiteUrl,
        ),

      collegeProgramWebsiteUrl:
        cleanText(
          program.college
            .programWebsiteUrl,
        ),
    }),
  );
}

async function runGenericDryRun() {
  console.log(
    "=================================================",
  );

  console.log(
    "D1 BASEBALL ROSTER ENRICHMENT — DRY RUN",
  );

  console.log(
    "=================================================",
  );

  console.log(
    "Mode: DRY RUN — NO DATABASE WRITES",
  );

  if (
    SCHOOL_FILTER
  ) {
    console.log(
      `School filter: ${SCHOOL_FILTER}`,
    );
  }

  if (LIMIT) {
    console.log(
      `Limit: ${LIMIT}`,
    );
  }

  const targets =
    await loadD1Targets();

  console.log(
    `Scanning ${targets.length} D1 program(s)...`,
  );

  console.log("");

  const results:
    ProgramResult[] = [];

  for (
    let index = 0;
    index <
    targets.length;
    index += 1
  ) {
    const target =
      targets[index];

    const result =
      await processTarget(
        target,
      );

    results.push(
      result,
    );

    printProgramResult(
      result,
      index + 1,
      targets.length,
    );
  }

  printFinalSummary(
    results,
  );

  writeOutputs(
    results,
  );
}

async function main() {
  try {
    if (
      REGRESSION_MODE
    ) {
      await runRegressionSuite();
      return;
    }

    await runGenericDryRun();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(
  (error) => {
    console.error(
      error,
    );

    process.exitCode = 1;
  },
);