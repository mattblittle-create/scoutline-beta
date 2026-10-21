// scripts/audit-confirmed-college-duplicates.ts

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

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

type CollegeRecord = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  state: string | null;
  division: string | null;
  conference: string | null;
  baseballProgram: {
    id: string;
    division: string | null;
    conference: string | null;
    baseballWebsiteUrl: string | null;
    coaches: {
      id: string;
      name: string | null;
      isHeadCoach: boolean;
    }[];
  } | null;
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
  targetTable: string,
): Promise<ForeignKeyReference[]> {
  return prisma.$queryRaw<ForeignKeyReference[]>`
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

async function countForeignKeyRows(args: {
  reference: ForeignKeyReference;
  recordId: string;
}): Promise<number> {
  const { reference, recordId } = args;

  const schema = quoteIdentifier(reference.source_schema);
  const table = quoteIdentifier(reference.source_table);
  const column = quoteIdentifier(reference.source_column);

  const query = `
    SELECT COUNT(*)::int AS "count"
    FROM ${schema}.${table}
    WHERE ${column} = $1
  `;

  const result = await prisma.$queryRawUnsafe<
    Array<{ count: number }>
  >(query, recordId);

  return Number(result[0]?.count ?? 0);
}

async function main(): Promise<void> {
  printSection("CONFIRMED COLLEGE DUPLICATE MERGE-READINESS AUDIT");

  console.log(`Confirmed duplicate pairs: ${DUPLICATE_PAIRS.length}`);
  console.log("Mode: READ ONLY");
  console.log("");
  console.log(
    "This script discovers foreign-key references and does not modify the database.",
  );

  const allCollegeIds = Array.from(
    new Set(
      DUPLICATE_PAIRS.flatMap((pair) => [
        pair.duplicateCollegeId,
        pair.canonicalCollegeId,
      ]),
    ),
  );

  const colleges = await prisma.college.findMany({
    where: {
      id: {
        in: allCollegeIds,
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      state: true,
      division: true,
      conference: true,
      baseballProgram: {
        select: {
          id: true,
          division: true,
          conference: true,
          baseballWebsiteUrl: true,
          coaches: {
            select: {
              id: true,
              name: true,
              isHeadCoach: true,
            },
          },
        },
      },
    },
  });

  const collegesById = new Map<string, CollegeRecord>(
    colleges.map((college) => [
      college.id,
      college as CollegeRecord,
    ]),
  );

  const missingIds = allCollegeIds.filter(
    (id) => !collegesById.has(id),
  );

  printSection("PAIR VALIDATION");

  console.log(`Expected college records: ${allCollegeIds.length}`);
  console.log(`College records found:    ${colleges.length}`);
  console.log(`College records missing:  ${missingIds.length}`);

  if (missingIds.length > 0) {
    console.log("");
    console.log("Missing IDs:");

    for (const id of missingIds) {
      console.log(`- ${id}`);
    }

    throw new Error(
      "One or more expected duplicate or canonical college records are missing.",
    );
  }

  const duplicateProgramIds: string[] = [];
  const canonicalProgramIds: string[] = [];

  for (const pair of DUPLICATE_PAIRS) {
    const duplicate = collegesById.get(
      pair.duplicateCollegeId,
    );
    const canonical = collegesById.get(
      pair.canonicalCollegeId,
    );

    if (!duplicate || !canonical) {
      continue;
    }

    if (!duplicate.baseballProgram) {
      throw new Error(
        `${duplicate.name} does not have a baseball program.`,
      );
    }

    if (!canonical.baseballProgram) {
      throw new Error(
        `${canonical.name} does not have a baseball program.`,
      );
    }

    duplicateProgramIds.push(
      duplicate.baseballProgram.id,
    );
    canonicalProgramIds.push(
      canonical.baseballProgram.id,
    );
  }

  const collegeForeignKeys =
    await findForeignKeyReferences("College");

  const programForeignKeys =
    await findForeignKeyReferences(
      "CollegeBaseballProgram",
    );

  printSection("FOREIGN-KEY DISCOVERY");

  console.log(
    `Tables referencing College:                ${collegeForeignKeys.length}`,
  );
  console.log(
    `Tables referencing CollegeBaseballProgram: ${programForeignKeys.length}`,
  );

  console.log("");
  console.log("College references:");

  for (const reference of collegeForeignKeys) {
    console.log(
      `- ${reference.source_schema}.${reference.source_table}.${reference.source_column}`,
    );
  }

  console.log("");
  console.log("CollegeBaseballProgram references:");

  for (const reference of programForeignKeys) {
    console.log(
      `- ${reference.source_schema}.${reference.source_table}.${reference.source_column}`,
    );
  }

  const outputRows: Record<string, unknown>[] = [];

  printSection("PAIR-BY-PAIR REVIEW");

  for (const pair of DUPLICATE_PAIRS) {
    const duplicate = collegesById.get(
      pair.duplicateCollegeId,
    )!;
    const canonical = collegesById.get(
      pair.canonicalCollegeId,
    )!;

    const duplicateProgram = duplicate.baseballProgram!;
    const canonicalProgram = canonical.baseballProgram!;

    console.log("");
    console.log(`--- ${pair.label} ---`);
    console.log(
      `Duplicate: ${duplicate.name} (${duplicate.id})`,
    );
    console.log(
      `Canonical: ${canonical.name} (${canonical.id})`,
    );
    console.log(
      `Duplicate program: ${duplicateProgram.id}`,
    );
    console.log(
      `Canonical program: ${canonicalProgram.id}`,
    );

    let duplicateCollegeReferenceCount = 0;
    let canonicalCollegeReferenceCount = 0;
    let duplicateProgramReferenceCount = 0;
    let canonicalProgramReferenceCount = 0;

    for (const reference of collegeForeignKeys) {
      const duplicateCount =
        await countForeignKeyRows({
          reference,
          recordId: duplicate.id,
        });

      const canonicalCount =
        await countForeignKeyRows({
          reference,
          recordId: canonical.id,
        });

      duplicateCollegeReferenceCount +=
        duplicateCount;
      canonicalCollegeReferenceCount +=
        canonicalCount;

      if (duplicateCount > 0 || canonicalCount > 0) {
        outputRows.push({
          label: pair.label,
          entityType: "College",
          sourceSchema: reference.source_schema,
          sourceTable: reference.source_table,
          sourceColumn: reference.source_column,
          duplicateId: duplicate.id,
          duplicateName: duplicate.name,
          duplicateReferenceCount: duplicateCount,
          canonicalId: canonical.id,
          canonicalName: canonical.name,
          canonicalReferenceCount: canonicalCount,
        });
      }
    }

    for (const reference of programForeignKeys) {
      const duplicateCount =
        await countForeignKeyRows({
          reference,
          recordId: duplicateProgram.id,
        });

      const canonicalCount =
        await countForeignKeyRows({
          reference,
          recordId: canonicalProgram.id,
        });

      duplicateProgramReferenceCount +=
        duplicateCount;
      canonicalProgramReferenceCount +=
        canonicalCount;

      if (duplicateCount > 0 || canonicalCount > 0) {
        outputRows.push({
          label: pair.label,
          entityType: "CollegeBaseballProgram",
          sourceSchema: reference.source_schema,
          sourceTable: reference.source_table,
          sourceColumn: reference.source_column,
          duplicateId: duplicateProgram.id,
          duplicateName: duplicate.name,
          duplicateReferenceCount: duplicateCount,
          canonicalId: canonicalProgram.id,
          canonicalName: canonical.name,
          canonicalReferenceCount: canonicalCount,
        });
      }
    }

    console.log(
      `Duplicate college references: ${duplicateCollegeReferenceCount}`,
    );
    console.log(
      `Canonical college references: ${canonicalCollegeReferenceCount}`,
    );
    console.log(
      `Duplicate program references: ${duplicateProgramReferenceCount}`,
    );
    console.log(
      `Canonical program references: ${canonicalProgramReferenceCount}`,
    );
    console.log(
      `Duplicate coaches:             ${duplicateProgram.coaches.length}`,
    );
    console.log(
      `Canonical coaches:             ${canonicalProgram.coaches.length}`,
    );

    outputRows.push({
      label: pair.label,
      entityType: "SUMMARY",
      sourceSchema: "",
      sourceTable: "",
      sourceColumn: "",
      duplicateId: duplicate.id,
      duplicateName: duplicate.name,
      duplicateSlug: duplicate.slug,
      duplicateDivision:
        duplicateProgram.division,
      duplicateConference:
        duplicateProgram.conference,
      duplicateWebsite:
        duplicateProgram.baseballWebsiteUrl,
      duplicateCoachCount:
        duplicateProgram.coaches.length,
      duplicateReferenceCount:
        duplicateCollegeReferenceCount +
        duplicateProgramReferenceCount,
      canonicalId: canonical.id,
      canonicalName: canonical.name,
      canonicalSlug: canonical.slug,
      canonicalDivision:
        canonicalProgram.division,
      canonicalConference:
        canonicalProgram.conference,
      canonicalWebsite:
        canonicalProgram.baseballWebsiteUrl,
      canonicalCoachCount:
        canonicalProgram.coaches.length,
      canonicalReferenceCount:
        canonicalCollegeReferenceCount +
        canonicalProgramReferenceCount,
    });
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
    `confirmed-duplicate-readiness-${timestamp}`,
  );

  fs.mkdirSync(outputDirectory, {
    recursive: true,
  });

  const outputPath = path.join(
    outputDirectory,
    "foreign-key-reference-audit.csv",
  );

  const headers = Array.from(
    new Set(
      outputRows.flatMap((row) =>
        Object.keys(row),
      ),
    ),
  );

  const csvLines = [
    headers.map(csvEscape).join(","),
    ...outputRows.map((row) =>
      headers
        .map((header) => csvEscape(row[header]))
        .join(","),
    ),
  ];

  fs.writeFileSync(
    outputPath,
    `${csvLines.join("\n")}\n`,
    "utf8",
  );

  printSection("AUDIT COMPLETE");

  console.log(`Pairs audited: ${DUPLICATE_PAIRS.length}`);
  console.log("");
  console.log("Audit file written to:");
  console.log(outputPath);
  console.log("");
  console.log(
    "No database records were created, updated, or deleted.",
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "Confirmed duplicate merge-readiness audit failed.",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });