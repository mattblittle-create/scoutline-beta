// scripts/extract-ncaa-d1-baseball-inventory.ts

import fs from "node:fs";
import path from "node:path";
import { chromium, type Locator, type Page } from "playwright";

const NCAA_RPI_URL =
  "https://www.ncaa.com/rankings/baseball/d1/rpi";

const OUTPUT_DIRECTORY = path.join(
  process.cwd(),
  "data",
  "reference",
);

const OUTPUT_CSV_PATH = path.join(
  OUTPUT_DIRECTORY,
  "ncaa-d1-baseball-programs-2026.csv",
);

const DEBUG_JSON_PATH = path.join(
  OUTPUT_DIRECTORY,
  "ncaa-d1-baseball-rpi-rows.debug.json",
);

const SCREENSHOT_PATH = path.join(
  OUTPUT_DIRECTORY,
  "ncaa-d1-baseball-rpi.debug.png",
);

type ExtractedTeam = {
  rank: number;
  school: string;
};

type DebugRow = {
  index: number;
  cells: string[];
  links: string[];
};

function cleanText(
  value: string | null | undefined,
): string {
  return (value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeCsv(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : String(value);

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

function writeCsv(
  filePath: string,
  rows: Record<string, unknown>[],
): void {
  if (rows.length === 0) {
    fs.writeFileSync(filePath, "", "utf8");
    return;
  }

  const headers = Object.keys(rows[0]);

  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) =>
      headers
        .map((header) => escapeCsv(row[header]))
        .join(","),
    ),
  ];

  fs.writeFileSync(
    filePath,
    `${lines.join("\n")}\n`,
    "utf8",
  );
}

function normalizeSchoolName(value: string): string {
  return cleanText(value)
    .replace(/^\d+\.\s*/, "")
    .replace(/\s+\(\d+(?:-\d+){1,2}\)\s*$/, "")
    .replace(/\s+\d+(?:-\d+){1,2}\s*$/, "")
    .trim();
}

function isRank(value: string): boolean {
  return /^\d{1,3}$/.test(cleanText(value));
}

function isProbableSchoolName(value: string): boolean {
  const normalized = cleanText(value);

  if (normalized.length < 2) {
    return false;
  }

  if (/^\d/.test(normalized)) {
    return false;
  }

  if (
    /^(rank|school|team|record|conference|previous)$/i.test(
      normalized,
    )
  ) {
    return false;
  }

  return /[A-Za-z]/.test(normalized);
}

async function waitForRpiRows(
  page: Page,
): Promise<Locator> {
  const rows = page.locator("table tbody tr");

  await page.waitForFunction(
    () => {
      const candidates = Array.from(
        document.querySelectorAll(
          "table tbody tr",
        ),
      );

      const rankedRows = candidates.filter((row) => {
        const cells = Array.from(
          row.querySelectorAll("td"),
        ).map((cell) =>
          (cell.textContent ?? "")
            .replace(/\s+/g, " ")
            .trim(),
        );

        return (
          cells.length >= 2 &&
          /^\d{1,3}$/.test(cells[0])
        );
      });

      return rankedRows.length >= 200;
    },
    undefined,
    {
      timeout: 60_000,
    },
  );

  return rows;
}

async function inspectRows(
  rows: Locator,
): Promise<DebugRow[]> {
  const rowCount = await rows.count();
  const debugRows: DebugRow[] = [];

  for (let index = 0; index < rowCount; index += 1) {
    const row = rows.nth(index);

    const cells = (
      await row.locator("td").allTextContents()
    ).map(cleanText);

    const links = (
      await row.locator("a").allTextContents()
    )
      .map(cleanText)
      .filter(Boolean);

    debugRows.push({
      index,
      cells,
      links,
    });
  }

  return debugRows;
}

function extractTeamsFromRows(
  rows: DebugRow[],
): ExtractedTeam[] {
  const extracted: ExtractedTeam[] = [];

  for (const row of rows) {
    if (row.cells.length < 2) {
      continue;
    }

    const rankText = cleanText(row.cells[0]);

    if (!isRank(rankText)) {
      continue;
    }

    const rank = Number(rankText);

    /*
     * NCAA's RPI table normally places the school in
     * the second cell. Prefer a link from the row when
     * one exists, but fall back to that second cell.
     */
    const linkedSchool = row.links.find(
      isProbableSchoolName,
    );

    const rawSchool =
      linkedSchool ??
      row.cells
        .slice(1)
        .find(isProbableSchoolName) ??
      "";

    const school = normalizeSchoolName(rawSchool);

    if (!school) {
      continue;
    }

    extracted.push({
      rank,
      school,
    });
  }

  /*
   * Deduplicate by normalized school name while retaining
   * the lowest rank encountered.
   */
  const bySchool = new Map<string, ExtractedTeam>();

  for (const team of extracted) {
    const key = team.school.toLowerCase();

    const existing = bySchool.get(key);

    if (!existing || team.rank < existing.rank) {
      bySchool.set(key, team);
    }
  }

  return Array.from(bySchool.values()).sort(
    (a, b) =>
      a.rank - b.rank ||
      a.school.localeCompare(b.school),
  );
}

async function main(): Promise<void> {
  fs.mkdirSync(OUTPUT_DIRECTORY, {
    recursive: true,
  });

  const browser = await chromium.launch({
    headless: false,
  });

  const context = await browser.newContext({
    viewport: {
      width: 1600,
      height: 1000,
    },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/126.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  try {
    console.log("");
    console.log(
      "Opening NCAA Division I baseball RPI rankings...",
    );
    console.log(NCAA_RPI_URL);
    console.log("");

    await page.goto(NCAA_RPI_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    try {
      await page.waitForLoadState("networkidle", {
        timeout: 20_000,
      });
    } catch {
      // NCAA pages may keep analytics requests open.
    }

    const rows = await waitForRpiRows(page);

    await page.screenshot({
      path: SCREENSHOT_PATH,
      fullPage: true,
    });

    const debugRows = await inspectRows(rows);

    fs.writeFileSync(
      DEBUG_JSON_PATH,
      `${JSON.stringify(
        {
          inspectedAt: new Date().toISOString(),
          pageUrl: page.url(),
          rowCount: debugRows.length,
          rows: debugRows,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const teams = extractTeamsFromRows(debugRows);

    if (teams.length < 200) {
      throw new Error(
        [
          `Only ${teams.length} probable teams were extracted.`,
          `Table rows inspected: ${debugRows.length}.`,
          `Review ${DEBUG_JSON_PATH}.`,
        ].join(" "),
      );
    }

    writeCsv(
      OUTPUT_CSV_PATH,
      teams.map((team) => ({
        rank: team.rank,
        school: team.school,
        season: "2026",
        source: NCAA_RPI_URL,
        extractedAt: new Date().toISOString(),
      })),
    );

    console.log("=".repeat(90));
    console.log(
      "NCAA D1 BASEBALL RPI INVENTORY EXTRACTION",
    );
    console.log("=".repeat(90));
    console.log(
      `Table rows inspected: ${debugRows.length}`,
    );
    console.log(
      `Extracted team names: ${teams.length}`,
    );
    console.log(`Reference CSV:      ${OUTPUT_CSV_PATH}`);
    console.log(`Debug JSON:         ${DEBUG_JSON_PATH}`);
    console.log(`Screenshot:         ${SCREENSHOT_PATH}`);
    console.log("");

    console.log("First 10 teams:");

    for (const team of teams.slice(0, 10)) {
      console.log(`${team.rank}. ${team.school}`);
    }

    console.log("");
    console.log("Last 10 teams:");

    for (const team of teams.slice(-10)) {
      console.log(`${team.rank}. ${team.school}`);
    }

    console.log("");
    console.log(
      "No ScoutLine database records were created, updated, or deleted.",
    );
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error("");
  console.error(
    "NCAA D1 baseball RPI inventory extraction failed.",
  );
  console.error(error);
  process.exitCode = 1;
});