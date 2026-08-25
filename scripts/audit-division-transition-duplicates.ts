// scripts/audit-division-transition-duplicates.ts

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

type TransitionPair = {
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

type AuditRow = {
  label: string;
  entityType: string;
  sourceSchema: string;
  sourceTable: string;
  sourceColumn: string;
  duplicateId: string;
  duplicateName: string;
  duplicateCount: number;
  canonicalId: string;
  canonicalName: string;
  canonicalCount: number;
};

const TRANSITION_PAIRS: TransitionPair[] = [
  {
    label: "Ferrum",
    duplicateCollegeId: "cmovorpkb007xqt7gc5w8w0m0",
    canonicalCollegeId: "cmovlhuck006lqt203i6443rf",
  },
  {
    label: "Sul Ross State",
    duplicateCollegeId: "cmovorxmc00noqt7gwaxaohxc",
    canonicalCollegeId: "cmovlhze900h3qt20rprhdg7t",
  },
];

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
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
      AND source_column.attnum = key_pairs.source_attribute_number
    JOIN pg_attribute target_column
      ON target_column.attrelid = target_table.oid
      AND target_column.attnum = key_pairs.target_attribute_number
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

  const rows = await prisma.$queryRawUnsafe<
    Array<{ count: number }>
  >(query, recordId);

  return Number(rows[0]?.count ?? 0);
}

async function main(): Promise<void> {
  printSection("DIVISION-TRANSITION DUPLICATE AUDIT");

  console.log(`Transition pairs: ${TRANSITION_PAIRS.length}`);
  console.log("Mode: READ ONLY");
  console.log("");
  console.log(
    "Current NCAA_D2 records are treated as canonical.",
  );
  console.log(
    "Former NCAA_D3 records are treated as duplicate candidates.",
  );

  if (TRANSITION_PAIRS.length !== 2) {
    throw new Error(
      `Expected exactly 2 transition pairs, but found ${TRANSITION_PAIRS.length}.`,
    );
  }

  const allCollegeIds = Array.from(
    new Set(
      TRANSITION_PAIRS.flatMap((pair) => [
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
        },
      },
    },
  });

  const collegesById = new Map(
    colleges.map((college) => [college.id, college]),
  );

  printSection("PAIR VALIDATION");

  console.log(`Expected college records: ${allCollegeIds.length}`);
  console.log(`College records found:    ${colleges.length}`);

  const missingIds = allCollegeIds.filter(
    (id) => !collegesById.has(id),
  );

  console.log(`College records missing:  ${missingIds.length}`);

  if (missingIds.length > 0) {
    console.log("");
    console.log("Missing IDs:");

    for (const id of missingIds) {
      console.log(`- ${id}`);
    }

    throw new Error(
      "One or more expected College records are missing.",
    );
  }

  const collegeReferences =
    await findForeignKeyReferences("College");

  const programReferences =
    await findForeignKeyReferences(
      "CollegeBaseballProgram",
    );

  printSection("FOREIGN-KEY DISCOVERY");

  console.log(
    `Tables referencing College:                ${collegeReferences.length}`,
  );
  console.log(
    `Tables referencing CollegeBaseballProgram: ${programReferences.length}`,
  );

  const auditRows: AuditRow[] = [];

  printSection("PAIR-BY-PAIR REVIEW");

  for (const pair of TRANSITION_PAIRS) {
    const duplicate = collegesById.get(
      pair.duplicateCollegeId,
    );

    const canonical = collegesById.get(
      pair.canonicalCollegeId,
    );

    if (!duplicate || !canonical) {
      throw new Error(
        `${pair.label}: one or both College records were not found.`,
      );
    }

    if (!duplicate.baseballProgram) {
      throw new Error(
        `${pair.label}: duplicate candidate has no baseball program.`,
      );
    }

    if (!canonical.baseballProgram) {
      throw new Error(
        `${pair.label}: canonical record has no baseball program.`,
      );
    }

    const duplicateProgram = duplicate.baseballProgram;
    const canonicalProgram = canonical.baseballProgram;

    console.log("");
    console.log(`--- ${pair.label} ---`);

    console.log(
      `Duplicate candidate: ${duplicate.name} (${duplicate.id})`,
    );
    console.log(
      `  Slug:       ${duplicate.slug ?? ""}`,
    );
    console.log(
      `  Location:   ${duplicate.city ?? ""}, ${duplicate.state ?? ""}`,
    );
    console.log(
      `  Division:   ${duplicateProgram.division ?? ""}`,
    );
    console.log(
      `  Conference: ${duplicateProgram.conference ?? ""}`,
    );
    console.log(
      `  Website:    ${duplicateProgram.baseballWebsiteUrl ?? ""}`,
    );
    console.log(
      `  Program ID: ${duplicateProgram.id}`,
    );

    console.log("");
    console.log(
      `Canonical: ${canonical.name} (${canonical.id})`,
    );
    console.log(
      `  Slug:       ${canonical.slug ?? ""}`,
    );
    console.log(
      `  Location:   ${canonical.city ?? ""}, ${canonical.state ?? ""}`,
    );
    console.log(
      `  Division:   ${canonicalProgram.division ?? ""}`,
    );
    console.log(
      `  Conference: ${canonicalProgram.conference ?? ""}`,
    );
    console.log(
      `  Website:    ${canonicalProgram.baseballWebsiteUrl ?? ""}`,
    );
    console.log(
      `  Program ID: ${canonicalProgram.id}`,
    );

    if (duplicateProgram.division !== "NCAA_D3") {
      throw new Error(
        `${pair.label}: expected duplicate candidate division NCAA_D3, found ${duplicateProgram.division ?? "NULL"}.`,
      );
    }

    if (canonicalProgram.division !== "NCAA_D2") {
      throw new Error(
        `${pair.label}: expected canonical division NCAA_D2, found ${canonicalProgram.division ?? "NULL"}.`,
      );
    }

    let duplicateCollegeReferenceCount = 0;
    let canonicalCollegeReferenceCount = 0;
    let duplicateProgramReferenceCount = 0;
    let canonicalProgramReferenceCount = 0;

    for (const reference of collegeReferences) {
      const duplicateCount =
        await countReferenceRows({
          reference,
          recordId: duplicate.id,
        });

      const canonicalCount =
        await countReferenceRows({
          reference,
          recordId: canonical.id,
        });

      duplicateCollegeReferenceCount += duplicateCount;
      canonicalCollegeReferenceCount += canonicalCount;

      if (duplicateCount > 0 || canonicalCount > 0) {
        auditRows.push({
          label: pair.label,
          entityType: "College",
          sourceSchema: reference.source_schema,
          sourceTable: reference.source_table,
          sourceColumn: reference.source_column,
          duplicateId: duplicate.id,
          duplicateName: duplicate.name,
          duplicateCount,
          canonicalId: canonical.id,
          canonicalName: canonical.name,
          canonicalCount,
        });
      }
    }

    for (const reference of programReferences) {
      const duplicateCount =
        await countReferenceRows({
          reference,
          recordId: duplicateProgram.id,
        });

      const canonicalCount =
        await countReferenceRows({
          reference,
          recordId: canonicalProgram.id,
        });

      duplicateProgramReferenceCount += duplicateCount;
      canonicalProgramReferenceCount += canonicalCount;

      if (duplicateCount > 0 || canonicalCount > 0) {
        auditRows.push({
          label: pair.label,
          entityType: "CollegeBaseballProgram",
          sourceSchema: reference.source_schema,
          sourceTable: reference.source_table,
          sourceColumn: reference.source_column,
          duplicateId: duplicateProgram.id,
          duplicateName: duplicate.name,
          duplicateCount,
          canonicalId: canonicalProgram.id,
          canonicalName: canonical.name,
          canonicalCount,
        });
      }
    }

    console.log("");
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

    const expectedDuplicateCollegeReferences = 1;

    const status =
      duplicateCollegeReferenceCount ===
        expectedDuplicateCollegeReferences &&
      duplicateProgramReferenceCount === 0
        ? "SAFE DELETE CANDIDATE"
        : "REQUIRES MERGE/REVIEW";

    console.log(`Status:                       ${status}`);

    auditRows.push({
      label: pair.label,
      entityType: "SUMMARY",
      sourceSchema: "",
      sourceTable: "",
      sourceColumn: "",
      duplicateId: duplicate.id,
      duplicateName: duplicate.name,
      duplicateCount:
        duplicateCollegeReferenceCount +
        duplicateProgramReferenceCount,
      canonicalId: canonical.id,
      canonicalName: canonical.name,
      canonicalCount:
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
    `division-transition-audit-${timestamp}`,
  );

  fs.mkdirSync(outputDirectory, {
    recursive: true,
  });

  const outputPath = path.join(
    outputDirectory,
    "division-transition-reference-audit.csv",
  );

  const headers: Array<keyof AuditRow> = [
    "label",
    "entityType",
    "sourceSchema",
    "sourceTable",
    "sourceColumn",
    "duplicateId",
    "duplicateName",
    "duplicateCount",
    "canonicalId",
    "canonicalName",
    "canonicalCount",
  ];

  const csvLines = [
    headers.map(csvEscape).join(","),
    ...auditRows.map((row) =>
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

  console.log(`Pairs audited: ${TRANSITION_PAIRS.length}`);
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
      "Division-transition duplicate audit failed.",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });