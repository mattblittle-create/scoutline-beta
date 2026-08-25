// scripts/audit-college-web-presence-import.ts

import fs from "fs";
import path from "path";
import {
  PrismaClient,
} from "@prisma/client";

const prisma =
  new PrismaClient();

const ROOT =
  process.cwd();

const ARGS =
  process.argv.slice(2);

const SHOW_HELP =
  ARGS.includes("--help") ||
  ARGS.includes("-h");

type CsvRow =
  Record<string, string>;

type FieldResult = {
  field: string;
  expected: string | null;
  actual: string | null;
  matches: boolean;
};

type SchoolAudit = {
  slug: string;
  collegeFound: boolean;
  programFound: boolean;
  fields: FieldResult[];
};

function getArgumentValue(
  flag: string,
): string | null {
  const index =
    ARGS.indexOf(flag);

  if (
    index === -1 ||
    index ===
      ARGS.length - 1
  ) {
    return null;
  }

  const value =
    ARGS[index + 1];

  if (
    !value ||
    value.startsWith("--")
  ) {
    return null;
  }

  return value;
}

function printHelp() {
  console.log(`
ScoutLine web-presence import audit

Usage:
  npx tsx scripts/audit-college-web-presence-import.ts --csv <path>

Options:
  --help, -h
      Show this help message.

  --csv <path>
      Generated program-socials CSV to compare against the database.

Example:
  npx tsx scripts/audit-college-web-presence-import.ts --csv "data/enrichment/generated/college-web-presence-2026-07-23T19-42-08-756Z/college-program-socials.generated.csv"

This script is read-only.
It does not create, update, or delete database records.
`);
}

function normalizeValue(
  value:
    | string
    | null
    | undefined,
): string | null {
  const trimmed =
    String(value ?? "")
      .trim();

  return trimmed
    ? trimmed
    : null;
}

function normalizeUrl(
  value:
    | string
    | null
    | undefined,
): string | null {
  const normalized =
    normalizeValue(value);

  if (!normalized) {
    return null;
  }

  return normalized
    .replace(/\/+$/, "")
    .toLowerCase();
}

function valuesMatch(
  expected:
    | string
    | null
    | undefined,
  actual:
    | string
    | null
    | undefined,
  isUrl = false,
): boolean {
  if (isUrl) {
    return (
      normalizeUrl(expected) ===
      normalizeUrl(actual)
    );
  }

  return (
    normalizeValue(expected) ===
    normalizeValue(actual)
  );
}

function parseCsv(
  input: string,
): CsvRow[] {
  const lines: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (
    let index = 0;
    index < input.length;
    index += 1
  ) {
    const char =
      input[index];

    const next =
      input[index + 1];

    if (
      char === '"' &&
      inQuotes &&
      next === '"'
    ) {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes =
        !inQuotes;

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
      (
        char === "\n" ||
        char === "\r"
      ) &&
      !inQuotes
    ) {
      if (
        char === "\r" &&
        next === "\n"
      ) {
        index += 1;
      }

      row.push(field);
      field = "";

      if (
        row.some(
          (value) =>
            value.trim() !== "",
        )
      ) {
        lines.push(row);
      }

      row = [];
      continue;
    }

    field += char;
  }

  if (
    field.length ||
    row.length
  ) {
    row.push(field);

    if (
      row.some(
        (value) =>
          value.trim() !== "",
      )
    ) {
      lines.push(row);
    }
  }

  const [
    headers,
    ...records
  ] = lines;

  if (!headers) {
    return [];
  }

  return records.map(
    (record) => {
      const result:
        CsvRow = {};

      headers.forEach(
        (
          header,
          index,
        ) => {
          result[
            header.trim()
          ] =
            (
              record[index] ??
              ""
            ).trim();
        },
      );

      return result;
    },
  );
}

function readCsv(
  fileNameOrPath: string,
): CsvRow[] {
  const filePath =
    path.isAbsolute(
      fileNameOrPath,
    )
      ? fileNameOrPath
      : path.resolve(
          ROOT,
          fileNameOrPath,
        );

  if (
    !fs.existsSync(
      filePath,
    )
  ) {
    throw new Error(
      `CSV not found: ${filePath}`,
    );
  }

  const raw =
    fs
      .readFileSync(
        filePath,
        "utf8",
      )
      .replace(
        /^\uFEFF/,
        "",
      );

  return parseCsv(raw);
}

function compareField(
  field: string,
  expected:
    | string
    | null
    | undefined,
  actual:
    | string
    | null
    | undefined,
  isUrl = false,
): FieldResult {
  return {
    field,
    expected:
      normalizeValue(
        expected,
      ),
    actual:
      normalizeValue(
        actual,
      ),
    matches:
      valuesMatch(
        expected,
        actual,
        isUrl,
      ),
  };
}

async function auditSchool(
  row: CsvRow,
): Promise<SchoolAudit> {
  const slug =
    normalizeValue(
      row.slug,
    );

  if (!slug) {
    throw new Error(
      "CSV row is missing a slug.",
    );
  }

  const college =
    await prisma.college.findUnique({
      where: {
        slug,
      },
      include: {
        baseballProgram:
          true,
      },
    });

  if (!college) {
    return {
      slug,
      collegeFound:
        false,
      programFound:
        false,
      fields: [],
    };
  }

  const program =
    college.baseballProgram;

  const questionnaireUrl =
    row.questionnaireUrl ||
    row.recruitingQuestionnaireUrl;

  const generalContactUrl =
    row.generalContactUrl ||
    row.recruitsPageUrl;

  const fields:
    FieldResult[] = [
    compareField(
      "college.programWebsiteUrl",
      row.baseballWebsiteUrl,
      college.programWebsiteUrl,
      true,
    ),

    compareField(
      "college.programXUrl",
      row.programXUrl,
      college.programXUrl,
      true,
    ),

    compareField(
      "college.programInstagramUrl",
      row.programInstagramUrl,
      college.programInstagramUrl,
      true,
    ),

    compareField(
      "college.recruitingQuestionnaireUrl",
      questionnaireUrl,
      college.recruitingQuestionnaireUrl,
      true,
    ),
  ];

  if (program) {
    fields.push(
      compareField(
        "program.nickname",
        row.nickname,
        program.nickname,
      ),

      compareField(
        "program.logoUrl",
        row.logoUrl,
        program.logoUrl,
        true,
      ),

      compareField(
        "program.baseballWebsiteUrl",
        row.baseballWebsiteUrl,
        program.baseballWebsiteUrl,
        true,
      ),

      compareField(
        "program.rosterUrl",
        row.rosterUrl,
        program.rosterUrl,
        true,
      ),

      compareField(
        "program.scheduleUrl",
        row.scheduleUrl,
        program.scheduleUrl,
        true,
      ),

      compareField(
        "program.campsUrl",
        row.campsUrl,
        program.campsUrl,
        true,
      ),

      compareField(
        "program.questionnaireUrl",
        questionnaireUrl,
        program.questionnaireUrl,
        true,
      ),

      compareField(
        "program.generalContactUrl",
        generalContactUrl,
        program.generalContactUrl,
        true,
      ),

      compareField(
        "program.generalContactEmail",
        row.generalContactEmail,
        program.generalContactEmail,
      ),

      compareField(
        "program.programXUrl",
        row.programXUrl,
        program.programXUrl,
        true,
      ),

      compareField(
        "program.programInstagramUrl",
        row.programInstagramUrl,
        program.programInstagramUrl,
        true,
      ),

      compareField(
        "program.programYoutubeUrl",
        row.programYoutubeUrl,
        program.programYoutubeUrl,
        true,
      ),

      compareField(
        "program.division",
        row.division,
        program.division,
      ),

      compareField(
        "program.conference",
        row.conference,
        program.conference,
      ),

      compareField(
        "program.dataSourceUrl",
        row.sourceUrl,
        program.dataSourceUrl,
        true,
      ),
    );
  }

  return {
    slug,
    collegeFound:
      true,
    programFound:
      Boolean(program),
    fields,
  };
}

async function main() {
  if (SHOW_HELP) {
    printHelp();
    return;
  }

  const csvPath =
    getArgumentValue(
      "--csv",
    );

  if (!csvPath) {
    throw new Error(
      "Missing required argument: --csv <path>",
    );
  }

  const rows =
    readCsv(csvPath);

  console.log(
    "\n" +
      "=".repeat(100),
  );

  console.log(
    "COLLEGE WEB-PRESENCE IMPORT AUDIT",
  );

  console.log(
    "=".repeat(100),
  );

  console.log(
    `\nCSV rows: ${rows.length}`,
  );

  const audits:
    SchoolAudit[] = [];

  for (const row of rows) {
    const audit =
      await auditSchool(row);

    audits.push(audit);
  }

  const missingColleges =
    audits.filter(
      (audit) =>
        !audit.collegeFound,
    );

  const missingPrograms =
    audits.filter(
      (audit) =>
        audit.collegeFound &&
        !audit.programFound,
    );

  const mismatches =
    audits.flatMap(
      (audit) =>
        audit.fields
          .filter(
            (field) =>
              !field.matches,
          )
          .map(
            (field) => ({
              slug:
                audit.slug,
              ...field,
            }),
          ),
    );

  const matchedFields =
    audits.reduce(
      (
        total,
        audit,
      ) =>
        total +
        audit.fields.filter(
          (field) =>
            field.matches,
        ).length,
      0,
    );

  const comparedFields =
    audits.reduce(
      (
        total,
        audit,
      ) =>
        total +
        audit.fields.length,
      0,
    );

  console.log(
    "\nSUMMARY",
  );

  console.log(
    "-".repeat(100),
  );

  console.log(
    `Schools audited:              ${audits.length}`,
  );

  console.log(
    `Colleges found:               ${
      audits.length -
      missingColleges.length
    }`,
  );

  console.log(
    `Baseball programs found:      ${
      audits.length -
      missingColleges.length -
      missingPrograms.length
    }`,
  );

  console.log(
    `Fields compared:              ${comparedFields}`,
  );

  console.log(
    `Fields matching:              ${matchedFields}`,
  );

  console.log(
    `Field mismatches:             ${mismatches.length}`,
  );

  if (
    missingColleges.length
  ) {
    console.log(
      "\nMISSING COLLEGES",
    );

    console.log(
      "-".repeat(100),
    );

    for (
      const audit
      of missingColleges
    ) {
      console.log(
        audit.slug,
      );
    }
  }

  if (
    missingPrograms.length
  ) {
    console.log(
      "\nMISSING BASEBALL PROGRAMS",
    );

    console.log(
      "-".repeat(100),
    );

    for (
      const audit
      of missingPrograms
    ) {
      console.log(
        audit.slug,
      );
    }
  }

  if (
    mismatches.length
  ) {
    console.log(
      "\nFIELD MISMATCHES",
    );

    console.log(
      "-".repeat(100),
    );

    for (
      const mismatch
      of mismatches
    ) {
      console.log(
        `\n${mismatch.slug}`,
      );

      console.log(
        `  Field:    ${mismatch.field}`,
      );

      console.log(
        `  Expected: ${mismatch.expected ?? "(null)"}`,
      );

      console.log(
        `  Actual:   ${mismatch.actual ?? "(null)"}`,
      );
    }
  }

  if (
    missingColleges.length ===
      0 &&
    missingPrograms.length ===
      0 &&
    mismatches.length ===
      0
  ) {
    console.log(
      "\n✅ All imported web-presence values match the source CSV.",
    );
  } else {
    console.log(
      "\n⚠️ Audit completed with exceptions.",
    );
  }

  console.log(
    "\nAudit complete. No ScoutLine database records were created, updated, or deleted.",
  );
}

main()
  .catch((error) => {
    console.error(
      "\n❌ Audit failed:",
    );

    console.error(
      error,
    );

    process.exitCode = 1;
  })
  .finally(
    async () => {
      await prisma.$disconnect();
    },
  );