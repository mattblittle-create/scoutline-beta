// scripts/import-college-web-presence.ts

import fs from "node:fs";
import path from "node:path";
import {
  CollegeAthleticDivision,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { parse } from "csv-parse/sync";

const prisma =
  new PrismaClient();

const ROOT =
  process.cwd();

const GENERATED_DIR =
  path.join(
    ROOT,
    "data",
    "enrichment",
    "generated",
  );

const ARGS =
  process.argv.slice(2);

const APPLY =
  ARGS.includes("--apply");

const INCLUDE_SECONDARY =
  ARGS.includes(
    "--include-secondary",
  );

const SHOW_HELP =
  ARGS.includes("--help") ||
  ARGS.includes("-h");

type CsvRow =
  Record<string, string>;

type Difference = {
  target:
    | "College"
    | "CollegeBaseballProgram";
  field: string;
  existing: string;
  incoming: string;
};

type ImportPlan = {
  slug: string;
  name: string;
  collegeId: string;
  programId: string;

  collegeData:
    Prisma.CollegeUpdateInput;

  programData:
    Prisma.CollegeBaseballProgramUpdateInput;

  differences: Difference[];
};

type MissingRecord = {
  slug: string;
  name: string;
  reason: string;
};

function getArgumentValue(
  flag: string,
): string | null {
  const index =
    ARGS.indexOf(flag);

  if (
    index === -1 ||
    index >= ARGS.length - 1
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

function printHelp(): void {
  console.log(`
ScoutLine college web-presence import

Usage:
  npx tsx scripts/import-college-web-presence.ts [options]

Safety:
  The importer defaults to DRY RUN.
  Database writes require --apply.

  By default, only high-confidence core fields
  are included.

Core fields:
  College.programWebsiteUrl
  CollegeBaseballProgram.logoUrl
  CollegeBaseballProgram.baseballWebsiteUrl
  CollegeBaseballProgram.rosterUrl
  CollegeBaseballProgram.scheduleUrl
  CollegeBaseballProgram.division
  CollegeBaseballProgram.conference
  CollegeBaseballProgram.dataSourceUrl

Options:
  --csv <path>
      Import a specific generated web-presence CSV.

  --apply
      Apply the planned database updates.

  --include-secondary
      Also include lower-confidence fields such as
      camps, questionnaires, contacts, emails,
      nicknames, and social-media URLs.

  --help, -h
      Show this help message.

Examples:

  Core-only dry run:
  npx tsx scripts/import-college-web-presence.ts --csv "data/enrichment/generated/college-web-presence-2026-07-31T17-43-05-935Z/college-web-presence.generated.csv"

  Core-only apply:
  npx tsx scripts/import-college-web-presence.ts --apply --csv "data/enrichment/generated/college-web-presence-2026-07-31T17-43-05-935Z/college-web-presence.generated.csv"

  Core and secondary dry run:
  npx tsx scripts/import-college-web-presence.ts --include-secondary --csv "data/enrichment/generated/college-web-presence-2026-07-31T17-43-05-935Z/college-web-presence.generated.csv"
`);
}

function resolveCsvPath(
  fileNameOrPath: string,
): string {
  return path.isAbsolute(
    fileNameOrPath,
  )
    ? fileNameOrPath
    : path.resolve(
        ROOT,
        fileNameOrPath,
      );
}

function findLatestGeneratedCsv(): string {
  if (
    !fs.existsSync(
      GENERATED_DIR,
    )
  ) {
    throw new Error(
      `Generated directory not found: ${GENERATED_DIR}`,
    );
  }

  const candidates =
    fs.readdirSync(
      GENERATED_DIR,
      {
        withFileTypes: true,
      },
    )
      .filter(
        (entry) =>
          entry.isDirectory() &&
          entry.name.startsWith(
            "college-web-presence-",
          ),
      )
      .map((entry) => {
        const csvPath =
          path.join(
            GENERATED_DIR,
            entry.name,
            "college-web-presence.generated.csv",
          );

        return {
          csvPath,
          modifiedAt:
            fs.existsSync(csvPath)
              ? fs.statSync(
                  csvPath,
                ).mtimeMs
              : 0,
        };
      })
      .filter(
        (candidate) =>
          candidate.modifiedAt > 0,
      )
      .sort(
        (a, b) =>
          b.modifiedAt -
          a.modifiedAt,
      );

  const latest =
    candidates[0];

  if (!latest) {
    throw new Error(
      "No generated college web-presence CSV was found.",
    );
  }

  return latest.csvPath;
}

function readCsv(
  csvPath: string,
): CsvRow[] {
  if (
    !fs.existsSync(
      csvPath,
    )
  ) {
    throw new Error(
      `CSV not found: ${csvPath}`,
    );
  }

  const raw =
    fs.readFileSync(
      csvPath,
      "utf8",
    );

  return parse(
    raw,
    {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      relax_quotes: true,
      trim: true,
    },
  ) as CsvRow[];
}

function clean(
  value:
    | string
    | null
    | undefined,
): string {
  return String(
    value ?? "",
  )
    .replace(
      /[\u200B-\u200D\u2060\uFEFF]/g,
      "",
    )
    .trim();
}

function incomingValue(
  value:
    | string
    | null
    | undefined,
): string | null {
  const normalized =
    clean(value);

  return normalized
    ? normalized
    : null;
}

function normalizeComparable(
  value:
    | string
    | null
    | undefined,
): string {
  return clean(value)
    .replace(/\s+/g, " ");
}

function normalizeComparableUrl(
  value:
    | string
    | null
    | undefined,
): string {
  const cleaned =
    clean(value);

  if (!cleaned) {
    return "";
  }

  try {
    const url =
      new URL(cleaned);

    url.hash = "";

    const pathname =
      url.pathname === "/"
        ? ""
        : url.pathname.replace(
            /\/+$/,
            "",
          );

    return [
      url.protocol.toLowerCase(),
      "//",
      url.hostname
        .replace(/^www\./i, "")
        .toLowerCase(),
      url.port
        ? `:${url.port}`
        : "",
      pathname,
      url.search,
    ].join("");
  } catch {
    return cleaned
      .replace(/\/+$/, "")
      .toLowerCase();
  }
}

function valuesDiffer(
  existing:
    | string
    | null
    | undefined,
  incoming:
    | string
    | null
    | undefined,
  isUrl = false,
): boolean {
  return isUrl
    ? normalizeComparableUrl(
        existing,
      ) !==
        normalizeComparableUrl(
          incoming,
        )
    : normalizeComparable(
        existing,
      ) !==
        normalizeComparable(
          incoming,
        );
}

function displayValue(
  value:
    | string
    | null
    | undefined,
): string {
  return clean(value) ||
    "(blank)";
}

function planField(
  options: {
    target:
      | "College"
      | "CollegeBaseballProgram";

    field: string;

    existing:
      | string
      | null
      | undefined;

    incoming:
      | string
      | null
      | undefined;

    updateData:
      | Prisma.CollegeUpdateInput
      | Prisma.CollegeBaseballProgramUpdateInput;

    updateField?: string;

    isUrl?: boolean;
  },
  differences: Difference[],
): void {
  const incoming =
    incomingValue(
      options.incoming,
    );

  /*
   * A blank scrape result never erases an
   * existing database value.
   */
  if (!incoming) {
    return;
  }

  if (
    !valuesDiffer(
      options.existing,
      incoming,
      options.isUrl ?? false,
    )
  ) {
    return;
  }

  const updateField =
    options.updateField ??
    options.field;

  (
    options.updateData as
      Record<string, unknown>
  )[updateField] =
    incoming;

  differences.push({
    target:
      options.target,
    field:
      options.field,
    existing:
      displayValue(
        options.existing,
      ),
    incoming,
  });
}

function validateDivision(
  value:
    | string
    | null
    | undefined,
): CollegeAthleticDivision | null {
  const normalized =
    clean(value)
      .toUpperCase();

  const allowed =
    new Set<CollegeAthleticDivision>([
      CollegeAthleticDivision.NCAA_D1,
      CollegeAthleticDivision.NCAA_D2,
      CollegeAthleticDivision.NCAA_D3,
      CollegeAthleticDivision.NAIA,
      CollegeAthleticDivision.NJCAA_D1,
      CollegeAthleticDivision.NJCAA_D2,
      CollegeAthleticDivision.NJCAA_D3,
    ]);

  if (
    !normalized ||
    !allowed.has(
      normalized as
        CollegeAthleticDivision,
    )
  ) {
    return null;
  }

  return normalized as
    CollegeAthleticDivision;
}

function isUsableBaseballWebsiteUrl(
  value:
    | string
    | null
    | undefined,
): boolean {
  const normalized =
    clean(value).toLowerCase();

  if (!normalized) {
    return false;
  }

  const blockedPatterns = [
    /\/news\//,
    /\/article\//,
    /\/coaches?\//,
    /baseball-coaches/,
    /\/splash\.aspx/,
  ];

  return !blockedPatterns.some(
    (pattern) =>
      pattern.test(normalized),
  );
}

function isUsableScheduleUrl(
  value:
    | string
    | null
    | undefined,
): boolean {
  const normalized =
    clean(value).toLowerCase();

  if (!normalized) {
    return false;
  }

  const hasBaseballContext =
    normalized.includes(
      "/sports/baseball/schedule",
    ) ||
    normalized.includes(
      "/baseball/schedule",
    ) ||
    normalized.includes(
      "/sports/bsb/",
    ) ||
    normalized.includes(
      "/sport/m-basebl/",
    ) ||
    normalized.includes(
      "/sports/m-basebl/",
    ) ||
    normalized.includes(
      "schedule.aspx?path=baseball",
    ) ||
    normalized.includes(
      "path=baseball",
    );

  const blockedGenericPages = [
    /\/calendar(?:\?|$)/,
    /\/sports\/schedule\/?$/,
    /\/schedule\/?$/,
  ];

  /*
   * Canonical baseball schedule paths are valid
   * even though they end in "/schedule".
   */
  if (hasBaseballContext) {
    return true;
  }

  return !blockedGenericPages.some(
    (pattern) =>
      pattern.test(normalized),
  ) &&
    (
      normalized.includes(
        "baseball",
      ) ||
      normalized.includes(
        "/bsb",
      ) ||
      normalized.includes(
        "m-basebl",
      )
    );
}

async function createImportPlan(
  rows: CsvRow[],
): Promise<{
  plans: ImportPlan[];
  missingRecords: MissingRecord[];
  invalidRows: number;
  duplicateRows: number;
  unchangedRows: number;
}> {
  const plans:
    ImportPlan[] = [];

  const missingRecords:
    MissingRecord[] = [];

  const seenSlugs =
    new Set<string>();

  let invalidRows = 0;
  let duplicateRows = 0;
  let unchangedRows = 0;

  for (const row of rows) {
    const slug =
      clean(row.slug);

    const name =
      clean(row.name);

    if (!slug) {
      invalidRows += 1;
      continue;
    }

    if (
      seenSlugs.has(slug)
    ) {
      duplicateRows += 1;
      continue;
    }

    seenSlugs.add(slug);

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
      missingRecords.push({
        slug,
        name,
        reason:
          "College not found",
      });

      continue;
    }

    const program =
      college.baseballProgram;

    if (!program) {
      missingRecords.push({
        slug,
        name:
          name ||
          college.name,
        reason:
          "CollegeBaseballProgram not found",
      });

      continue;
    }

    const collegeData:
      Prisma.CollegeUpdateInput =
      {};

    const programData:
      Prisma.CollegeBaseballProgramUpdateInput =
      {};

    const differences:
      Difference[] = [];

    /*
     * Legacy College fields that are still
     * used by existing UI/API surfaces.
     */
planField(
  {
    target:
      "College",
    field:
      "programWebsiteUrl",
    existing:
      college.programWebsiteUrl,
    incoming:
      isUsableBaseballWebsiteUrl(
        row.baseballWebsiteUrl,
      )
        ? row.baseballWebsiteUrl
        : null,
    updateData:
      collegeData,
    isUrl:
      true,
  },
  differences,
);

if (INCLUDE_SECONDARY) {
  planField(
    {
      target:
        "College",
      field:
        "programXUrl",
      existing:
        college.programXUrl,
      incoming:
        row.programXUrl,
      updateData:
        collegeData,
      isUrl:
        true,
    },
    differences,
  );

  planField(
    {
      target:
        "College",
      field:
        "programInstagramUrl",
      existing:
        college.programInstagramUrl,
      incoming:
        row.programInstagramUrl,
      updateData:
        collegeData,
      isUrl:
        true,
    },
    differences,
  );

  planField(
    {
      target:
        "College",
      field:
        "recruitingQuestionnaireUrl",
      existing:
        college.recruitingQuestionnaireUrl,
      incoming:
        row.questionnaireUrl,
      updateData:
        collegeData,
      isUrl:
        true,
    },
    differences,
  );
}

    /*
     * Canonical CollegeBaseballProgram fields.
     */
if (INCLUDE_SECONDARY) {
  planField(
    {
      target:
        "CollegeBaseballProgram",
      field:
        "nickname",
      existing:
        program.nickname,
      incoming:
        row.nickname,
      updateData:
        programData,
    },
    differences,
  );
}

if (INCLUDE_SECONDARY) {
  planField(
    {
      target:
        "CollegeBaseballProgram",
      field:
        "logoUrl",
      existing:
        program.logoUrl,
      incoming:
        row.logoUrl,
      updateData:
        programData,
      isUrl:
        true,
    },
    differences,
  );
}

planField(
  {
    target:
      "CollegeBaseballProgram",
    field:
      "baseballWebsiteUrl",
    existing:
      program.baseballWebsiteUrl,
    incoming:
      isUsableBaseballWebsiteUrl(
        row.baseballWebsiteUrl,
      )
        ? row.baseballWebsiteUrl
        : null,
    updateData:
      programData,
    isUrl:
      true,
  },
  differences,
);

    planField(
      {
        target:
          "CollegeBaseballProgram",
        field:
          "rosterUrl",
        existing:
          program.rosterUrl,
        incoming:
          row.rosterUrl,
        updateData:
          programData,
        isUrl:
          true,
      },
      differences,
    );

planField(
  {
    target:
      "CollegeBaseballProgram",
    field:
      "scheduleUrl",
    existing:
      program.scheduleUrl,
    incoming:
      isUsableScheduleUrl(
        row.scheduleUrl,
      )
        ? row.scheduleUrl
        : null,
    updateData:
      programData,
    isUrl:
      true,
  },
  differences,
);

if (INCLUDE_SECONDARY) {
  planField(
    {
      target:
        "CollegeBaseballProgram",
      field:
        "campsUrl",
      existing:
        program.campsUrl,
      incoming:
        row.campsUrl,
      updateData:
        programData,
      isUrl:
        true,
    },
    differences,
  );

  planField(
    {
      target:
        "CollegeBaseballProgram",
      field:
        "questionnaireUrl",
      existing:
        program.questionnaireUrl,
      incoming:
        row.questionnaireUrl,
      updateData:
        programData,
      isUrl:
        true,
    },
    differences,
  );

  planField(
    {
      target:
        "CollegeBaseballProgram",
      field:
        "generalContactUrl",
      existing:
        program.generalContactUrl,
      incoming:
        row.generalContactUrl,
      updateData:
        programData,
      isUrl:
        true,
    },
    differences,
  );

  planField(
    {
      target:
        "CollegeBaseballProgram",
      field:
        "generalContactEmail",
      existing:
        program.generalContactEmail,
      incoming:
        row.generalContactEmail,
      updateData:
        programData,
    },
    differences,
  );

  planField(
    {
      target:
        "CollegeBaseballProgram",
      field:
        "programXUrl",
      existing:
        program.programXUrl,
      incoming:
        row.programXUrl,
      updateData:
        programData,
      isUrl:
        true,
    },
    differences,
  );

  planField(
    {
      target:
        "CollegeBaseballProgram",
      field:
        "programInstagramUrl",
      existing:
        program.programInstagramUrl,
      incoming:
        row.programInstagramUrl,
      updateData:
        programData,
      isUrl:
        true,
    },
    differences,
  );

  planField(
    {
      target:
        "CollegeBaseballProgram",
      field:
        "programYoutubeUrl",
      existing:
        program.programYoutubeUrl,
      incoming:
        row.programYoutubeUrl,
      updateData:
        programData,
      isUrl:
        true,
    },
    differences,
  );
}

    const incomingDivision =
      validateDivision(
        row.division,
      );

    if (
      incomingDivision &&
      program.division !==
        incomingDivision
    ) {
      programData.division =
        incomingDivision;

      differences.push({
        target:
          "CollegeBaseballProgram",
        field:
          "division",
        existing:
          displayValue(
            program.division,
          ),
        incoming:
          incomingDivision,
      });
    }

    planField(
      {
        target:
          "CollegeBaseballProgram",
        field:
          "conference",
        existing:
          program.conference,
        incoming:
          row.conference,
        updateData:
          programData,
      },
      differences,
    );

if (INCLUDE_SECONDARY) {
  planField(
    {
      target:
        "CollegeBaseballProgram",
      field:
        "dataSourceUrl",
      existing:
        program.dataSourceUrl,
      incoming:
        row.sourceUrl,
      updateData:
        programData,
      isUrl:
        true,
    },
    differences,
  );
}

    /*
     * Deliberately preserved:
     *
     * - verificationStatus
     * - lastVerifiedAt
     *
     * Web-presence discovery does not constitute
     * formal program verification.
     */

    if (
      differences.length === 0
    ) {
      unchangedRows += 1;
      continue;
    }

    plans.push({
      slug,
      name:
        name ||
        college.name,
      collegeId:
        college.id,
      programId:
        program.id,
      collegeData,
      programData,
      differences,
    });
  }

  return {
    plans,
    missingRecords,
    invalidRows,
    duplicateRows,
    unchangedRows,
  };
}

function hasUpdates(
  data: object,
): boolean {
  return (
    Object.keys(data).length > 0
  );
}

function printPlan(
  plans: ImportPlan[],
): void {
  if (!plans.length) {
    return;
  }

  console.log("");
  console.log(
    "RECORDS TO UPDATE",
  );
  console.log(
    "-".repeat(100),
  );

  for (const plan of plans) {
    console.log("");
    console.log(
      `${plan.name} | ${plan.slug}`,
    );

    for (
      const difference
      of plan.differences
    ) {
      console.log(
        `  ${difference.target}.${difference.field}: ${difference.existing} -> ${difference.incoming}`,
      );
    }
  }
}

async function applyPlans(
  plans: ImportPlan[],
): Promise<void> {
  await prisma.$transaction(
    async (transaction) => {
      for (const plan of plans) {
        if (
          hasUpdates(
            plan.collegeData,
          )
        ) {
          await transaction
            .college
            .update({
              where: {
                id:
                  plan.collegeId,
              },
              data:
                plan.collegeData,
            });
        }

        if (
          hasUpdates(
            plan.programData,
          )
        ) {
          await transaction
            .collegeBaseballProgram
            .update({
              where: {
                id:
                  plan.programId,
              },
              data:
                plan.programData,
            });
        }
      }
    },
    {
      maxWait:
        20_000,
      timeout:
        120_000,
    },
  );
}

async function main(): Promise<void> {
  if (SHOW_HELP) {
    printHelp();
    return;
  }

  const csvArgument =
    getArgumentValue(
      "--csv",
    );

  const csvPath =
    csvArgument
      ? resolveCsvPath(
          csvArgument,
        )
      : findLatestGeneratedCsv();

  const rows =
    readCsv(
      csvPath,
    );

  const {
    plans,
    missingRecords,
    invalidRows,
    duplicateRows,
    unchangedRows,
  } =
    await createImportPlan(
      rows,
    );

  const collegeUpdates =
    plans.filter(
      (plan) =>
        hasUpdates(
          plan.collegeData,
        ),
    ).length;

  const programUpdates =
    plans.filter(
      (plan) =>
        hasUpdates(
          plan.programData,
        ),
    ).length;

  const fieldUpdates =
    plans.reduce(
      (
        total,
        plan,
      ) =>
        total +
        plan.differences.length,
      0,
    );

  console.log("");
  console.log(
    "=".repeat(100),
  );
  console.log(
    "COLLEGE WEB-PRESENCE IMPORT",
  );
  console.log(
    "=".repeat(100),
  );
  console.log("");
  console.log(
    `Mode:                       ${
      APPLY
        ? "APPLY"
        : "DRY RUN"
    }`,
  );
  console.log(
  `Fields:                     ${
    INCLUDE_SECONDARY
      ? "CORE + SECONDARY"
      : "CORE ONLY"
  }`,
);
  console.log(
    `CSV:                        ${csvPath}`,
  );
  console.log("");
  console.log(
    `CSV rows:                   ${rows.length}`,
  );
  console.log(
    `Programs planned for update:${String(
      plans.length,
    ).padStart(5)}`,
  );
  console.log(
    `College records updated:    ${String(
      collegeUpdates,
    ).padStart(5)}`,
  );
  console.log(
    `Program records updated:    ${String(
      programUpdates,
    ).padStart(5)}`,
  );
  console.log(
    `Individual field updates:   ${String(
      fieldUpdates,
    ).padStart(5)}`,
  );
  console.log(
    `Unchanged rows:             ${String(
      unchangedRows,
    ).padStart(5)}`,
  );
  console.log(
    `Missing records:            ${String(
      missingRecords.length,
    ).padStart(5)}`,
  );
  console.log(
    `Invalid rows:               ${String(
      invalidRows,
    ).padStart(5)}`,
  );
  console.log(
    `Duplicate CSV rows:         ${String(
      duplicateRows,
    ).padStart(5)}`,
  );
  console.log(
    "=".repeat(100),
  );

  if (
    missingRecords.length > 0
  ) {
    console.log("");
    console.log(
      "MISSING RECORDS",
    );
    console.log(
      "-".repeat(100),
    );

    for (
      const missing
      of missingRecords
    ) {
      console.log(
        `${missing.slug} | ${missing.name || "(unnamed)"} | ${missing.reason}`,
      );
    }
  }

  printPlan(
    plans,
  );

  if (!APPLY) {
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
    invalidRows > 0 ||
    duplicateRows > 0 ||
    missingRecords.length > 0
  ) {
    throw new Error(
      [
        "Apply blocked because the import contains exceptions.",
        `Invalid rows: ${invalidRows}`,
        `Duplicate rows: ${duplicateRows}`,
        `Missing records: ${missingRecords.length}`,
      ].join("\n"),
    );
  }

  await applyPlans(
    plans,
  );

  console.log("");
  console.log(
    "Import applied successfully.",
  );
  console.log(
    "verificationStatus and lastVerifiedAt were preserved.",
  );
}

main()
  .catch(
    (error: unknown) => {
      console.error("");
      console.error(
        "College web-presence import failed.",
      );

      if (
        error instanceof Error
      ) {
        console.error(
          error.message,
        );
        console.error(
          error.stack,
        );
      } else {
        console.error(
          error,
        );
      }

      process.exitCode = 1;
    },
  )
  .finally(
    async () => {
      await prisma.$disconnect();
    },
  );