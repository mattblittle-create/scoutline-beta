// scripts/import-d1-coaches.ts

import fs from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GENERATED_DIRECTORY = path.join(
  process.cwd(),
  "data",
  "enrichment",
  "generated",
);

const GENERATED_FILE_PREFIX =
  "college-baseball-coaches.dom.generated.";

const IMPORT_SOURCE = "DOM_ENRICHMENT";

type CsvCoachRow = {
  slug: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  bioUrl: string;
  contactUrl: string;
  headshotUrl: string;
  xUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  isHeadCoach: string;
  reviewStatus: string;
};

type ParsedCoachRow = {
  slug: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  bioUrl: string | null;
  contactUrl: string | null;
  headshotUrl: string | null;
  xUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  isHeadCoach: boolean;
  reviewStatus: string | null;
  importKey: string;
};

type ImportSummary = {
  csvRows: number;
  programsResolved: number;
  programsMissing: number;
  duplicateCsvRows: number;
  creates: number;
  updates: number;
  unchanged: number;
  reactivations: number;
  deactivations: number;
  manualMatches: number;
  manualConflicts: number;
  skippedInvalid: number;
};

function getArgumentValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

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

function parseCsv(contents: string): string[][] {
  const rows: string[][] = [];

  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  const normalizedContents = contents.replace(/^\uFEFF/, "");

  for (let index = 0; index < normalizedContents.length; index += 1) {
    const character = normalizedContents[index];

    if (insideQuotes) {
      if (character === '"') {
        const nextCharacter = normalizedContents[index + 1];

        if (nextCharacter === '"') {
          currentField += '"';
          index += 1;
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += character;
      }

      continue;
    }

    if (character === '"') {
      insideQuotes = true;
      continue;
    }

    if (character === ",") {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (character === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);

      currentRow = [];
      currentField = "";
      continue;
    }

    if (character !== "\r") {
      currentField += character;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((row) =>
    row.some((field) => field.trim().length > 0),
  );
}

function loadCsvRows(csvPath: string): CsvCoachRow[] {
  const contents = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(contents);

  const header = rows[0];

  if (!header) {
    throw new Error(`CSV is empty: ${csvPath}`);
  }

  const requiredColumns: Array<keyof CsvCoachRow> = [
    "slug",
    "name",
    "title",
    "email",
    "phone",
    "bioUrl",
    "contactUrl",
    "headshotUrl",
    "xUrl",
    "instagramUrl",
    "linkedinUrl",
    "isHeadCoach",
    "reviewStatus",
  ];

  const columnIndexes = new Map<string, number>();

  header.forEach((column, index) => {
    columnIndexes.set(column.trim(), index);
  });

  for (const requiredColumn of requiredColumns) {
    if (!columnIndexes.has(requiredColumn)) {
      throw new Error(
        `Required CSV column is missing: ${requiredColumn}`,
      );
    }
  }

  return rows.slice(1).map((row) => {
    const record = {} as CsvCoachRow;

    for (const column of requiredColumns) {
      const index = columnIndexes.get(column);

      record[column] =
        index === undefined ? "" : row[index]?.trim() ?? "";
    }

    return record;
  });
}

function nullable(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeEmail(value: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function buildImportKey(
  name: string,
  email: string | null,
): string {
  return `${normalizeName(name)}|${normalizeEmail(email)}`;
}

function normalizeComparable(value: string | null): string {
  return value?.trim() ?? "";
}

function normalizePhone(value: string | null): string {
  return value?.replace(/\D/g, "") ?? "";
}

function parseCoachRow(row: CsvCoachRow): ParsedCoachRow | null {
  const slug = row.slug.trim();
  const name = row.name.trim();

  if (!slug || !name) {
    return null;
  }

  const email = nullable(row.email);

  return {
    slug,
    name,
    title: nullable(row.title),
    email,
    phone: nullable(row.phone),
    bioUrl: nullable(row.bioUrl),
    contactUrl: nullable(row.contactUrl),
    headshotUrl: nullable(row.headshotUrl),
    xUrl: nullable(row.xUrl),
    instagramUrl: nullable(row.instagramUrl),
    linkedinUrl: nullable(row.linkedinUrl),
    isHeadCoach: row.isHeadCoach.trim().toLowerCase() === "true",
    reviewStatus: nullable(row.reviewStatus),
    importKey: buildImportKey(name, email),
  };
}

function coachDataMatches(
  existing: {
    name: string;
    title: string | null;
    email: string | null;
    phone: string | null;
    bioUrl: string | null;
    contactUrl: string | null;
    headshotUrl: string | null;
    xUrl: string | null;
    instagramUrl: string | null;
    linkedinUrl: string | null;
    isHeadCoach: boolean;
    reviewStatus: string | null;
    isActive: boolean;
    sourceUrl: string | null;
  },
  incoming: ParsedCoachRow,
): boolean {
  return (
    normalizeName(existing.name) === normalizeName(incoming.name) &&
    normalizeComparable(existing.title) ===
      normalizeComparable(incoming.title) &&
    normalizeEmail(existing.email) ===
      normalizeEmail(incoming.email) &&
    normalizePhone(existing.phone) === normalizePhone(incoming.phone) &&
    normalizeComparable(existing.bioUrl) ===
      normalizeComparable(incoming.bioUrl) &&
    normalizeComparable(existing.contactUrl) ===
      normalizeComparable(incoming.contactUrl) &&
    normalizeComparable(existing.headshotUrl) ===
      normalizeComparable(incoming.headshotUrl) &&
    normalizeComparable(existing.xUrl) ===
      normalizeComparable(incoming.xUrl) &&
    normalizeComparable(existing.instagramUrl) ===
      normalizeComparable(incoming.instagramUrl) &&
    normalizeComparable(existing.linkedinUrl) ===
      normalizeComparable(incoming.linkedinUrl) &&
    existing.isHeadCoach === incoming.isHeadCoach &&
    normalizeComparable(existing.reviewStatus) ===
      normalizeComparable(incoming.reviewStatus) &&
    existing.isActive &&
    normalizeComparable(existing.sourceUrl) ===
      normalizeComparable(incoming.contactUrl)
  );
}

function matchesCoachByName(
  existing: {
    name: string;
  },
  incoming: ParsedCoachRow,
): boolean {
  return normalizeName(existing.name) === normalizeName(incoming.name);
}

async function main(): Promise<void> {
  const applyChanges = hasFlag("--apply");
  const explicitCsvPath = getArgumentValue("--file");

  const csvPath = explicitCsvPath
    ? path.resolve(process.cwd(), explicitCsvPath)
    : getLatestGeneratedCsv();

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file does not exist: ${csvPath}`);
  }

  const rawRows = loadCsvRows(csvPath);

  const parsedRows = rawRows
    .map(parseCoachRow)
    .filter(
      (row): row is ParsedCoachRow => row !== null,
    );

  const summary: ImportSummary = {
    csvRows: rawRows.length,
    programsResolved: 0,
    programsMissing: 0,
    duplicateCsvRows: 0,
    creates: 0,
    updates: 0,
    unchanged: 0,
    reactivations: 0,
    deactivations: 0,
    manualMatches: 0,
    manualConflicts: 0,
    skippedInvalid: rawRows.length - parsedRows.length,
  };

  const programs = await prisma.collegeBaseballProgram.findMany({
    where: {
      division: "NCAA_D1",
    },
    select: {
      id: true,
      college: {
        select: {
          name: true,
          slug: true,
        },
      },
      coaches: {
        select: {
          id: true,
          name: true,
          title: true,
          email: true,
          phone: true,
          bioUrl: true,
          contactUrl: true,
          headshotUrl: true,
          xUrl: true,
          instagramUrl: true,
          linkedinUrl: true,
          isHeadCoach: true,
          importKey: true,
          dataSource: true,
          reviewStatus: true,
          isActive: true,
          lastSeenAt: true,
          sourceUrl: true,
          manuallyVerifiedAt: true,
        },
      },
    },
  });

  const programBySlug = new Map(
    programs.map((program) => [
      program.college.slug,
      program,
    ]),
  );

  const rowsBySlug = new Map<string, ParsedCoachRow[]>();

  for (const row of parsedRows) {
    const existingRows = rowsBySlug.get(row.slug) ?? [];
    existingRows.push(row);
    rowsBySlug.set(row.slug, existingRows);
  }

  const missingProgramSlugs: string[] = [];
  const duplicateCsvRows: Array<{
    slug: string;
    importKey: string;
    name: string;
  }> = [];

  const createActions: Array<{
    programId: string;
    row: ParsedCoachRow;
  }> = [];

const updateActions: Array<{
  coachId: string;
  row: ParsedCoachRow;
  wasInactive: boolean;
  adoptLegacyRecord: boolean;
}> = [];

  const deactivateActions: Array<{
    coachId: string;
    programName: string;
    coachName: string;
  }> = [];

  const manualConflicts: Array<{
    programName: string;
    incomingName: string;
    existingName: string;
    existingEmail: string | null;
    incomingEmail: string | null;
  }> = [];

  const runTimestamp = new Date();

  for (const [slug, programRows] of rowsBySlug) {
    const program = programBySlug.get(slug);

    if (!program) {
      summary.programsMissing += 1;
      missingProgramSlugs.push(slug);
      continue;
    }

    summary.programsResolved += 1;

    const seenImportKeys = new Set<string>();
    const validProgramRows: ParsedCoachRow[] = [];

    for (const row of programRows) {
      if (seenImportKeys.has(row.importKey)) {
        summary.duplicateCsvRows += 1;
        duplicateCsvRows.push({
          slug,
          importKey: row.importKey,
          name: row.name,
        });
        continue;
      }

      seenImportKeys.add(row.importKey);
      validProgramRows.push(row);
    }

const importedCoaches = program.coaches.filter(
  (coach) => coach.dataSource === IMPORT_SOURCE,
);

const protectedCoaches = program.coaches.filter(
  (coach) => coach.manuallyVerifiedAt !== null,
);

const legacyCoaches = program.coaches.filter(
  (coach) =>
    coach.dataSource !== IMPORT_SOURCE &&
    coach.manuallyVerifiedAt === null,
);

    const importedByKey = new Map(
      importedCoaches
        .filter((coach) => coach.importKey)
        .map((coach) => [coach.importKey as string, coach]),
    );

    for (const row of validProgramRows) {
      const existingImported = importedByKey.get(row.importKey);

      if (existingImported) {
        if (coachDataMatches(existingImported, row)) {
          summary.unchanged += 1;
        } else {
          summary.updates += 1;

          if (!existingImported.isActive) {
            summary.reactivations += 1;
          }

updateActions.push({
  coachId: existingImported.id,
  row,
  wasInactive: !existingImported.isActive,
  adoptLegacyRecord: false,
});
        }

        continue;
      }

const protectedMatch = protectedCoaches.find((coach) =>
  matchesCoachByName(coach, row),
);

if (protectedMatch) {
  summary.manualMatches += 1;

  const protectedRecordMatches = coachDataMatches(
    protectedMatch,
    row,
  );

  if (!protectedRecordMatches) {
    summary.manualConflicts += 1;

    manualConflicts.push({
      programName: program.college.name,
      incomingName: row.name,
      existingName: protectedMatch.name,
      existingEmail: protectedMatch.email,
      incomingEmail: row.email,
    });
  }

  continue;
}

const legacyMatch = legacyCoaches.find((coach) =>
  matchesCoachByName(coach, row),
);

if (legacyMatch) {
  summary.updates += 1;

  if (!legacyMatch.isActive) {
    summary.reactivations += 1;
  }

  updateActions.push({
    coachId: legacyMatch.id,
    row,
    wasInactive: !legacyMatch.isActive,
    adoptLegacyRecord: true,
  });

  continue;
}

summary.creates += 1;

createActions.push({
  programId: program.id,
  row,
});
    }

    const currentImportKeys = new Set(
      validProgramRows.map((row) => row.importKey),
    );

    const currentNames = new Set(
  validProgramRows.map((row) => normalizeName(row.name)),
);

    for (const coach of importedCoaches) {
      if (
        coach.manuallyVerifiedAt === null &&
        coach.importKey &&
        coach.isActive &&
        !currentImportKeys.has(coach.importKey)
      ) {
        summary.deactivations += 1;

        deactivateActions.push({
          coachId: coach.id,
          programName: program.college.name,
          coachName: coach.name,
        });
      }
    }
  }

  console.log("=".repeat(80));
  console.log("D1 BASEBALL COACH IMPORT");
  console.log("=".repeat(80));
  console.log(`Mode:                     ${applyChanges ? "APPLY" : "DRY RUN"}`);
  console.log(`CSV:                      ${csvPath}`);
  console.log("");
  console.log(`CSV rows:                 ${summary.csvRows}`);
  console.log(`Programs resolved:        ${summary.programsResolved}`);
  console.log(`Programs missing:         ${summary.programsMissing}`);
  console.log(`Invalid rows skipped:     ${summary.skippedInvalid}`);
  console.log(`Duplicate CSV rows:       ${summary.duplicateCsvRows}`);
  console.log("");
  console.log(`Creates:                  ${summary.creates}`);
  console.log(`Updates:                  ${summary.updates}`);
  console.log(`Unchanged:                ${summary.unchanged}`);
  console.log(`Reactivations:            ${summary.reactivations}`);
  console.log(`Deactivations:            ${summary.deactivations}`);
  console.log(`Protected manual matches: ${summary.manualMatches}`);
  console.log(`Manual conflicts:         ${summary.manualConflicts}`);
  console.log("=".repeat(80));

  if (missingProgramSlugs.length > 0) {
    console.log("");
    console.log("MISSING PROGRAM SLUGS");
    console.log("-".repeat(80));

    for (const slug of missingProgramSlugs) {
      console.log(slug);
    }
  }

  if (duplicateCsvRows.length > 0) {
    console.log("");
    console.log("DUPLICATE CSV ROWS");
    console.log("-".repeat(80));

    for (const duplicate of duplicateCsvRows) {
      console.log(
        `${duplicate.slug} | ${duplicate.name} | ${duplicate.importKey}`,
      );
    }
  }

  if (manualConflicts.length > 0) {
    console.log("");
    console.log("MANUAL RECORD CONFLICTS");
    console.log("-".repeat(80));

    for (const conflict of manualConflicts) {
      console.log(conflict.programName);
      console.log(
        `  Existing: ${conflict.existingName} | ${conflict.existingEmail ?? "(no email)"}`,
      );
      console.log(
        `  Incoming: ${conflict.incomingName} | ${conflict.incomingEmail ?? "(no email)"}`,
      );
      console.log("");
    }
  }

  if (!applyChanges) {
    console.log("");
    console.log(
      "Dry run complete. No database changes were made.",
    );
    console.log(
      "Run again with --apply only after reviewing this summary.",
    );
    return;
  }

  if (
    summary.programsMissing > 0 ||
    summary.skippedInvalid > 0 ||
    summary.duplicateCsvRows > 0 ||
    summary.manualConflicts > 0
  ) {
    throw new Error(
      "Import blocked because validation or conflict issues remain.",
    );
  }

  await prisma.$transaction(
    async (transaction) => {
      for (const action of createActions) {
        await transaction.collegeBaseballCoach.create({
          data: {
            programId: action.programId,
            name: action.row.name,
            title: action.row.title,
            email: action.row.email,
            phone: action.row.phone,
            bioUrl: action.row.bioUrl,
            contactUrl: action.row.contactUrl,
            headshotUrl: action.row.headshotUrl,
            xUrl: action.row.xUrl,
            instagramUrl: action.row.instagramUrl,
            linkedinUrl: action.row.linkedinUrl,
            isHeadCoach: action.row.isHeadCoach,
            importKey: action.row.importKey,
            dataSource: IMPORT_SOURCE,
            reviewStatus: action.row.reviewStatus,
            isActive: true,
            lastSeenAt: runTimestamp,
            sourceUrl: action.row.contactUrl,
          },
        });
      }

for (const action of updateActions) {
  await transaction.collegeBaseballCoach.update({
    where: {
      id: action.coachId,
    },
    data: {
      name: action.row.name,
      title: action.row.title,
      email: action.row.email,
      phone: action.row.phone,
      bioUrl: action.row.bioUrl,
      contactUrl: action.row.contactUrl,
      headshotUrl: action.row.headshotUrl,
      xUrl: action.row.xUrl,
      instagramUrl: action.row.instagramUrl,
      linkedinUrl: action.row.linkedinUrl,
      isHeadCoach: action.row.isHeadCoach,

      importKey: action.row.importKey,
      dataSource: IMPORT_SOURCE,
      reviewStatus: action.row.reviewStatus,
      isActive: true,
      lastSeenAt: runTimestamp,
      sourceUrl: action.row.contactUrl,
    },
  });
}

      for (const action of deactivateActions) {
        await transaction.collegeBaseballCoach.update({
          where: {
            id: action.coachId,
          },
          data: {
            isActive: false,
          },
        });
      }
    },
    {
      maxWait: 10_000,
      timeout: 120_000,
      isolationLevel:
        Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  console.log("");
  console.log("Import applied successfully.");
}

main()
  .catch((error) => {
    console.error("");
    console.error("Import failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });