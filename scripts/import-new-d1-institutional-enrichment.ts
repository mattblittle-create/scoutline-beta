// scripts/import-new-d1-institutional-enrichment.ts

import "dotenv/config";

import fs from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CsvRow = Record<string, string>;

type ComparableValue =
  | string
  | number
  | boolean
  | null;

type FieldChange = {
  field: string;
  before: ComparableValue;
  after: ComparableValue;
};

function parseCsv(
  content: string,
): CsvRow[] {
  const rows: string[][] = [];

  let currentRow: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  const normalized = content
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  for (
    let index = 0;
    index < normalized.length;
    index += 1
  ) {
    const character = normalized[index];
    const nextCharacter =
      normalized[index + 1];

    if (character === '"') {
      if (
        insideQuotes &&
        nextCharacter === '"'
      ) {
        currentValue += '"';
        index += 1;
        continue;
      }

      insideQuotes = !insideQuotes;
      continue;
    }

    if (
      character === "," &&
      !insideQuotes
    ) {
      currentRow.push(
        currentValue.trim(),
      );

      currentValue = "";
      continue;
    }

    if (
      character === "\n" &&
      !insideQuotes
    ) {
      currentRow.push(
        currentValue.trim(),
      );

      const hasContent =
        currentRow.some(
          (value) =>
            value.trim().length > 0,
        );

      if (hasContent) {
        rows.push(currentRow);
      }

      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  if (
    currentValue.length > 0 ||
    currentRow.length > 0
  ) {
    currentRow.push(
      currentValue.trim(),
    );

    const hasContent =
      currentRow.some(
        (value) =>
          value.trim().length > 0,
      );

    if (hasContent) {
      rows.push(currentRow);
    }
  }

  if (insideQuotes) {
    throw new Error(
      "CSV contains an unterminated quoted value.",
    );
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map(
    (header) => header.trim(),
  );

  const duplicateHeaders = headers.filter(
    (header, index) =>
      headers.indexOf(header) !== index,
  );

  if (duplicateHeaders.length > 0) {
    throw new Error(
      `CSV contains duplicate headers: ${Array.from(
        new Set(duplicateHeaders),
      ).join(", ")}`,
    );
  }

  return rows
    .slice(1)
    .map((values, rowIndex) => {
      if (values.length > headers.length) {
        throw new Error(
          `CSV row ${rowIndex + 2} contains ${values.length} values but only ${headers.length} headers.`,
        );
      }

      const row: CsvRow = {};

      for (
        let columnIndex = 0;
        columnIndex < headers.length;
        columnIndex += 1
      ) {
        const header =
          headers[columnIndex];

        if (!header) {
          continue;
        }

        row[header] =
          values[columnIndex] ?? "";
      }

      return row;
    });
}

const EXPECTED_ROW_COUNT = 36;

const APPLY_CHANGES =
  process.argv.includes("--apply");

const INSTITUTIONAL_FIELDS = [
  "city",
  "state",
  "zipCode",
  "region",
  "latitude",
  "longitude",
  "control",
  "websiteUrl",
  "admissionsUrl",
  "academicsUrl",
  "majorsUrl",
  "applicationUrl",
  "financialAidUrl",
  "tuitionInState",
  "tuitionOutOfState",
  "tuitionInternational",
  "tuitionYear",
  "enrollmentTotal",
  "enrollmentUndergrad",
  "acceptanceRate",
  "graduationRate",
  "dataSourceUrl",
  "verificationStatus",
] as const;

function getArgumentValue(
  name: string,
): string | null {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function clean(
  value: unknown,
): string | null {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized.length > 0
    ? normalized
    : null;
}

function toNumber(
  value: unknown,
): number | null {
  const normalized = clean(value);

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function toRate(
  value: unknown,
): number | null {
  const parsed = toNumber(value);

  if (parsed == null) {
    return null;
  }

  return Math.round(parsed * 100) / 100;
}

function toInteger(
  value: unknown,
): number | null {
  const parsed = toNumber(value);

  if (parsed == null) {
    return null;
  }

  return Math.round(parsed);
}

function normalizeZipCode(
  value: unknown,
): string | null {
  return clean(value);
}

function normalizeState(
  value: unknown,
): string | null {
  const normalized = clean(value);

  return normalized
    ? normalized.toUpperCase()
    : null;
}

function normalizeUrl(
  value: unknown,
): string | null {
  return clean(value);
}

function valuesEqual(
  left: unknown,
  right: unknown,
): boolean {
  if (left == null && right == null) {
    return true;
  }

  if (
    typeof left === "number" ||
    typeof right === "number"
  ) {
    const leftNumber =
      left == null ? null : Number(left);

    const rightNumber =
      right == null ? null : Number(right);

    if (
      leftNumber == null ||
      rightNumber == null
    ) {
      return leftNumber === rightNumber;
    }

    return (
      Number.isFinite(leftNumber) &&
      Number.isFinite(rightNumber) &&
      Math.abs(leftNumber - rightNumber) <
        0.0000001
    );
  }

  return String(left) === String(right);
}

function formatValue(
  value: unknown,
): string {
  if (value == null || value === "") {
    return "∅";
  }

  return String(value);
}

function buildInstitutionalData(
  row: CsvRow,
): Record<string, ComparableValue> {
  return {
    city: clean(row.city),
    state: normalizeState(row.state),
    zipCode: normalizeZipCode(row.zipCode),
    region: clean(row.region),
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    control: clean(row.control),

    websiteUrl: normalizeUrl(
      row.websiteUrl,
    ),

    admissionsUrl: normalizeUrl(
      row.admissionsUrl,
    ),

    academicsUrl: normalizeUrl(
      row.academicsUrl,
    ),

    majorsUrl: normalizeUrl(
      row.majorsUrl,
    ),

    applicationUrl: normalizeUrl(
      row.applicationUrl,
    ),

    financialAidUrl: normalizeUrl(
      row.financialAidUrl,
    ),

    tuitionInState: toInteger(
      row.tuitionInState,
    ),

    tuitionOutOfState: toInteger(
      row.tuitionOutOfState,
    ),

    tuitionInternational: toInteger(
      row.tuitionInternational,
    ),

    tuitionYear: toInteger(
      row.tuitionYear,
    ),

    enrollmentTotal: toInteger(
      row.enrollmentTotal,
    ),

    enrollmentUndergrad: toInteger(
      row.enrollmentUndergrad,
    ),

    acceptanceRate: toRate(
      row.acceptanceRate,
    ),

    graduationRate: toRate(
      row.graduationRate,
    ),

    dataSourceUrl: normalizeUrl(
      row.dataSourceUrl,
    ),

    verificationStatus: clean(
      row.verificationStatus,
    ),
  };
}

function removeNullValues(
  data: Record<string, ComparableValue>,
): Record<string, ComparableValue> {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value != null,
    ),
  );
}

function findChanges(
  existing: Record<string, unknown>,
  proposed: Record<string, ComparableValue>,
): FieldChange[] {
  const changes: FieldChange[] = [];

  for (const field of INSTITUTIONAL_FIELDS) {
    const after = proposed[field];

    if (after == null) {
      continue;
    }

    const before =
      (existing[field] as ComparableValue) ??
      null;

    if (!valuesEqual(before, after)) {
      changes.push({
        field,
        before,
        after,
      });
    }
  }

  return changes;
}

async function main(): Promise<void> {
  const fileArgument =
    getArgumentValue("--file");

  if (!fileArgument) {
    throw new Error(
      [
        "Missing required --file argument.",
        "",
        "Example:",
        "npx tsx scripts/import-new-d1-institutional-enrichment.ts --file path/to/new-d1-core-enrichment.csv",
      ].join("\n"),
    );
  }

  const csvPath = path.resolve(
    process.cwd(),
    fileArgument,
  );

  if (!fs.existsSync(csvPath)) {
    throw new Error(
      `CSV file not found: ${csvPath}`,
    );
  }

const rows = parseCsv(
  fs.readFileSync(
    csvPath,
    "utf8",
  ),
);

  console.log("");
  console.log(
    "=".repeat(100),
  );
  console.log(
    "NEW NCAA D1 INSTITUTIONAL ENRICHMENT — DRY RUN",
  );
  console.log(
    "=".repeat(100),
  );
  console.log("");
  console.log(`CSV: ${csvPath}`);
  console.log(`Rows: ${rows.length}`);
  console.log("");

  if (rows.length !== EXPECTED_ROW_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_ROW_COUNT} CSV rows but found ${rows.length}.`,
    );
  }

  const duplicateSlugs = Array.from(
    rows.reduce(
      (
        counts: Map<string, number>,
        row,
      ) => {
        const slug = clean(row.slug);

        if (slug) {
          counts.set(
            slug,
            (counts.get(slug) ?? 0) + 1,
          );
        }

        return counts;
      },
      new Map<string, number>(),
    ),
  )
    .filter(([, count]) => count > 1)
    .map(([slug]) => slug);

  if (duplicateSlugs.length > 0) {
    throw new Error(
      `Duplicate CSV slugs found: ${duplicateSlugs.join(", ")}`,
    );
  }

  let collegesFound = 0;
  let collegesMissing = 0;
  let unchanged = 0;
  let collegesWithChanges = 0;
  let totalFieldChanges = 0;
  let collegesUpdated = 0;

  const missingColleges: string[] = [];

  for (const row of rows) {
    const name =
      clean(row.name) ?? "(unnamed)";

    const slug = clean(row.slug);

    if (!slug) {
      throw new Error(
        `Missing slug for CSV row: ${name}`,
      );
    }

    const matches =
      await prisma.college.findMany({
        where: {
          slug,
        },
        select: {
          id: true,
          name: true,
          slug: true,

          city: true,
          state: true,
          zipCode: true,
          region: true,
          latitude: true,
          longitude: true,
          control: true,

          websiteUrl: true,
          admissionsUrl: true,
          academicsUrl: true,
          majorsUrl: true,
          applicationUrl: true,
          financialAidUrl: true,

          tuitionInState: true,
          tuitionOutOfState: true,
          tuitionInternational: true,
          tuitionYear: true,

          enrollmentTotal: true,
          enrollmentUndergrad: true,
          acceptanceRate: true,
          graduationRate: true,

          dataSourceUrl: true,
          verificationStatus: true,
        },
      });

    if (matches.length === 0) {
      collegesMissing += 1;
      missingColleges.push(
        `${name} (${slug})`,
      );

      console.log(
        `MISSING: ${name} (${slug})`,
      );

      continue;
    }

    if (matches.length > 1) {
      throw new Error(
        `Database contains ${matches.length} colleges with slug "${slug}".`,
      );
    }

    collegesFound += 1;

    const college = matches[0];

    const proposed =
      removeNullValues(
        buildInstitutionalData(row),
      );

    const changes = findChanges(
      college as unknown as Record<
        string,
        unknown
      >,
      proposed,
    );

    if (changes.length === 0) {
      unchanged += 1;

      console.log(
        `UNCHANGED: ${college.name}`,
      );

      continue;
    }

    collegesWithChanges += 1;
    totalFieldChanges += changes.length;

    console.log("");
    console.log(
      `CHANGE: ${college.name}`,
    );

for (const change of changes) {
  console.log(
    `  ${change.field}: ${formatValue(change.before)} -> ${formatValue(change.after)}`,
  );
}

if (APPLY_CHANGES) {
  await prisma.college.update({
    where: {
      id: college.id,
    },
    data: proposed,
  });

  collegesUpdated += 1;

  console.log(
    `  APPLIED: ${changes.length} field change(s)`,
  );
}
  }

  console.log("");
  console.log(
    "-".repeat(100),
  );
  console.log("SUMMARY");
  console.log(
    "-".repeat(100),
  );
  console.log(
    `Colleges found:             ${collegesFound}`,
  );
  console.log(
    `Colleges missing:           ${collegesMissing}`,
  );
  console.log(
    `Colleges with changes:      ${collegesWithChanges}`,
  );
  console.log(
    `Colleges unchanged:         ${unchanged}`,
  );
  console.log(
    `Total field changes:        ${totalFieldChanges}`,
  );
  console.log(
    `Colleges updated:           ${collegesUpdated}`,
  );

  if (missingColleges.length > 0) {
    console.log("");
    console.log("MISSING COLLEGES");

    for (const college of missingColleges) {
      console.log(`- ${college}`);
    }
  }

  console.log("");
if (APPLY_CHANGES) {
  console.log(
    "IMPORT COMPLETE.",
  );
  console.log(
    `${collegesUpdated} ScoutLine college record(s) were updated.`,
  );
  console.log(
    "No college records were created or deleted.",
  );
  console.log(
    "No CollegeBaseballProgram records were modified.",
  );
} else {
  console.log(
    "DRY RUN COMPLETE.",
  );
  console.log(
    "No ScoutLine database records were created, updated, or deleted.",
  );
  console.log("");
  console.log(
    "Run again with --apply to write these institutional changes.",
  );
}

  if (collegesMissing > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });