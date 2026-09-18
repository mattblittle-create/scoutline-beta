// scripts/audit-d1-coach-run.ts

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GENERATED_DIRECTORY = path.join(
  process.cwd(),
  "data",
  "enrichment",
  "generated",
);

const GENERATED_FILE_PREFIX =
  "college-baseball-coaches.dom.generated.";

function getLatestGeneratedCsv(): string {
  if (!fs.existsSync(GENERATED_DIRECTORY)) {
    throw new Error(
      `Generated enrichment directory does not exist: ${GENERATED_DIRECTORY}`,
    );
  }

  const matchingFiles = fs
    .readdirSync(GENERATED_DIRECTORY)
    .filter(
      (filename) =>
        filename.startsWith(GENERATED_FILE_PREFIX) &&
        filename.endsWith(".csv"),
    )
    .map((filename) => {
      const fullPath = path.join(GENERATED_DIRECTORY, filename);
      const stats = fs.statSync(fullPath);

      return {
        filename,
        fullPath,
        modifiedAt: stats.mtimeMs,
      };
    })
    .sort((a, b) => b.modifiedAt - a.modifiedAt);

  const latestFile = matchingFiles[0];

  if (!latestFile) {
    throw new Error(
      `No generated coach CSV files were found in ${GENERATED_DIRECTORY}`,
    );
  }

  return latestFile.fullPath;
}

/**
 * Reads the first CSV field from a line.
 *
 * The generated file's first column is `slug`. Slugs do not contain commas
 * or line breaks, but this still supports quoted CSV fields and escaped quotes.
 */
function getFirstCsvField(line: string): string {
  const normalizedLine = line.replace(/^\uFEFF/, "");

  if (!normalizedLine.startsWith('"')) {
    return normalizedLine.split(",", 1)[0]?.trim() ?? "";
  }

  let value = "";

  for (let index = 1; index < normalizedLine.length; index += 1) {
    const character = normalizedLine[index];

    if (character !== '"') {
      value += character;
      continue;
    }

    const nextCharacter = normalizedLine[index + 1];

    if (nextCharacter === '"') {
      value += '"';
      index += 1;
      continue;
    }

    break;
  }

  return value.trim();
}

function loadSuccessfulSlugs(csvPath: string): Set<string> {
  const contents = fs.readFileSync(csvPath, "utf8");

  const lines = contents
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error(`CSV is empty: ${csvPath}`);
  }

  const headerSlug = getFirstCsvField(lines[0]);

  if (headerSlug !== "slug") {
    throw new Error(
      `Expected the first CSV column to be "slug", but found "${headerSlug}".`,
    );
  }

  return new Set(
    lines
      .slice(1)
      .map(getFirstCsvField)
      .filter(Boolean),
  );
}

async function main(): Promise<void> {
  console.log("=".repeat(80));
  console.log("D1 BASEBALL COACH RUN AUDIT");
  console.log("=".repeat(80));

  const latestCsvPath = getLatestGeneratedCsv();
  const successfulSlugs = loadSuccessfulSlugs(latestCsvPath);

  const allD1Programs =
    await prisma.collegeBaseballProgram.findMany({
      where: {
        division: "NCAA_D1",
      },

      select: {
        id: true,
        baseballWebsiteUrl: true,

        college: {
          select: {
            name: true,
            slug: true,
          },
        },
      },

      orderBy: {
        college: {
          name: "asc",
        },
      },
    });

  const nullUrlPrograms = allD1Programs.filter(
    (program) => program.baseballWebsiteUrl === null,
  );

  const blankUrlPrograms = allD1Programs.filter(
    (program) =>
      program.baseballWebsiteUrl !== null &&
      program.baseballWebsiteUrl.trim().length === 0,
  );

  // This exactly matches the scraper's current Prisma condition:
  // baseballWebsiteUrl: { not: null }
  const scraperQualifyingPrograms = allD1Programs.filter(
    (program) => program.baseballWebsiteUrl !== null,
  );

  const usableUrlPrograms = allD1Programs.filter(
    (program) =>
      program.baseballWebsiteUrl !== null &&
      program.baseballWebsiteUrl.trim().length > 0,
  );

  const failedPrograms = scraperQualifyingPrograms.filter(
    (program) => !successfulSlugs.has(program.college.slug),
  );

  const successfulQualifyingPrograms =
    scraperQualifyingPrograms.filter((program) =>
      successfulSlugs.has(program.college.slug),
    );

  console.log(`Latest CSV: ${latestCsvPath}`);
  console.log("");

  console.log("INVENTORY");
  console.log("-".repeat(80));
  console.log(
    `All NCAA D1 baseball program records:       ${allD1Programs.length}`,
  );
  console.log(
    `Programs with non-null website URL:         ${scraperQualifyingPrograms.length}`,
  );
  console.log(
    `Programs with usable nonblank website URL:  ${usableUrlPrograms.length}`,
  );
  console.log(
    `Programs with null website URL:             ${nullUrlPrograms.length}`,
  );
  console.log(
    `Programs with blank website URL:            ${blankUrlPrograms.length}`,
  );
  console.log("");

  console.log("LATEST RUN");
  console.log("-".repeat(80));
  console.log(
    `Unique successful slugs in CSV:             ${successfulSlugs.size}`,
  );
  console.log(
    `Qualifying programs found in CSV:           ${successfulQualifyingPrograms.length}`,
  );
  console.log(
    `Qualifying programs missing from CSV:       ${failedPrograms.length}`,
  );
  console.log("");

  if (failedPrograms.length > 0) {
    console.log("FAILED / MISSING PROGRAMS");
    console.log("-".repeat(80));

    for (const program of failedPrograms) {
      console.log(program.college.name);
      console.log(`  slug:       ${program.college.slug}`);
      console.log(`  program ID: ${program.id}`);
      console.log(
        `  URL:        ${program.baseballWebsiteUrl ?? "(null)"}`,
      );
      console.log("");
    }
  }

  if (nullUrlPrograms.length > 0) {
    console.log("D1 PROGRAMS EXCLUDED BECAUSE URL IS NULL");
    console.log("-".repeat(80));

    for (const program of nullUrlPrograms) {
      console.log(
        `${program.college.name} | ${program.college.slug} | ${program.id}`,
      );
    }

    console.log("");
  }

  if (blankUrlPrograms.length > 0) {
    console.log("D1 PROGRAMS WITH BLANK URL VALUES");
    console.log("-".repeat(80));

    for (const program of blankUrlPrograms) {
      console.log(
        `${program.college.name} | ${program.college.slug} | ${program.id}`,
      );
    }

    console.log("");
  }

  console.log("=".repeat(80));
  console.log("AUDIT COMPLETE");
  console.log("=".repeat(80));
}

main()
  .catch((error) => {
    console.error("");
    console.error("Audit failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });