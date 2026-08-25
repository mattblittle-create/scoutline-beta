// scripts/audit-missing-d1-baseball-urls.ts

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OUTPUT_DIRECTORY = path.join(
  process.cwd(),
  "data",
  "enrichment",
  "generated",
);

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function normalizeOrigin(value: string): string {
  const raw = clean(value);

  if (!raw) return "";

  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

function inferBaseballWebsiteUrl(value: string): string {
  const raw = clean(value);

  if (!raw) return "";

  try {
    const parsed = new URL(raw);

    parsed.hash = "";
    parsed.search = "";

    let pathname = parsed.pathname
      .replace(/\/+$/, "");

    /*
     * Convert known scraper URLs back to the sport root.
     *
     * Examples:
     * /sports/baseball/coaches/2026
     * /sports/baseball/roster/2026
     * /sports/baseball/roster
     *
     * become:
     * /sports/baseball
     */
    pathname = pathname
      .replace(
        /\/(?:coaches|roster|coaching-staff)(?:\/\d+)?$/i,
        "",
      )
      .replace(
        /\/roster\/coaches\/[^/]+\/\d+$/i,
        "",
      )
      .replace(
        /\/roster\/season\/\d+\/staff\/[^/]+$/i,
        "",
      );

    /*
     * Bio URLs can contain a person after /coaches/.
     */
    pathname = pathname.replace(
      /\/coaches\/[^/]+\/\d+$/i,
      "",
    );

    if (!pathname) {
      return parsed.origin;
    }

    return `${parsed.origin}${pathname}`;
  } catch {
    return "";
  }
}

function selectBestCandidate(
  contactUrls: string[],
  bioUrls: string[],
): {
  inferredUrl: string;
  sourceType: string;
  sourceUrl: string;
  confidence: string;
} {
  const uniqueContactUrls = Array.from(
    new Set(contactUrls.map(clean).filter(Boolean)),
  );

  const uniqueBioUrls = Array.from(
    new Set(bioUrls.map(clean).filter(Boolean)),
  );

  const inferredContactUrls = Array.from(
    new Set(
      uniqueContactUrls
        .map(inferBaseballWebsiteUrl)
        .filter(Boolean),
    ),
  );

  const inferredBioUrls = Array.from(
    new Set(
      uniqueBioUrls
        .map(inferBaseballWebsiteUrl)
        .filter(Boolean),
    ),
  );

  /*
   * A shared contact URL among multiple imported coaches is the
   * strongest evidence because it is the page the scraper used.
   */
  if (inferredContactUrls.length === 1) {
    return {
      inferredUrl: inferredContactUrls[0],
      sourceType: "COACH_CONTACT_URL",
      sourceUrl: uniqueContactUrls[0] ?? "",
      confidence: "HIGH",
    };
  }

  /*
   * Multiple exact contact URLs may still reduce to the same origin
   * when the scraper used multiple fallback pages.
   */
  const contactOrigins = Array.from(
    new Set(
      uniqueContactUrls
        .map(normalizeOrigin)
        .filter(Boolean),
    ),
  );

  if (
    inferredContactUrls.length > 1 &&
    contactOrigins.length === 1
  ) {
    const shortestCandidate = [...inferredContactUrls]
      .sort(
        (left, right) =>
          left.length - right.length,
      )[0];

    return {
      inferredUrl: shortestCandidate ?? "",
      sourceType: "MULTIPLE_CONTACT_URLS_SAME_ORIGIN",
      sourceUrl: uniqueContactUrls.join(" | "),
      confidence: "MEDIUM",
    };
  }

  if (inferredBioUrls.length === 1) {
    return {
      inferredUrl: inferredBioUrls[0],
      sourceType: "COACH_BIO_URL",
      sourceUrl: uniqueBioUrls[0] ?? "",
      confidence: "MEDIUM",
    };
  }

  const bioOrigins = Array.from(
    new Set(
      uniqueBioUrls
        .map(normalizeOrigin)
        .filter(Boolean),
    ),
  );

  if (
    inferredBioUrls.length > 1 &&
    bioOrigins.length === 1
  ) {
    const shortestCandidate = [...inferredBioUrls]
      .sort(
        (left, right) =>
          left.length - right.length,
      )[0];

    return {
      inferredUrl: shortestCandidate ?? "",
      sourceType: "MULTIPLE_BIO_URLS_SAME_ORIGIN",
      sourceUrl: uniqueBioUrls.join(" | "),
      confidence: "LOW",
    };
  }

  return {
    inferredUrl: "",
    sourceType: "NONE",
    sourceUrl: [
      ...uniqueContactUrls,
      ...uniqueBioUrls,
    ].join(" | "),
    confidence: "MANUAL",
  };
}

async function main() {
  const programs =
    await prisma.collegeBaseballProgram.findMany({
      where: {
        division: "NCAA_D1",
        OR: [
          {
            baseballWebsiteUrl: null,
          },
          {
            baseballWebsiteUrl: "",
          },
        ],
      },
      include: {
        college: true,
        coaches: {
          orderBy: [
            {
              isHeadCoach: "desc",
            },
            {
              name: "asc",
            },
          ],
        },
      },
      orderBy: {
        college: {
          name: "asc",
        },
      },
    });

  const rows: unknown[][] = [];

  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;
  let manual = 0;

  for (const program of programs) {
    const contactUrls = program.coaches
      .map((coach) => coach.contactUrl ?? "")
      .filter(Boolean);

    const bioUrls = program.coaches
      .map((coach) => coach.bioUrl ?? "")
      .filter(Boolean);

    const result = selectBestCandidate(
      contactUrls,
      bioUrls,
    );

    if (result.confidence === "HIGH") {
      highConfidence += 1;
    } else if (result.confidence === "MEDIUM") {
      mediumConfidence += 1;
    } else if (result.confidence === "LOW") {
      lowConfidence += 1;
    } else {
      manual += 1;
    }

    rows.push([
      program.id,
      program.collegeId,
      program.college.name,
      program.college.slug,
      program.college.city,
      program.college.state,
      program.division,
      program.conference,
      program.coaches.length,
      result.inferredUrl,
      result.sourceType,
      result.confidence,
      result.sourceUrl,
      contactUrls.join(" | "),
      bioUrls.join(" | "),
    ]);
  }

  fs.mkdirSync(OUTPUT_DIRECTORY, {
    recursive: true,
  });

  const outputPath = path.join(
    OUTPUT_DIRECTORY,
    `d1-missing-baseball-url-recovery.${timestamp}.csv`,
  );

  const csv = [
    [
      "programId",
      "collegeId",
      "collegeName",
      "slug",
      "city",
      "state",
      "division",
      "conference",
      "coachCount",
      "inferredBaseballWebsiteUrl",
      "sourceType",
      "confidence",
      "selectedSource",
      "allContactUrls",
      "allBioUrls",
    ],
    ...rows,
  ]
    .map((row) =>
      row.map(csvEscape).join(","),
    )
    .join("\n");

  fs.writeFileSync(
    outputPath,
    `${csv}\n`,
    "utf8",
  );

  console.log("");
  console.log(
    "======================================================",
  );
  console.log(
    "D1 BASEBALL URL RECOVERY AUDIT",
  );
  console.log(
    "======================================================",
  );
  console.log(
    `Missing D1 baseball URLs:       ${programs.length}`,
  );
  console.log(
    `High-confidence recovery:       ${highConfidence}`,
  );
  console.log(
    `Medium-confidence recovery:     ${mediumConfidence}`,
  );
  console.log(
    `Low-confidence recovery:        ${lowConfidence}`,
  );
  console.log(
    `Manual recovery required:       ${manual}`,
  );
  console.log(
    "======================================================",
  );
  console.log(`\nGenerated: ${outputPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });