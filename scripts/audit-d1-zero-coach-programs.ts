// scripts/audit-d1-zero-coach-programs.ts

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

type ZeroCoachProgramRow = {
  programId: string;
  collegeId: string;
  collegeName: string;
  collegeSlug: string;
  city: string;
  state: string;
  conference: string;
  baseballWebsiteUrl: string;
  hasBaseballWebsite: boolean;
  coachCount: number;
};

type DatabaseRow = {
  programId: string;
  collegeId: string;
  collegeName: string;
  collegeSlug: string | null;
  city: string | null;
  state: string | null;
  conference: string | null;
  baseballWebsiteUrl: string | null;
  coachCount: number;
};

function printSection(title: string): void {
  console.log("");
  console.log("=".repeat(100));
  console.log(title);
  console.log("=".repeat(100));
}

function csvEscape(value: unknown): string {
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

function normalizeUrl(
  value: string | null,
): string {
  return value?.trim() ?? "";
}

async function main(): Promise<void> {
  printSection("NCAA D1 ZERO-COACH PROGRAM AUDIT");

  console.log("Mode: READ ONLY");
  console.log("");
  console.log(
    "Finding canonical NCAA_D1 baseball programs with no CollegeBaseballCoach records.",
  );

  const rows = await prisma.$queryRaw<
    DatabaseRow[]
  >`
    SELECT
      program."id" AS "programId",
      college."id" AS "collegeId",
      college."name" AS "collegeName",
      college."slug" AS "collegeSlug",
      college."city" AS "city",
      college."state" AS "state",
      program."conference" AS "conference",
      program."baseballWebsiteUrl" AS "baseballWebsiteUrl",
      COUNT(coach."id")::int AS "coachCount"
    FROM public."CollegeBaseballProgram" program
    JOIN public."College" college
      ON college."id" = program."collegeId"
    LEFT JOIN public."CollegeBaseballCoach" coach
      ON coach."programId" = program."id"
    WHERE program."division" = 'NCAA_D1'
    GROUP BY
      program."id",
      college."id",
      college."name",
      college."slug",
      college."city",
      college."state",
      program."conference",
      program."baseballWebsiteUrl"
    HAVING COUNT(coach."id") = 0
    ORDER BY
      college."name" ASC
  `;

  const auditRows: ZeroCoachProgramRow[] =
    rows.map((row) => {
      const baseballWebsiteUrl =
        normalizeUrl(
          row.baseballWebsiteUrl,
        );

      return {
        programId: row.programId,
        collegeId: row.collegeId,
        collegeName: row.collegeName,
        collegeSlug: row.collegeSlug ?? "",
        city: row.city ?? "",
        state: row.state ?? "",
        conference: row.conference ?? "",
        baseballWebsiteUrl,
        hasBaseballWebsite:
          baseballWebsiteUrl.length > 0,
        coachCount: Number(
          row.coachCount ?? 0,
        ),
      };
    });

  const withWebsite = auditRows.filter(
    (row) => row.hasBaseballWebsite,
  );

  const withoutWebsite = auditRows.filter(
    (row) => !row.hasBaseballWebsite,
  );

  printSection("SUMMARY");

  console.log(
    `D1 programs with zero coaches:       ${auditRows.length}`,
  );

  console.log(
    `Zero-coach programs with website:    ${withWebsite.length}`,
  );

  console.log(
    `Zero-coach programs without website: ${withoutWebsite.length}`,
  );

  printSection(
    "ZERO-COACH PROGRAMS WITH BASEBALL WEBSITE",
  );

  if (withWebsite.length === 0) {
    console.log("(none)");
  } else {
    for (const row of withWebsite) {
      console.log("");
      console.log(row.collegeName);
      console.log(
        `  Program ID: ${row.programId}`,
      );
      console.log(
        `  College ID: ${row.collegeId}`,
      );
      console.log(
        `  Slug:       ${row.collegeSlug}`,
      );
      console.log(
        `  Location:   ${row.city}, ${row.state}`,
      );
      console.log(
        `  Conference: ${row.conference}`,
      );
      console.log(
        `  Website:    ${row.baseballWebsiteUrl}`,
      );
    }
  }

  printSection(
    "ZERO-COACH PROGRAMS WITHOUT BASEBALL WEBSITE",
  );

  if (withoutWebsite.length === 0) {
    console.log("(none)");
  } else {
    for (const row of withoutWebsite) {
      console.log("");
      console.log(row.collegeName);
      console.log(
        `  Program ID: ${row.programId}`,
      );
      console.log(
        `  College ID: ${row.collegeId}`,
      );
      console.log(
        `  Slug:       ${row.collegeSlug}`,
      );
      console.log(
        `  Location:   ${row.city}, ${row.state}`,
      );
      console.log(
        `  Conference: ${row.conference}`,
      );
    }
  }

  const generatedDirectory = path.join(
    process.cwd(),
    "data",
    "enrichment",
    "generated",
  );

  fs.mkdirSync(generatedDirectory, {
    recursive: true,
  });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const outputDirectory = path.join(
    generatedDirectory,
    `d1-zero-coach-audit-${timestamp}`,
  );

  fs.mkdirSync(outputDirectory, {
    recursive: true,
  });

  const completeCsvPath = path.join(
    outputDirectory,
    "d1-zero-coach-programs.csv",
  );

  const withWebsiteCsvPath = path.join(
    outputDirectory,
    "d1-zero-coach-programs-with-website.csv",
  );

  const withoutWebsiteCsvPath = path.join(
    outputDirectory,
    "d1-zero-coach-programs-without-website.csv",
  );

  const headers: Array<
    keyof ZeroCoachProgramRow
  > = [
    "programId",
    "collegeId",
    "collegeName",
    "collegeSlug",
    "city",
    "state",
    "conference",
    "baseballWebsiteUrl",
    "hasBaseballWebsite",
    "coachCount",
  ];

  function writeCsv(
    filePath: string,
    data: ZeroCoachProgramRow[],
  ): void {
    const lines = [
      headers.map(csvEscape).join(","),
      ...data.map((row) =>
        headers
          .map((header) =>
            csvEscape(row[header]),
          )
          .join(","),
      ),
    ];

    fs.writeFileSync(
      filePath,
      `${lines.join("\n")}\n`,
      "utf8",
    );
  }

  writeCsv(
    completeCsvPath,
    auditRows,
  );

  writeCsv(
    withWebsiteCsvPath,
    withWebsite,
  );

  writeCsv(
    withoutWebsiteCsvPath,
    withoutWebsite,
  );

  printSection("OUTPUT");

  console.log("Audit files written to:");
  console.log(outputDirectory);
  console.log("");
  console.log(
    `Complete list:         ${completeCsvPath}`,
  );
  console.log(
    `With website:          ${withWebsiteCsvPath}`,
  );
  console.log(
    `Without website:       ${withoutWebsiteCsvPath}`,
  );
  console.log("");
  console.log(
    "No database records were created, updated, or deleted.",
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "D1 zero-coach audit failed.",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });