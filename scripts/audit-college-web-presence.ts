// audit-college-web-presence.ts

import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

type CsvRow = Record<string, string>;

const GENERATED_DIR = path.resolve(
  process.cwd(),
  "data",
  "enrichment",
  "generated",
);

const URL_FIELDS = [
  "baseballWebsiteUrl",
  "rosterUrl",
  "scheduleUrl",
  "campsUrl",
  "questionnaireUrl",
  "generalContactUrl",
  "logoUrl",
  "programXUrl",
  "programInstagramUrl",
  "programYoutubeUrl",
] as const;

function findLatestGeneratedCsv(): string {
  const directories = fs
    .readdirSync(GENERATED_DIR, {
      withFileTypes: true,
    })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith(
          "college-web-presence-",
        ),
    )
    .map((entry) => {
      const csvPath = path.join(
        GENERATED_DIR,
        entry.name,
        "college-web-presence.generated.csv",
      );

      return {
        csvPath,
        modifiedAt: fs.existsSync(csvPath)
          ? fs.statSync(csvPath).mtimeMs
          : 0,
      };
    })
    .filter(
      (entry) =>
        entry.modifiedAt > 0,
    )
    .sort(
      (a, b) =>
        b.modifiedAt - a.modifiedAt,
    );

  if (!directories.length) {
    throw new Error(
      "No generated college web-presence CSV was found.",
    );
  }

  return directories[0].csvPath;
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function hostname(value: string): string {
  try {
    return new URL(value).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isHomepage(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.pathname === "/" ||
      url.pathname === "/index.aspx"
    );
  } catch {
    return false;
  }
}

function hasTrackingRedirect(
  value: string,
): boolean {
  return (
    value.includes("/api/v2/promotions/") ||
    value.includes("/adhandler.aspx")
  );
}

function isSuspiciousRoster(
  value: string,
): boolean {
  return /ticketmaster|ticketsmarter|news\/|usabaseball\.com/i.test(
    value,
  );
}

function isSuspiciousSchedule(
  value: string,
): boolean {
  return /ticketmaster|ticketsmarter/i.test(
    value,
  );
}

function isSuspiciousCamp(
  value: string,
): boolean {
  return /ticketsmarter|ticketmaster|bookstore|basketball-arena|community-programs|advantage-fund/i.test(
    value,
  );
}

function isSuspiciousQuestionnaire(
  value: string,
): boolean {
  return (
    isHomepage(value) ||
    /\/index\.aspx(?:\?|$)/i.test(value)
  );
}

function isSocialPost(
  value: string,
): boolean {
  return /instagram\.com\/(?:p|reel)\//i.test(
    value,
  );
}

function isYoutubeVideo(
  value: string,
): boolean {
  return /youtube\.com\/watch|youtu\.be\//i.test(
    value,
  );
}

function printCount(
  label: string,
  count: number,
  total: number,
): void {
  const percentage =
    total > 0
      ? (
          (count / total) *
          100
        ).toFixed(1)
      : "0.0";

  console.log(
    `${label.padEnd(31)} ${String(
      count,
    ).padStart(4)} / ${total} (${percentage}%)`,
  );
}

function main(): void {
  const inputPath =
    process.argv[2]
      ? path.resolve(
          process.cwd(),
          process.argv[2],
        )
      : findLatestGeneratedCsv();

  const raw = fs.readFileSync(
    inputPath,
    "utf8",
  );

const rows = parse(raw, {
  columns: true,
  skip_empty_lines: true,
  bom: true,
  relax_quotes: true,
}) as CsvRow[];

  console.log("");
  console.log(
    "=".repeat(100),
  );
  console.log(
    "SCOUTLINE COLLEGE WEB-PRESENCE AUDIT",
  );
  console.log(
    "=".repeat(100),
  );
  console.log("");
  console.log(
    `Input CSV: ${inputPath}`,
  );
  console.log(
    `Rows:      ${rows.length}`,
  );
  console.log("");

  console.log("FIELD COVERAGE");
  console.log("-".repeat(100));

  for (const field of URL_FIELDS) {
    const count = rows.filter(
      (row) =>
        Boolean(clean(row[field])),
    ).length;

    printCount(
      field,
      count,
      rows.length,
    );
  }

  printCount(
    "generalContactEmail",
    rows.filter(
      (row) =>
        Boolean(
          clean(
            row.generalContactEmail,
          ),
        ),
    ).length,
    rows.length,
  );

  console.log("");
  console.log("DISCOVERY STATUS");
  console.log("-".repeat(100));

  const statuses = new Map<
    string,
    number
  >();

  for (const row of rows) {
    const status =
      clean(
        row.discoveryStatus,
      ) || "BLANK";

    statuses.set(
      status,
      (statuses.get(status) ?? 0) +
        1,
    );
  }

  for (const [
    status,
    count,
  ] of [...statuses.entries()].sort(
    (a, b) =>
      b[1] - a[1],
  )) {
    printCount(
      status,
      count,
      rows.length,
    );
  }

  const issueRows: CsvRow[] = [];

  for (const row of rows) {
    const issues: string[] = [];

    const rosterUrl = clean(
      row.rosterUrl,
    );
    const scheduleUrl = clean(
      row.scheduleUrl,
    );
    const campsUrl = clean(
      row.campsUrl,
    );
    const questionnaireUrl = clean(
      row.questionnaireUrl,
    );
    const xUrl = clean(
      row.programXUrl,
    );
    const instagramUrl = clean(
      row.programInstagramUrl,
    );
    const youtubeUrl = clean(
      row.programYoutubeUrl,
    );
    const email = clean(
      row.generalContactEmail,
    );

    if (
      rosterUrl &&
      isSuspiciousRoster(
        rosterUrl,
      )
    ) {
      issues.push(
        "SUSPICIOUS_ROSTER",
      );
    }

    if (
      scheduleUrl &&
      isSuspiciousSchedule(
        scheduleUrl,
      )
    ) {
      issues.push(
        "SUSPICIOUS_SCHEDULE",
      );
    }

    if (
      campsUrl &&
      isSuspiciousCamp(
        campsUrl,
      )
    ) {
      issues.push(
        "SUSPICIOUS_CAMP",
      );
    }

    if (
      questionnaireUrl &&
      isSuspiciousQuestionnaire(
        questionnaireUrl,
      )
    ) {
      issues.push(
        "SUSPICIOUS_QUESTIONNAIRE",
      );
    }

    if (
      [xUrl, instagramUrl, youtubeUrl].some(
        hasTrackingRedirect,
      )
    ) {
      issues.push(
        "TRACKING_REDIRECT",
      );
    }

    if (
      /x\.com\/@/i.test(xUrl)
    ) {
      issues.push(
        "X_AT_HANDLE",
      );
    }

    if (
      instagramUrl &&
      isSocialPost(
        instagramUrl,
      )
    ) {
      issues.push(
        "INSTAGRAM_POST",
      );
    }

    if (
      youtubeUrl &&
      isYoutubeVideo(
        youtubeUrl,
      )
    ) {
      issues.push(
        "YOUTUBE_VIDEO",
      );
    }

    if (
      /@sentry\.wmt\.dev$/i.test(
        email,
      )
    ) {
      issues.push(
        "SYSTEM_EMAIL",
      );
    }

    if (
      clean(
        row.discoveryStatus,
      ) !== "FOUND"
    ) {
      issues.push(
        `STATUS_${clean(
          row.discoveryStatus,
        ) || "BLANK"}`,
      );
    }

    if (issues.length) {
      issueRows.push({
        slug: clean(row.slug),
        name: clean(row.name),
        discoveryStatus: clean(
          row.discoveryStatus,
        ),
        issues: issues.join("|"),
        rosterUrl,
        scheduleUrl,
        campsUrl,
        questionnaireUrl,
        generalContactEmail: email,
        programXUrl: xUrl,
        programInstagramUrl:
          instagramUrl,
        programYoutubeUrl:
          youtubeUrl,
      });
    }
  }

  console.log("");
  console.log("QUALITY FLAGS");
  console.log("-".repeat(100));

  const issueCounts = new Map<
    string,
    number
  >();

  for (const row of issueRows) {
    for (const issue of clean(
      row.issues,
    ).split("|")) {
      issueCounts.set(
        issue,
        (issueCounts.get(issue) ??
          0) + 1,
      );
    }
  }

  for (const [
    issue,
    count,
  ] of [...issueCounts.entries()].sort(
    (a, b) =>
      b[1] - a[1],
  )) {
    console.log(
      `${issue.padEnd(31)} ${String(
        count,
      ).padStart(4)}`,
    );
  }

  const outputDirectory =
    path.dirname(inputPath);

  const auditPath = path.join(
    outputDirectory,
    "college-web-presence.audit.csv",
  );

  const headers = [
    "slug",
    "name",
    "discoveryStatus",
    "issues",
    "rosterUrl",
    "scheduleUrl",
    "campsUrl",
    "questionnaireUrl",
    "generalContactEmail",
    "programXUrl",
    "programInstagramUrl",
    "programYoutubeUrl",
  ];

  const escapeCsv = (
    value: unknown,
  ): string => {
    const text = clean(value);

    if (
      /[",\r\n]/.test(text)
    ) {
      return `"${text.replace(
        /"/g,
        '""',
      )}"`;
    }

    return text;
  };

  const outputLines = [
    headers.join(","),
    ...issueRows.map(
      (row) =>
        headers
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
    auditPath,
    `${outputLines.join("\n")}\n`,
    "utf8",
  );

  console.log("");
  console.log(
    `Flagged rows: ${issueRows.length}`,
  );
  console.log(
    `Audit CSV:    ${auditPath}`,
  );
  console.log("");

  const hostCounts = new Map<
    string,
    number
  >();

  for (const row of rows) {
    for (const field of URL_FIELDS) {
      const host = hostname(
        clean(row[field]),
      );

      if (!host) {
        continue;
      }

      hostCounts.set(
        host,
        (hostCounts.get(host) ??
          0) + 1,
      );
    }
  }
}

main();