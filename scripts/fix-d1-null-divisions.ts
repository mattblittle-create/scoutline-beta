// scripts/fix-d1-null-divisions.ts

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const EXPECTED_ROW_COUNT = 100;
const TARGET_DIVISION = "NCAA_D1";

type CsvRow = {
  collegeId: string;
  collegeName: string;
  collegeSlug: string;
  city: string;
  state: string;
  legacyDivision: string;
  programId: string;
  programDivision: string;
  collegeConference: string;
  programConference: string;
  collegeProgramWebsiteUrl: string;
  baseballWebsiteUrl: string;
  coachCount: string;
  headCoachCount: string;
};

function clean(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];

      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);

  return values;
}

function parseCsv(filePath: string): CsvRow[] {
  const contents = fs.readFileSync(filePath, "utf8").trim();

  if (!contents) {
    throw new Error(`CSV file is empty: ${filePath}`);
  }

  const lines = contents
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  const headers = parseCsvLine(lines[0]);

  const requiredHeaders = [
    "collegeId",
    "collegeName",
    "collegeSlug",
    "programId",
    "programDivision",
    "coachCount",
    "headCoachCount",
  ];

  for (const requiredHeader of requiredHeaders) {
    if (!headers.includes(requiredHeader)) {
      throw new Error(
        `CSV is missing required header: ${requiredHeader}`,
      );
    }
  }

  return lines.slice(1).map((line, rowIndex) => {
    const values = parseCsvLine(line);

    if (values.length !== headers.length) {
      throw new Error(
        `CSV row ${rowIndex + 2} has ${values.length} values, expected ${headers.length}.`,
      );
    }

    const row = Object.fromEntries(
      headers.map((header, index) => [
        header,
        values[index] ?? "",
      ]),
    );

    return row as CsvRow;
  });
}

function findNewestAuditCsv(): string {
  const generatedDirectory = path.join(
    process.cwd(),
    "data",
    "enrichment",
    "generated",
  );

  if (!fs.existsSync(generatedDirectory)) {
    throw new Error(
      `Generated enrichment directory does not exist: ${generatedDirectory}`,
    );
  }

  const auditDirectories = fs
    .readdirSync(generatedDirectory, {
      withFileTypes: true,
    })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith("d1-inventory-audit-"),
    )
    .map((entry) => ({
      name: entry.name,
      fullPath: path.join(
        generatedDirectory,
        entry.name,
      ),
    }))
    .sort((a, b) => b.name.localeCompare(a.name));

  for (const auditDirectory of auditDirectories) {
    const csvPath = path.join(
      auditDirectory.fullPath,
      "coached-programs-not-canonical-d1.csv",
    );

    if (fs.existsSync(csvPath)) {
      return csvPath;
    }
  }

  throw new Error(
    "Could not find coached-programs-not-canonical-d1.csv in any D1 audit directory.",
  );
}

function getArgumentValue(argumentName: string): string | null {
  const prefix = `${argumentName}=`;

  const matchingArgument = process.argv.find((argument) =>
    argument.startsWith(prefix),
  );

  return matchingArgument
    ? matchingArgument.slice(prefix.length)
    : null;
}

function printSection(title: string): void {
  console.log("");
  console.log("=".repeat(90));
  console.log(title);
  console.log("=".repeat(90));
}

async function main(): Promise<void> {
  const shouldApply = process.argv.includes("--apply");

  const csvArgument = getArgumentValue("--csv");

  const csvPath = csvArgument
    ? path.resolve(process.cwd(), csvArgument)
    : findNewestAuditCsv();

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file does not exist: ${csvPath}`);
  }

  printSection("D1 NULL-DIVISION CORRECTION");

  console.log(`Mode:       ${shouldApply ? "APPLY" : "DRY RUN"}`);
  console.log(`CSV source: ${csvPath}`);

  const rows = parseCsv(csvPath);

  const uniqueProgramIds = new Set(
    rows.map((row) => clean(row.programId)),
  );

  const emptyProgramIds = rows.filter(
    (row) => !clean(row.programId),
  );

  const duplicateProgramIdCount =
    rows.length - uniqueProgramIds.size;

  printSection("CSV VALIDATION");

  console.log(`CSV rows:                 ${rows.length}`);
  console.log(
    `Unique program IDs:       ${uniqueProgramIds.size}`,
  );
  console.log(
    `Empty program IDs:        ${emptyProgramIds.length}`,
  );
  console.log(
    `Duplicate program IDs:    ${duplicateProgramIdCount}`,
  );

  if (rows.length !== EXPECTED_ROW_COUNT) {
    throw new Error(
      `Expected exactly ${EXPECTED_ROW_COUNT} CSV rows, found ${rows.length}.`,
    );
  }

  if (uniqueProgramIds.size !== EXPECTED_ROW_COUNT) {
    throw new Error(
      `Expected exactly ${EXPECTED_ROW_COUNT} unique program IDs, found ${uniqueProgramIds.size}.`,
    );
  }

  if (emptyProgramIds.length > 0) {
    throw new Error(
      `Found ${emptyProgramIds.length} rows with empty program IDs.`,
    );
  }

  const nonBlankCsvDivisions = rows.filter(
    (row) => clean(row.programDivision) !== "",
  );

  if (nonBlankCsvDivisions.length > 0) {
    throw new Error(
      `Expected every CSV programDivision to be blank, but ${nonBlankCsvDivisions.length} rows contain a value.`,
    );
  }

  const programIds = Array.from(uniqueProgramIds);

  const databasePrograms =
    await prisma.collegeBaseballProgram.findMany({
      where: {
        id: {
          in: programIds,
        },
      },
      select: {
        id: true,
        division: true,
        college: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        coaches: {
          select: {
            id: true,
            isHeadCoach: true,
          },
        },
      },
    });

  const databaseProgramsById = new Map(
    databasePrograms.map((program) => [
      program.id,
      program,
    ]),
  );

  const missingPrograms = rows.filter(
    (row) =>
      !databaseProgramsById.has(clean(row.programId)),
  );

  const alreadyCanonicalD1 = databasePrograms.filter(
    (program) => program.division === TARGET_DIVISION,
  );

  const unexpectedDivisionPrograms =
    databasePrograms.filter(
      (program) =>
        program.division !== null &&
        program.division !== TARGET_DIVISION,
    );

  const nullDivisionPrograms =
    databasePrograms.filter(
      (program) => program.division === null,
    );

  const noCoachPrograms = databasePrograms.filter(
    (program) => program.coaches.length === 0,
  );

  const noHeadCoachPrograms = databasePrograms.filter(
    (program) =>
      !program.coaches.some(
        (coach) => coach.isHeadCoach,
      ),
  );

  const identityMismatches = rows.filter((row) => {
    const databaseProgram = databaseProgramsById.get(
      clean(row.programId),
    );

    if (!databaseProgram) {
      return false;
    }

    return (
      clean(row.collegeId) !==
        databaseProgram.college.id ||
      clean(row.collegeSlug) !==
        clean(databaseProgram.college.slug) ||
      clean(row.collegeName) !==
        clean(databaseProgram.college.name)
    );
  });

  printSection("DATABASE VALIDATION");

  console.log(
    `Programs found in database:        ${databasePrograms.length}`,
  );
  console.log(
    `Programs missing from database:     ${missingPrograms.length}`,
  );
  console.log(
    `Programs with null division:        ${nullDivisionPrograms.length}`,
  );
  console.log(
    `Programs already NCAA_D1:           ${alreadyCanonicalD1.length}`,
  );
  console.log(
    `Programs with another division:     ${unexpectedDivisionPrograms.length}`,
  );
  console.log(
    `Programs with zero coaches:         ${noCoachPrograms.length}`,
  );
  console.log(
    `Programs without head coach:        ${noHeadCoachPrograms.length}`,
  );
  console.log(
    `College identity mismatches:        ${identityMismatches.length}`,
  );

  if (databasePrograms.length !== EXPECTED_ROW_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_ROW_COUNT} programs in the database, found ${databasePrograms.length}.`,
    );
  }

  if (missingPrograms.length > 0) {
    throw new Error(
      `${missingPrograms.length} CSV program IDs were not found in the database.`,
    );
  }

  if (unexpectedDivisionPrograms.length > 0) {
    console.log("");
    console.log(
      "Programs with unexpected non-null divisions:",
    );

    for (const program of unexpectedDivisionPrograms) {
      console.log(
        `- ${program.college.name}: ${program.division}`,
      );
    }

    throw new Error(
      "One or more target programs have a non-null division other than NCAA_D1.",
    );
  }

  if (alreadyCanonicalD1.length > 0) {
    console.log("");
    console.log(
      "Programs already classified NCAA_D1:",
    );

    for (const program of alreadyCanonicalD1) {
      console.log(`- ${program.college.name}`);
    }

    throw new Error(
      "One or more target programs are already classified NCAA_D1. Rerun the inventory audit before applying.",
    );
  }

  if (
    nullDivisionPrograms.length !==
    EXPECTED_ROW_COUNT
  ) {
    throw new Error(
      `Expected all ${EXPECTED_ROW_COUNT} target programs to have null divisions, found ${nullDivisionPrograms.length}.`,
    );
  }

  if (noCoachPrograms.length > 0) {
    throw new Error(
      `${noCoachPrograms.length} target programs currently have zero coaches.`,
    );
  }

  if (noHeadCoachPrograms.length > 0) {
    throw new Error(
      `${noHeadCoachPrograms.length} target programs currently have no marked head coach.`,
    );
  }

  if (identityMismatches.length > 0) {
    console.log("");
    console.log("College identity mismatches:");

    for (const row of identityMismatches) {
      const databaseProgram =
        databaseProgramsById.get(
          clean(row.programId),
        );

      console.log(
        `- CSV: ${row.collegeName} (${row.collegeSlug}) | DB: ${databaseProgram?.college.name} (${databaseProgram?.college.slug})`,
      );
    }

    throw new Error(
      "One or more CSV rows do not match the current college identity in the database.",
    );
  }

  printSection("TARGET PROGRAMS");

  for (const program of databasePrograms
    .slice()
    .sort((a, b) =>
      a.college.name.localeCompare(
        b.college.name,
      ),
    )) {
    console.log(
      `${program.college.name.padEnd(50)} NULL -> ${TARGET_DIVISION}`,
    );
  }

  if (!shouldApply) {
    printSection("DRY RUN COMPLETE");

    console.log(
      `${EXPECTED_ROW_COUNT} programs passed validation.`,
    );
    console.log("");
    console.log(
      "No database records were created, updated, or deleted.",
    );
    console.log("");
    console.log(
      "To apply the correction, rerun with:",
    );
    console.log(
      "npx tsx scripts/fix-d1-null-divisions.ts --apply",
    );

    return;
  }

  printSection("APPLYING CORRECTION");

  const result = await prisma.$transaction(
    async (transaction) => {
      const updateResult =
        await transaction.collegeBaseballProgram.updateMany({
          where: {
            id: {
              in: programIds,
            },
            division: null,
          },
          data: {
            division: TARGET_DIVISION,
          },
        });

      if (
        updateResult.count !==
        EXPECTED_ROW_COUNT
      ) {
        throw new Error(
          `Expected to update ${EXPECTED_ROW_COUNT} programs, but Prisma updated ${updateResult.count}. The transaction will be rolled back.`,
        );
      }

      const verificationPrograms =
        await transaction.collegeBaseballProgram.findMany({
          where: {
            id: {
              in: programIds,
            },
          },
          select: {
            id: true,
            division: true,
          },
        });

      const incorrectPrograms =
        verificationPrograms.filter(
          (program) =>
            program.division !== TARGET_DIVISION,
        );

      if (
        verificationPrograms.length !==
          EXPECTED_ROW_COUNT ||
        incorrectPrograms.length > 0
      ) {
        throw new Error(
          "Post-update verification failed. The transaction will be rolled back.",
        );
      }

      return {
        updatedCount: updateResult.count,
        verifiedCount:
          verificationPrograms.length,
      };
    },
  );

  printSection("CORRECTION COMPLETE");

  console.log(
    `Programs updated:  ${result.updatedCount}`,
  );
  console.log(
    `Programs verified: ${result.verifiedCount}`,
  );
  console.log("");
  console.log(
    `All ${EXPECTED_ROW_COUNT} target programs are now classified as ${TARGET_DIVISION}.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "D1 null-division correction failed.",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });