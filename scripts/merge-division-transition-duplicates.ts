// scripts/merge-division-transition-duplicates.ts

import {
  Prisma,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

type TransitionPair = {
  label: string;

  duplicateCollegeId: string;
  duplicateProgramId: string;

  canonicalCollegeId: string;
  canonicalProgramId: string;

  expectedAcademicAreaCount: number;
};

type ForeignKeyReference = {
  source_schema: string;
  source_table: string;
  source_column: string;
  target_schema: string;
  target_table: string;
  target_column: string;
  constraint_name: string;
};

const TRANSITION_PAIRS: TransitionPair[] = [
  {
    label: "Ferrum",

    duplicateCollegeId:
      "cmovorpkb007xqt7gc5w8w0m0",
    duplicateProgramId:
      "cmovorpl1007zqt7g8asm0vw0",

    canonicalCollegeId:
      "cmovlhuck006lqt203i6443rf",
    canonicalProgramId:
      "cmovlhud9006nqt20wc98jm4z",

    expectedAcademicAreaCount: 3,
  },
  {
    label: "Sul Ross State",

    duplicateCollegeId:
      "cmovorxmc00noqt7gwaxaohxc",
    duplicateProgramId:
      "cmovorxn300nqqt7gcyjmb2dg",

    canonicalCollegeId:
      "cmovlhze900h3qt20rprhdg7t",
    canonicalProgramId:
      "cmovlhzex00h5qt20txs4kxrj",

    expectedAcademicAreaCount: 5,
  },
];

function clean(
  value: string | null | undefined,
): string {
  return value?.trim() ?? "";
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function printSection(title: string): void {
  console.log("");
  console.log("=".repeat(100));
  console.log(title);
  console.log("=".repeat(100));
}

async function findForeignKeyReferences(
  transaction: Prisma.TransactionClient,
  targetTable: string,
): Promise<ForeignKeyReference[]> {
  return transaction.$queryRaw<
    ForeignKeyReference[]
  >`
    SELECT
      source_ns.nspname AS source_schema,
      source_table.relname AS source_table,
      source_column.attname AS source_column,
      target_ns.nspname AS target_schema,
      target_table.relname AS target_table,
      target_column.attname AS target_column,
      constraint_record.conname AS constraint_name
    FROM pg_constraint constraint_record
    JOIN pg_class source_table
      ON source_table.oid =
        constraint_record.conrelid
    JOIN pg_namespace source_ns
      ON source_ns.oid =
        source_table.relnamespace
    JOIN pg_class target_table
      ON target_table.oid =
        constraint_record.confrelid
    JOIN pg_namespace target_ns
      ON target_ns.oid =
        target_table.relnamespace
    JOIN LATERAL unnest(
      constraint_record.conkey,
      constraint_record.confkey
    ) WITH ORDINALITY AS key_pairs(
      source_attribute_number,
      target_attribute_number,
      ordinal_position
    )
      ON TRUE
    JOIN pg_attribute source_column
      ON source_column.attrelid =
        source_table.oid
      AND source_column.attnum =
        key_pairs.source_attribute_number
    JOIN pg_attribute target_column
      ON target_column.attrelid =
        target_table.oid
      AND target_column.attnum =
        key_pairs.target_attribute_number
    WHERE constraint_record.contype = 'f'
      AND target_ns.nspname = 'public'
      AND target_table.relname = ${targetTable}
    ORDER BY
      source_ns.nspname,
      source_table.relname,
      source_column.attname
  `;
}

async function countReferenceRows(args: {
  transaction: Prisma.TransactionClient;
  reference: ForeignKeyReference;
  recordId: string;
}): Promise<number> {
  const {
    transaction,
    reference,
    recordId,
  } = args;

  const schema = quoteIdentifier(
    reference.source_schema,
  );

  const table = quoteIdentifier(
    reference.source_table,
  );

  const column = quoteIdentifier(
    reference.source_column,
  );

  const query = `
    SELECT COUNT(*)::int AS "count"
    FROM ${schema}.${table}
    WHERE ${column} = $1
  `;

  const rows =
    await transaction.$queryRawUnsafe<
      Array<{ count: number }>
    >(query, recordId);

  return Number(rows[0]?.count ?? 0);
}

async function getPopulatedReferences(args: {
  transaction: Prisma.TransactionClient;
  references: ForeignKeyReference[];
  recordId: string;
}): Promise<
  Array<
    ForeignKeyReference & {
      count: number;
    }
  >
> {
  const {
    transaction,
    references,
    recordId,
  } = args;

  const populated: Array<
    ForeignKeyReference & {
      count: number;
    }
  > = [];

  for (const reference of references) {
    const count = await countReferenceRows({
      transaction,
      reference,
      recordId,
    });

    if (count > 0) {
      populated.push({
        ...reference,
        count,
      });
    }
  }

  return populated;
}

function formatReferences(
  references: Array<
    ForeignKeyReference & {
      count: number;
    }
  >,
): string {
  if (references.length === 0) {
    return "(none)";
  }

  return references
    .map(
      (reference) =>
        `${reference.source_schema}.${reference.source_table}.${reference.source_column}=${reference.count}`,
    )
    .join(", ");
}

async function countAcademicAreas(args: {
  transaction: Prisma.TransactionClient;
  collegeId: string;
}): Promise<number> {
  const {
    transaction,
    collegeId,
  } = args;

  const rows =
    await transaction.$queryRaw<
      Array<{ count: number }>
    >`
      SELECT COUNT(*)::int AS "count"
      FROM public."CollegeAcademicArea"
      WHERE "collegeId" = ${collegeId}
    `;

  return Number(rows[0]?.count ?? 0);
}

async function moveAcademicAreas(args: {
  transaction: Prisma.TransactionClient;
  duplicateCollegeId: string;
  canonicalCollegeId: string;
}): Promise<number> {
  const {
    transaction,
    duplicateCollegeId,
    canonicalCollegeId,
  } = args;

  const rows =
    await transaction.$queryRaw<
      Array<{ id: string }>
    >`
      UPDATE public."CollegeAcademicArea"
      SET
        "collegeId" = ${canonicalCollegeId},
        "updatedAt" = NOW()
      WHERE "collegeId" = ${duplicateCollegeId}
      RETURNING "id"
    `;

  return rows.length;
}

async function validatePair(args: {
  transaction: Prisma.TransactionClient;
  pair: TransitionPair;
  collegeReferences: ForeignKeyReference[];
  programReferences: ForeignKeyReference[];
}): Promise<{
  duplicateCollegeName: string;
  canonicalCollegeName: string;
  duplicateProgramWebsite: string | null;
  duplicateProgramConference: string | null;
  canonicalProgramWebsite: string | null;
  canonicalProgramConference: string | null;
}> {
  const {
    transaction,
    pair,
    collegeReferences,
    programReferences,
  } = args;

  const duplicateCollege =
    await transaction.college.findUnique({
      where: {
        id: pair.duplicateCollegeId,
      },
      select: {
        id: true,
        name: true,
        baseballProgram: {
          select: {
            id: true,
            division: true,
            conference: true,
            baseballWebsiteUrl: true,
          },
        },
      },
    });

  const canonicalCollege =
    await transaction.college.findUnique({
      where: {
        id: pair.canonicalCollegeId,
      },
      select: {
        id: true,
        name: true,
        baseballProgram: {
          select: {
            id: true,
            division: true,
            conference: true,
            baseballWebsiteUrl: true,
          },
        },
      },
    });

  if (!duplicateCollege) {
    throw new Error(
      `${pair.label}: duplicate College record was not found.`,
    );
  }

  if (!canonicalCollege) {
    throw new Error(
      `${pair.label}: canonical College record was not found.`,
    );
  }

  if (!duplicateCollege.baseballProgram) {
    throw new Error(
      `${pair.label}: duplicate College has no baseball program.`,
    );
  }

  if (!canonicalCollege.baseballProgram) {
    throw new Error(
      `${pair.label}: canonical College has no baseball program.`,
    );
  }

  const duplicateProgram =
    duplicateCollege.baseballProgram;

  const canonicalProgram =
    canonicalCollege.baseballProgram;

  if (
    duplicateProgram.id !==
    pair.duplicateProgramId
  ) {
    throw new Error(
      `${pair.label}: duplicate baseball-program ID does not match the expected record.`,
    );
  }

  if (
    canonicalProgram.id !==
    pair.canonicalProgramId
  ) {
    throw new Error(
      `${pair.label}: canonical baseball-program ID does not match the expected record.`,
    );
  }

  if (
    duplicateProgram.division !==
    "NCAA_D3"
  ) {
    throw new Error(
      `${pair.label}: expected duplicate program to be NCAA_D3, found ${duplicateProgram.division ?? "NULL"}.`,
    );
  }

  if (
    canonicalProgram.division !==
    "NCAA_D2"
  ) {
    throw new Error(
      `${pair.label}: expected canonical program to be NCAA_D2, found ${canonicalProgram.division ?? "NULL"}.`,
    );
  }

  const duplicateAcademicAreaCount =
    await countAcademicAreas({
      transaction,
      collegeId:
        pair.duplicateCollegeId,
    });

  const canonicalAcademicAreaCount =
    await countAcademicAreas({
      transaction,
      collegeId:
        pair.canonicalCollegeId,
    });

  if (
    duplicateAcademicAreaCount !==
    pair.expectedAcademicAreaCount
  ) {
    throw new Error(
      `${pair.label}: expected ${pair.expectedAcademicAreaCount} duplicate academic areas, found ${duplicateAcademicAreaCount}.`,
    );
  }

  if (canonicalAcademicAreaCount !== 0) {
    throw new Error(
      `${pair.label}: canonical College already has ${canonicalAcademicAreaCount} academic-area rows. Automatic migration was stopped to avoid conflicts.`,
    );
  }

  const duplicateCollegeReferences =
    await getPopulatedReferences({
      transaction,
      references: collegeReferences,
      recordId:
        pair.duplicateCollegeId,
    });

  const allowedCollegeReferences =
    duplicateCollegeReferences.filter(
      (reference) => {
        const isAcademicArea =
          reference.source_schema === "public" &&
          reference.source_table ===
            "CollegeAcademicArea" &&
          reference.source_column ===
            "collegeId";

        const isBaseballProgram =
          reference.source_schema === "public" &&
          reference.source_table ===
            "CollegeBaseballProgram" &&
          reference.source_column ===
            "collegeId";

        return (
          isAcademicArea ||
          isBaseballProgram
        );
      },
    );

  if (
    allowedCollegeReferences.length !==
    duplicateCollegeReferences.length
  ) {
    throw new Error(
      `${pair.label}: duplicate College has unexpected references: ${formatReferences(
        duplicateCollegeReferences,
      )}`,
    );
  }

  const academicAreaReference =
    duplicateCollegeReferences.find(
      (reference) =>
        reference.source_table ===
          "CollegeAcademicArea" &&
        reference.source_column ===
          "collegeId",
    );

  if (
    academicAreaReference?.count !==
    pair.expectedAcademicAreaCount
  ) {
    throw new Error(
      `${pair.label}: foreign-key audit found an unexpected CollegeAcademicArea count.`,
    );
  }

  const baseballProgramReference =
    duplicateCollegeReferences.find(
      (reference) =>
        reference.source_table ===
          "CollegeBaseballProgram" &&
        reference.source_column ===
          "collegeId",
    );

  if (
    baseballProgramReference?.count !== 1
  ) {
    throw new Error(
      `${pair.label}: expected exactly one duplicate CollegeBaseballProgram reference.`,
    );
  }

  const duplicateProgramReferences =
    await getPopulatedReferences({
      transaction,
      references: programReferences,
      recordId:
        pair.duplicateProgramId,
    });

  if (
    duplicateProgramReferences.length > 0
  ) {
    throw new Error(
      `${pair.label}: duplicate baseball program has attached records: ${formatReferences(
        duplicateProgramReferences,
      )}`,
    );
  }

  return {
    duplicateCollegeName:
      duplicateCollege.name,
    canonicalCollegeName:
      canonicalCollege.name,

    duplicateProgramWebsite:
      duplicateProgram.baseballWebsiteUrl,

    duplicateProgramConference:
      duplicateProgram.conference,

    canonicalProgramWebsite:
      canonicalProgram.baseballWebsiteUrl,

    canonicalProgramConference:
      canonicalProgram.conference,
  };
}

async function main(): Promise<void> {
  const shouldApply =
    process.argv.includes("--apply");

  printSection(
    "DIVISION-TRANSITION DUPLICATE MERGE",
  );

  console.log(
    `Mode: ${shouldApply ? "APPLY" : "DRY RUN"}`,
  );

  console.log(
    `Transition pairs: ${TRANSITION_PAIRS.length}`,
  );

  console.log("");
  console.log(
    "The current NCAA_D2 records will be preserved.",
  );

  console.log(
    "Academic areas and missing program fields will be migrated from the obsolete NCAA_D3 records.",
  );

  if (TRANSITION_PAIRS.length !== 2) {
    throw new Error(
      `Expected exactly 2 transition pairs, found ${TRANSITION_PAIRS.length}.`,
    );
  }

  const result = await prisma.$transaction(
    async (transaction) => {
      const collegeReferences =
        await findForeignKeyReferences(
          transaction,
          "College",
        );

      const programReferences =
        await findForeignKeyReferences(
          transaction,
          "CollegeBaseballProgram",
        );

      printSection("FOREIGN-KEY DISCOVERY");

      console.log(
        `College foreign keys:                ${collegeReferences.length}`,
      );

      console.log(
        `CollegeBaseballProgram foreign keys: ${programReferences.length}`,
      );

      const validatedPairs: Array<{
        pair: TransitionPair;
        duplicateCollegeName: string;
        canonicalCollegeName: string;
        duplicateProgramWebsite: string | null;
        duplicateProgramConference: string | null;
        canonicalProgramWebsite: string | null;
        canonicalProgramConference: string | null;
      }> = [];

      printSection("VALIDATING PAIRS");

      for (
        const pair of TRANSITION_PAIRS
      ) {
        const validation =
          await validatePair({
            transaction,
            pair,
            collegeReferences,
            programReferences,
          });

        validatedPairs.push({
          pair,
          ...validation,
        });

        console.log(
          `PASS | ${validation.duplicateCollegeName} -> ${validation.canonicalCollegeName}`,
        );

        console.log(
          `       Academic areas to migrate: ${pair.expectedAcademicAreaCount}`,
        );

        console.log(
          `       Website to preserve: ${validation.duplicateProgramWebsite ?? "(none)"}`,
        );

        console.log(
          `       Conference to preserve: ${validation.duplicateProgramConference ?? "(none)"}`,
        );
      }

      if (!shouldApply) {
        return {
          mode: "DRY RUN" as const,
          validatedPairs,
          academicAreasMoved: 0,
          programsDeleted: 0,
          collegesDeleted: 0,
        };
      }

      printSection(
        "MIGRATING AND DELETING",
      );

      let academicAreasMoved = 0;
      let programsDeleted = 0;
      let collegesDeleted = 0;

      for (
        const validated of validatedPairs
      ) {
        const {
          pair,
        } = validated;

        const movedCount =
          await moveAcademicAreas({
            transaction,
            duplicateCollegeId:
              pair.duplicateCollegeId,
            canonicalCollegeId:
              pair.canonicalCollegeId,
          });

        if (
          movedCount !==
          pair.expectedAcademicAreaCount
        ) {
          throw new Error(
            `${pair.label}: expected to migrate ${pair.expectedAcademicAreaCount} academic areas, but migrated ${movedCount}.`,
          );
        }

        academicAreasMoved += movedCount;

        const websiteToKeep =
          clean(
            validated.canonicalProgramWebsite,
          ) ||
          clean(
            validated.duplicateProgramWebsite,
          ) ||
          null;

        const conferenceToKeep =
          clean(
            validated.duplicateProgramConference,
          ) ||
          clean(
            validated.canonicalProgramConference,
          ) ||
          null;

        await transaction
          .collegeBaseballProgram.update({
            where: {
              id: pair.canonicalProgramId,
            },
            data: {
              baseballWebsiteUrl:
                websiteToKeep,
              conference:
                conferenceToKeep,
            },
          });

        const programDeleteResult =
          await transaction
            .collegeBaseballProgram
            .deleteMany({
              where: {
                id: pair.duplicateProgramId,
                collegeId:
                  pair.duplicateCollegeId,
                division: "NCAA_D3",
              },
            });

        if (
          programDeleteResult.count !== 1
        ) {
          throw new Error(
            `${pair.label}: expected to delete one duplicate baseball program, deleted ${programDeleteResult.count}.`,
          );
        }

        programsDeleted +=
          programDeleteResult.count;

        const collegeDeleteResult =
          await transaction.college.deleteMany({
            where: {
              id: pair.duplicateCollegeId,
            },
          });

        if (
          collegeDeleteResult.count !== 1
        ) {
          throw new Error(
            `${pair.label}: expected to delete one duplicate College record, deleted ${collegeDeleteResult.count}.`,
          );
        }

        collegesDeleted +=
          collegeDeleteResult.count;

        console.log(
          `MERGED | ${validated.duplicateCollegeName} -> ${validated.canonicalCollegeName}`,
        );

        console.log(
          `         Academic areas moved: ${movedCount}`,
        );

        console.log(
          `         Baseball website: ${websiteToKeep ?? "(none)"}`,
        );

        console.log(
          `         Conference: ${conferenceToKeep ?? "(none)"}`,
        );
      }

      printSection(
        "POST-MERGE VERIFICATION",
      );

      for (
        const validated of validatedPairs
      ) {
        const {
          pair,
        } = validated;

        const duplicateCollegeCount =
          await transaction.college.count({
            where: {
              id: pair.duplicateCollegeId,
            },
          });

        const duplicateProgramCount =
          await transaction
            .collegeBaseballProgram
            .count({
              where: {
                id: pair.duplicateProgramId,
              },
            });

        const canonicalCollege =
          await transaction.college.findUnique({
            where: {
              id: pair.canonicalCollegeId,
            },
            select: {
              id: true,
              name: true,
              baseballProgram: {
                select: {
                  id: true,
                  division: true,
                  conference: true,
                  baseballWebsiteUrl: true,
                },
              },
            },
          });

        const canonicalAcademicAreaCount =
          await countAcademicAreas({
            transaction,
            collegeId:
              pair.canonicalCollegeId,
          });

        console.log("");
        console.log(
          `${pair.label}:`,
        );

        console.log(
          `  Remaining duplicate colleges: ${duplicateCollegeCount}`,
        );

        console.log(
          `  Remaining duplicate programs: ${duplicateProgramCount}`,
        );

        console.log(
          `  Canonical academic areas:      ${canonicalAcademicAreaCount}`,
        );

        console.log(
          `  Canonical division:            ${canonicalCollege?.baseballProgram?.division ?? "MISSING"}`,
        );

        console.log(
          `  Canonical website:             ${canonicalCollege?.baseballProgram?.baseballWebsiteUrl ?? ""}`,
        );

        console.log(
          `  Canonical conference:          ${canonicalCollege?.baseballProgram?.conference ?? ""}`,
        );

        if (duplicateCollegeCount !== 0) {
          throw new Error(
            `${pair.label}: duplicate College still exists.`,
          );
        }

        if (duplicateProgramCount !== 0) {
          throw new Error(
            `${pair.label}: duplicate baseball program still exists.`,
          );
        }

        if (!canonicalCollege) {
          throw new Error(
            `${pair.label}: canonical College is missing.`,
          );
        }

        if (
          canonicalCollege
            .baseballProgram?.id !==
          pair.canonicalProgramId
        ) {
          throw new Error(
            `${pair.label}: canonical baseball program is missing.`,
          );
        }

        if (
          canonicalCollege
            .baseballProgram.division !==
          "NCAA_D2"
        ) {
          throw new Error(
            `${pair.label}: canonical program is no longer NCAA_D2.`,
          );
        }

        if (
          canonicalAcademicAreaCount !==
          pair.expectedAcademicAreaCount
        ) {
          throw new Error(
            `${pair.label}: expected ${pair.expectedAcademicAreaCount} canonical academic areas after migration, found ${canonicalAcademicAreaCount}.`,
          );
        }
      }

      return {
        mode: "APPLY" as const,
        validatedPairs,
        academicAreasMoved,
        programsDeleted,
        collegesDeleted,
      };
    },
    {
      maxWait: 20_000,
      timeout: 120_000,
    },
  );

  if (result.mode === "DRY RUN") {
    printSection("DRY RUN COMPLETE");

    console.log(
      `Pairs validated: ${result.validatedPairs.length}`,
    );

    console.log(
      `Academic areas ready to migrate: ${result.validatedPairs.reduce(
        (total, item) =>
          total +
          item.pair
            .expectedAcademicAreaCount,
        0,
      )}`,
    );

    console.log("");
    console.log(
      "No database records were created, updated, or deleted.",
    );

    console.log("");
    console.log(
      "To apply the merge, run:",
    );

    console.log(
      "npx tsx scripts/merge-division-transition-duplicates.ts --apply",
    );

    return;
  }

  printSection("MERGE COMPLETE");

  console.log(
    `Academic areas migrated:       ${result.academicAreasMoved}`,
  );

  console.log(
    `Duplicate programs deleted:    ${result.programsDeleted}`,
  );

  console.log(
    `Duplicate colleges deleted:    ${result.collegesDeleted}`,
  );

  console.log(
    `Canonical NCAA_D2 programs kept: ${result.validatedPairs.length}`,
  );

  console.log("");
  console.log(
    "All changes were committed in one database transaction.",
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "Division-transition duplicate merge failed.",
    );

    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });