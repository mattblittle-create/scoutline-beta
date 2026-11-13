// scripts/merge-confirmed-college-duplicates.ts

import {
  Prisma,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

type DuplicatePair = {
  label: string;
  duplicateCollegeId: string;
  canonicalCollegeId: string;
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

type ReferenceCount = ForeignKeyReference & {
  count: number;
};

const DUPLICATE_PAIRS: DuplicatePair[] = [
  {
    label: "Anderson",
    duplicateCollegeId: "cmovlhrdv000fqt20fc4cz94u",
    canonicalCollegeId: "cmorjaspu0043qt4w1kqv72qo",
  },
  {
    label: "Barton",
    duplicateCollegeId: "cmovlhrv3001fqt20zotlkdgo",
    canonicalCollegeId: "cmorjasv6004fqt4wjb7nrzah",
  },
  {
    label: "Belmont Abbey",
    duplicateCollegeId: "cmovlhrwi001iqt205ckj8ztr",
    canonicalCollegeId: "cmorj0gse002iqtiog740vnk9",
  },
  {
    label: "Bryan",
    duplicateCollegeId: "cmowzrz8k0010qt4wjdckub80",
    canonicalCollegeId: "cmorj0ha0003iqtion1ocego7",
  },
  {
    label: "Carson-Newman",
    duplicateCollegeId: "cmovlhsn50033qt2045onupu0",
    canonicalCollegeId: "cmorjat1z004uqt4wcy4dc9a9",
  },
  {
    label: "Catawba",
    duplicateCollegeId: "cmovlhsoi0036qt20a0hkubod",
    canonicalCollegeId: "cmorj0gws002rqtiorgfzda9h",
  },
  {
    label: "Coker",
    duplicateCollegeId: "cmovlhtk1004xqt20njtti1j5",
    canonicalCollegeId: "cmorj0go50029qtiomu7nhxok",
  },
  {
    label: "Emory & Henry",
    duplicateCollegeId: "cmovlhu5k0066qt20yvdrbs5z",
    canonicalCollegeId: "cmorj0hct003oqtioizpyiqxx",
  },
  {
    label: "Erskine",
    duplicateCollegeId: "cmovlhu8d006cqt20t8ma9i8s",
    canonicalCollegeId: "cmorj0gr0002fqtioji2wprxy",
  },
  {
    label: "Francis Marion",
    duplicateCollegeId: "cmovlhul10073qt20e1oaptq8",
    canonicalCollegeId: "cmorj0gpl002cqtiopcsyaeuv",
  },
  {
    label: "Georgia Gwinnett",
    duplicateCollegeId: "cmox0660w004oqtgccsrumrzc",
    canonicalCollegeId: "cmorj0h8n003fqtio2cfy431r",
  },
  {
    label: "Lander",
    duplicateCollegeId: "cmovlhvk60096qt20jf3rktz0",
    canonicalCollegeId: "cmorj0gmq0026qtiozjrz5w2n",
  },
  {
    label: "Lenoir-Rhyne",
    duplicateCollegeId: "cmovlhvrc009lqt20xsm15etg",
    canonicalCollegeId: "cmorjasxz004lqt4w7epq8iye",
  },
  {
    label: "Lincoln Memorial",
    duplicateCollegeId: "cmovlhvx5009xqt20xmn7sbfi",
    canonicalCollegeId: "cmorjat3a004xqt4wle1hjyyv",
  },
  {
    label: "Mars Hill",
    duplicateCollegeId: "cmovlhw6900afqt208i77fkyq",
    canonicalCollegeId: "cmorjaszb004oqt4wby4beihf",
  },
  {
    label: "Mount Olive",
    duplicateCollegeId: "cmovlhx4100c9qt20kqipia3l",
    canonicalCollegeId: "cmorj0gyc002uqtiog9sy3cgd",
  },
  {
    label: "Newberry",
    duplicateCollegeId: "cmovlhx6z00cfqt20ae1fwoz2",
    canonicalCollegeId: "cmorjasr50046qt4wpnm8sum8",
  },
  {
    label: "North Greenville",
    duplicateCollegeId: "cmovlhxb700coqt20ixz4ht1r",
    canonicalCollegeId: "cmorj0gl80023qtiowcp5onup",
  },
  {
    label: "Reinhardt",
    duplicateCollegeId: "cmowzs1o3005uqt4wpekfzkhk",
    canonicalCollegeId: "cmorj0h79003cqtioydx0o97u",
  },
  {
    label: "Southern Wesleyan",
    duplicateCollegeId: "cmovlhz5u00glqt20q1q4sk69",
    canonicalCollegeId: "cmorjasts004cqt4w6w7jai0o",
  },
  {
    label: "Tennessee Wesleyan",
    duplicateCollegeId: "cmox069px00cuqtgcav6r1c9b",
    canonicalCollegeId: "cmorj0hbg003lqtio2flk2ko3",
  },
  {
    label: "Tusculum",
    duplicateCollegeId: "cmovlhznz00hoqt20smgedllb",
    canonicalCollegeId: "cmorjat4k0050qt4wuinkw7vf",
  },
  {
    label: "Wingate",
    duplicateCollegeId: "cmovli0wd00kcqt20cgeygf4d",
    canonicalCollegeId: "cmorj0gva002oqtiogdc4aysl",
  },
];

function clean(value: string | null | undefined): string {
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
  return transaction.$queryRaw<ForeignKeyReference[]>`
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
      ON source_table.oid = constraint_record.conrelid
    JOIN pg_namespace source_ns
      ON source_ns.oid = source_table.relnamespace
    JOIN pg_class target_table
      ON target_table.oid = constraint_record.confrelid
    JOIN pg_namespace target_ns
      ON target_ns.oid = target_table.relnamespace
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
      ON source_column.attrelid = source_table.oid
      AND source_column.attnum =
        key_pairs.source_attribute_number
    JOIN pg_attribute target_column
      ON target_column.attrelid = target_table.oid
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

async function getReferenceCounts(args: {
  transaction: Prisma.TransactionClient;
  references: ForeignKeyReference[];
  recordId: string;
}): Promise<ReferenceCount[]> {
  const {
    transaction,
    references,
    recordId,
  } = args;

  const counts: ReferenceCount[] = [];

  for (const reference of references) {
    const count = await countReferenceRows({
      transaction,
      reference,
      recordId,
    });

    counts.push({
      ...reference,
      count,
    });
  }

  return counts;
}

function formatReferences(
  references: ReferenceCount[],
): string {
  const populated = references.filter(
    (reference) => reference.count > 0,
  );

  if (populated.length === 0) {
    return "(none)";
  }

  return populated
    .map(
      (reference) =>
        `${reference.source_schema}.${reference.source_table}.${reference.source_column}=${reference.count}`,
    )
    .join(", ");
}

async function validatePair(args: {
  transaction: Prisma.TransactionClient;
  pair: DuplicatePair;
  collegeReferences: ForeignKeyReference[];
  programReferences: ForeignKeyReference[];
}): Promise<{
  duplicateCollegeName: string;
  canonicalCollegeName: string;
  duplicateProgramId: string;
  canonicalProgramId: string;
}> {
  const {
    transaction,
    pair,
    collegeReferences,
    programReferences,
  } = args;

  const duplicate =
    await transaction.college.findUnique({
      where: {
        id: pair.duplicateCollegeId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
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

  const canonical =
    await transaction.college.findUnique({
      where: {
        id: pair.canonicalCollegeId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
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

  if (!duplicate) {
    throw new Error(
      `${pair.label}: duplicate College record ${pair.duplicateCollegeId} was not found.`,
    );
  }

  if (!canonical) {
    throw new Error(
      `${pair.label}: canonical College record ${pair.canonicalCollegeId} was not found.`,
    );
  }

  if (duplicate.id === canonical.id) {
    throw new Error(
      `${pair.label}: duplicate and canonical College IDs are identical.`,
    );
  }

  if (!duplicate.baseballProgram) {
    throw new Error(
      `${pair.label}: duplicate college ${duplicate.name} has no baseball program.`,
    );
  }

  if (!canonical.baseballProgram) {
    throw new Error(
      `${pair.label}: canonical college ${canonical.name} has no baseball program.`,
    );
  }

  const duplicateProgram =
    duplicate.baseballProgram;

  const collegeReferenceCounts =
    await getReferenceCounts({
      transaction,
      references: collegeReferences,
      recordId: duplicate.id,
    });

  const programReferenceCounts =
    await getReferenceCounts({
      transaction,
      references: programReferences,
      recordId: duplicateProgram.id,
    });

  const unexpectedCollegeReferences =
    collegeReferenceCounts.filter(
      (reference) => {
        const isOwnBaseballProgram =
          reference.source_schema === "public" &&
          reference.source_table ===
            "CollegeBaseballProgram" &&
          reference.source_column === "collegeId";

        if (isOwnBaseballProgram) {
          return reference.count !== 1;
        }

        return reference.count !== 0;
      },
    );

  if (unexpectedCollegeReferences.length > 0) {
    throw new Error(
      `${pair.label}: duplicate College has unexpected references: ${formatReferences(
        collegeReferenceCounts,
      )}`,
    );
  }

  const unexpectedProgramReferences =
    programReferenceCounts.filter(
      (reference) => reference.count !== 0,
    );

  if (unexpectedProgramReferences.length > 0) {
    throw new Error(
      `${pair.label}: duplicate CollegeBaseballProgram has unexpected references: ${formatReferences(
        programReferenceCounts,
      )}`,
    );
  }

  if (
    clean(duplicateProgram.baseballWebsiteUrl) &&
    !clean(
      canonical.baseballProgram.baseballWebsiteUrl,
    )
  ) {
    throw new Error(
      `${pair.label}: duplicate program has a baseball website but canonical program does not. Manual field preservation is required.`,
    );
  }

  if (
    clean(duplicateProgram.conference) &&
    !clean(canonical.baseballProgram.conference)
  ) {
    throw new Error(
      `${pair.label}: duplicate program has a conference but canonical program does not. Manual field preservation is required.`,
    );
  }

  if (
    clean(duplicateProgram.division) &&
    !clean(canonical.baseballProgram.division)
  ) {
    throw new Error(
      `${pair.label}: duplicate program has a division but canonical program does not. Manual field preservation is required.`,
    );
  }

  return {
    duplicateCollegeName: duplicate.name,
    canonicalCollegeName: canonical.name,
    duplicateProgramId: duplicateProgram.id,
    canonicalProgramId:
      canonical.baseballProgram.id,
  };
}

async function main(): Promise<void> {
  const shouldApply =
    process.argv.includes("--apply");

  printSection(
    "CONFIRMED COLLEGE DUPLICATE MERGE",
  );

  console.log(
    `Mode: ${shouldApply ? "APPLY" : "DRY RUN"}`,
  );
  console.log(
    `Confirmed duplicate pairs: ${DUPLICATE_PAIRS.length}`,
  );
  console.log("");
  console.log(
    "Canonical college and baseball-program records will be preserved.",
  );
  console.log(
    "Only validated empty duplicate programs and colleges are eligible for deletion.",
  );

  if (DUPLICATE_PAIRS.length !== 23) {
    throw new Error(
      `Expected exactly 23 duplicate pairs, but found ${DUPLICATE_PAIRS.length}.`,
    );
  }

  const duplicateCollegeIds =
    DUPLICATE_PAIRS.map(
      (pair) => pair.duplicateCollegeId,
    );

  const canonicalCollegeIds =
    DUPLICATE_PAIRS.map(
      (pair) => pair.canonicalCollegeId,
    );

  if (
    new Set(duplicateCollegeIds).size !==
    DUPLICATE_PAIRS.length
  ) {
    throw new Error(
      "Duplicate College IDs are not unique.",
    );
  }

  if (
    new Set(canonicalCollegeIds).size !==
    DUPLICATE_PAIRS.length
  ) {
    throw new Error(
      "Canonical College IDs are not unique.",
    );
  }

  const overlappingIds =
    duplicateCollegeIds.filter((id) =>
      canonicalCollegeIds.includes(id),
    );

  if (overlappingIds.length > 0) {
    throw new Error(
      `Some College IDs appear as both duplicate and canonical: ${overlappingIds.join(
        ", ",
      )}`,
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
        pair: DuplicatePair;
        duplicateCollegeName: string;
        canonicalCollegeName: string;
        duplicateProgramId: string;
        canonicalProgramId: string;
      }> = [];

      printSection("VALIDATING PAIRS");

      for (const pair of DUPLICATE_PAIRS) {
        const validation = await validatePair({
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
      }

      if (!shouldApply) {
        return {
          mode: "DRY RUN" as const,
          validatedPairs,
          deletedProgramCount: 0,
          deletedCollegeCount: 0,
        };
      }

      printSection("DELETING DUPLICATES");

      let deletedProgramCount = 0;
      let deletedCollegeCount = 0;

      for (const validated of validatedPairs) {
        const programDeleteResult =
          await transaction.collegeBaseballProgram.deleteMany({
            where: {
              id: validated.duplicateProgramId,
              collegeId:
                validated.pair.duplicateCollegeId,
            },
          });

        if (programDeleteResult.count !== 1) {
          throw new Error(
            `${validated.pair.label}: expected to delete exactly one duplicate baseball program, but deleted ${programDeleteResult.count}.`,
          );
        }

        deletedProgramCount +=
          programDeleteResult.count;

        const collegeDeleteResult =
          await transaction.college.deleteMany({
            where: {
              id: validated.pair.duplicateCollegeId,
            },
          });

        if (collegeDeleteResult.count !== 1) {
          throw new Error(
            `${validated.pair.label}: expected to delete exactly one duplicate college, but deleted ${collegeDeleteResult.count}.`,
          );
        }

        deletedCollegeCount +=
          collegeDeleteResult.count;

        console.log(
          `DELETED | ${validated.duplicateCollegeName} -> kept ${validated.canonicalCollegeName}`,
        );
      }

      if (
        deletedProgramCount !==
        DUPLICATE_PAIRS.length
      ) {
        throw new Error(
          `Expected to delete ${DUPLICATE_PAIRS.length} programs, but deleted ${deletedProgramCount}.`,
        );
      }

      if (
        deletedCollegeCount !==
        DUPLICATE_PAIRS.length
      ) {
        throw new Error(
          `Expected to delete ${DUPLICATE_PAIRS.length} colleges, but deleted ${deletedCollegeCount}.`,
        );
      }

      printSection("POST-DELETE VERIFICATION");

      const remainingDuplicateColleges =
        await transaction.college.count({
          where: {
            id: {
              in: duplicateCollegeIds,
            },
          },
        });

      const remainingCanonicalColleges =
        await transaction.college.count({
          where: {
            id: {
              in: canonicalCollegeIds,
            },
          },
        });

      const duplicateProgramIds =
        validatedPairs.map(
          (pair) => pair.duplicateProgramId,
        );

      const canonicalProgramIds =
        validatedPairs.map(
          (pair) => pair.canonicalProgramId,
        );

      const remainingDuplicatePrograms =
        await transaction.collegeBaseballProgram.count({
          where: {
            id: {
              in: duplicateProgramIds,
            },
          },
        });

      const remainingCanonicalPrograms =
        await transaction.collegeBaseballProgram.count({
          where: {
            id: {
              in: canonicalProgramIds,
            },
          },
        });

      console.log(
        `Remaining duplicate colleges: ${remainingDuplicateColleges}`,
      );
      console.log(
        `Remaining duplicate programs: ${remainingDuplicatePrograms}`,
      );
      console.log(
        `Remaining canonical colleges: ${remainingCanonicalColleges}`,
      );
      console.log(
        `Remaining canonical programs: ${remainingCanonicalPrograms}`,
      );

      if (remainingDuplicateColleges !== 0) {
        throw new Error(
          "One or more duplicate College records remain. The transaction will be rolled back.",
        );
      }

      if (remainingDuplicatePrograms !== 0) {
        throw new Error(
          "One or more duplicate CollegeBaseballProgram records remain. The transaction will be rolled back.",
        );
      }

      if (
        remainingCanonicalColleges !==
        DUPLICATE_PAIRS.length
      ) {
        throw new Error(
          "One or more canonical College records are missing. The transaction will be rolled back.",
        );
      }

      if (
        remainingCanonicalPrograms !==
        DUPLICATE_PAIRS.length
      ) {
        throw new Error(
          "One or more canonical CollegeBaseballProgram records are missing. The transaction will be rolled back.",
        );
      }

      return {
        mode: "APPLY" as const,
        validatedPairs,
        deletedProgramCount,
        deletedCollegeCount,
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
    console.log("");
    console.log(
      "All duplicate records passed deletion-safety validation.",
    );
    console.log(
      "No database records were created, updated, or deleted.",
    );
    console.log("");
    console.log("To apply the cleanup, run:");
    console.log(
      "npx tsx scripts/merge-confirmed-college-duplicates.ts --apply",
    );

    return;
  }

  printSection("MERGE COMPLETE");

  console.log(
    `Duplicate baseball programs deleted: ${result.deletedProgramCount}`,
  );
  console.log(
    `Duplicate colleges deleted:          ${result.deletedCollegeCount}`,
  );
  console.log(
    `Canonical colleges preserved:        ${result.validatedPairs.length}`,
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
      "Confirmed college duplicate merge failed.",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });