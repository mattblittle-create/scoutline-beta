// scripts/audit-d1-inventory.ts

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const EXPECTED_EXTERNAL_D1_INVENTORY = 308;

const SHARED_ATHLETICS_HOSTNAMES = new Set([
  "naiastats.prestosports.com",
  "njcaastats.prestosports.com",
]);

type AuditRow = {
  collegeId: string;
  collegeName: string;
  collegeSlug: string;
  city: string;
  state: string;
  collegeDivision: string;
  programId: string;
  programDivision: string;
  conference: string;
  collegeProgramWebsiteUrl: string;
  baseballWebsiteUrl: string;
  coachCount: number;
  headCoachCount: number;
};

function clean(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

/**
 * Normalizes common school-name differences so likely duplicates group together.
 *
 * Examples:
 * - "University of South Carolina" and "South Carolina University"
 * - punctuation differences
 * - "&" versus "and"
 *
 * This does not decide that records are duplicates. It only identifies
 * candidates for manual review.
 */
function normalizeSchoolName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bthe\b/g, " ")
    .replace(/\buniversity\b/g, " ")
    .replace(/\bcollege\b/g, " ")
    .replace(/\bof\b/g, " ")
    .replace(/\bat\b/g, " ")
    .replace(/\bmain campus\b/g, " ")
    .replace(/\bcampus\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

function normalizeDivision(
  value: string | null | undefined,
): string {
  return clean(value)
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/^DIVISION_?/, "D")
    .replace(/^NCAA_DIVISION_?/, "NCAA_D")
    .replace(/^NCAA_1$/, "NCAA_D1")
    .replace(/^D_?1$/, "D1");
}

function legacyDivisionLooksD1(
  value: string | null | undefined,
): boolean {
  const normalized = normalizeDivision(value);

  return [
    "NCAA_D1",
    "NCAA_DI",
    "D1",
    "DI",
    "NCAA1",
  ].includes(normalized);
}

function getHostname(
  value: string | null | undefined,
): string {
  const raw = clean(value);

  if (!raw) {
    return "";
  }

  try {
    const withProtocol = /^https?:\/\//i.test(raw)
      ? raw
      : `https://${raw}`;

    return new URL(withProtocol).hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/^athletics\./, "");
  } catch {
    return "";
  }
}

function escapeCsv(value: unknown): string {
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

function writeCsv(
  filePath: string,
  rows: Record<string, unknown>[],
): void {
  if (rows.length === 0) {
    fs.writeFileSync(filePath, "", "utf8");
    return;
  }

  const headers = Object.keys(rows[0]);

  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) =>
      headers
        .map((header) => escapeCsv(row[header]))
        .join(","),
    ),
  ];

  fs.writeFileSync(
    filePath,
    `${lines.join("\n")}\n`,
    "utf8",
  );
}

function printSection(title: string): void {
  console.log("");
  console.log("=".repeat(90));
  console.log(title);
  console.log("=".repeat(90));
}

async function main(): Promise<void> {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const outputDirectory = path.join(
    process.cwd(),
    "data",
    "enrichment",
    "generated",
    `d1-inventory-audit-${timestamp}`,
  );

  fs.mkdirSync(outputDirectory, {
    recursive: true,
  });

  const colleges = await prisma.college.findMany({
    orderBy: [
      {
        name: "asc",
      },
      {
        state: "asc",
      },
    ],
    include: {
      baseballProgram: {
        include: {
          coaches: {
            select: {
              id: true,
              isHeadCoach: true,
            },
          },
        },
      },
    },
  });

  const allPrograms = colleges.filter(
    (college) => college.baseballProgram !== null,
  );

  const programDivisionDistribution =
    new Map<string, number>();

  for (const college of allPrograms) {
    const division =
      clean(college.baseballProgram?.division) ||
      "(NULL)";

    programDivisionDistribution.set(
      division,
      (programDivisionDistribution.get(division) ?? 0) +
        1,
    );
  }

  const collegeDivisionDistribution =
    new Map<string, number>();

  for (const college of colleges) {
    const division =
      clean(college.division) || "(NULL)";

    collegeDivisionDistribution.set(
      division,
      (collegeDivisionDistribution.get(division) ?? 0) +
        1,
    );
  }

  const canonicalD1Programs = colleges.filter(
    (college) =>
      college.baseballProgram?.division === "NCAA_D1",
  );

  const legacyD1Colleges = colleges.filter((college) =>
    legacyDivisionLooksD1(college.division),
  );

  const eitherFieldLooksD1 = colleges.filter(
    (college) =>
      college.baseballProgram?.division === "NCAA_D1" ||
      legacyDivisionLooksD1(college.division),
  );

  const legacyD1MissingProgram = colleges.filter(
    (college) =>
      legacyDivisionLooksD1(college.division) &&
      !college.baseballProgram,
  );

  const legacyD1ButProgramNotD1 = colleges.filter(
    (college) =>
      legacyDivisionLooksD1(college.division) &&
      college.baseballProgram &&
      college.baseballProgram.division !== "NCAA_D1",
  );

  const programD1ButLegacyNotD1 = colleges.filter(
    (college) =>
      college.baseballProgram?.division === "NCAA_D1" &&
      !legacyDivisionLooksD1(college.division),
  );

  const programDivisionMissingButLegacyD1 =
    colleges.filter(
      (college) =>
        legacyDivisionLooksD1(college.division) &&
        college.baseballProgram &&
        college.baseballProgram.division === null,
    );

  const canonicalRows: AuditRow[] =
    canonicalD1Programs.map((college) => {
      const program = college.baseballProgram;

      if (!program) {
        throw new Error(
          `Expected baseball program for ${college.name}`,
        );
      }

      return {
        collegeId: college.id,
        collegeName: clean(college.name),
        collegeSlug: clean(college.slug),
        city: clean(college.city),
        state: clean(college.state),
        collegeDivision: clean(college.division),
        programId: clean(program.id),
        programDivision: clean(program.division),
        conference: clean(
          program.conference ?? college.conference,
        ),
        collegeProgramWebsiteUrl: clean(
          college.programWebsiteUrl,
        ),
        baseballWebsiteUrl: clean(
          program.baseballWebsiteUrl,
        ),
        coachCount: program.coaches.length,
        headCoachCount: program.coaches.filter(
          (coach) => coach.isHeadCoach,
        ).length,
      };
    });

  const coachedProgramsNotCanonicalD1 =
    colleges.filter(
      (college) =>
        college.baseballProgram &&
        college.baseballProgram.division !==
          "NCAA_D1" &&
        college.baseballProgram.coaches.length > 0,
    );

  /*
   * Exact normalized-name duplicate candidates.
   */
  const nameGroups = new Map<
    string,
    typeof colleges
  >();

  for (const college of colleges) {
    const normalizedName = normalizeSchoolName(
      college.name,
    );

    if (!normalizedName) {
      continue;
    }

    const existing =
      nameGroups.get(normalizedName) ?? [];

    existing.push(college);
    nameGroups.set(normalizedName, existing);
  }

  const duplicateNameCandidates = Array.from(
    nameGroups.entries(),
  )
    .filter(([, group]) => group.length > 1)
    .flatMap(([normalizedName, group]) =>
      group.map((college) => ({
        matchType: "NORMALIZED_NAME",
        normalizedValue: normalizedName,
        groupSize: group.length,
        collegeId: college.id,
        collegeName: college.name,
        collegeSlug: college.slug,
        city: clean(college.city),
        state: clean(college.state),
        legacyDivision: clean(college.division),
        programId: clean(
          college.baseballProgram?.id,
        ),
        programDivision: clean(
          college.baseballProgram?.division,
        ),
        conference: clean(
          college.baseballProgram?.conference ??
            college.conference,
        ),
        baseballWebsiteUrl: clean(
          college.baseballProgram
            ?.baseballWebsiteUrl ??
            college.programWebsiteUrl,
        ),
        coachCount:
          college.baseballProgram?.coaches.length ??
          0,
      })),
    );

  /*
   * Website-hostname duplicate candidates.
   *
   * Shared statistics hosts are excluded because many unrelated
   * programs use those same domains.
   */
  const hostnameGroups = new Map<
    string,
    typeof colleges
  >();

  for (const college of colleges) {
    const hostname = getHostname(
      college.baseballProgram?.baseballWebsiteUrl ??
        college.programWebsiteUrl ??
        college.websiteUrl,
    );

    if (
      !hostname ||
      SHARED_ATHLETICS_HOSTNAMES.has(hostname)
    ) {
      continue;
    }

    const existing =
      hostnameGroups.get(hostname) ?? [];

    existing.push(college);
    hostnameGroups.set(hostname, existing);
  }

  const duplicateHostnameCandidates = Array.from(
    hostnameGroups.entries(),
  )
    .filter(([, group]) => group.length > 1)
    .flatMap(([hostname, group]) =>
      group.map((college) => ({
        matchType: "WEBSITE_HOSTNAME",
        normalizedValue: hostname,
        groupSize: group.length,
        collegeId: college.id,
        collegeName: college.name,
        collegeSlug: college.slug,
        city: clean(college.city),
        state: clean(college.state),
        legacyDivision: clean(college.division),
        programId: clean(
          college.baseballProgram?.id,
        ),
        programDivision: clean(
          college.baseballProgram?.division,
        ),
        conference: clean(
          college.baseballProgram?.conference ??
            college.conference,
        ),
        baseballWebsiteUrl: clean(
          college.baseballProgram
            ?.baseballWebsiteUrl ??
            college.programWebsiteUrl,
        ),
        coachCount:
          college.baseballProgram?.coaches.length ??
          0,
      })),
    );

  const toMismatchRow = (
    college: (typeof colleges)[number],
  ) => ({
    collegeId: college.id,
    collegeName: college.name,
    collegeSlug: college.slug,
    city: clean(college.city),
    state: clean(college.state),
    legacyDivision: clean(college.division),
    programId: clean(
      college.baseballProgram?.id,
    ),
    programDivision: clean(
      college.baseballProgram?.division,
    ),
    collegeConference: clean(college.conference),
    programConference: clean(
      college.baseballProgram?.conference,
    ),
    collegeProgramWebsiteUrl: clean(
      college.programWebsiteUrl,
    ),
    baseballWebsiteUrl: clean(
      college.baseballProgram?.baseballWebsiteUrl,
    ),
    coachCount:
      college.baseballProgram?.coaches.length ?? 0,
    headCoachCount:
      college.baseballProgram?.coaches.filter(
        (coach) => coach.isHeadCoach,
      ).length ?? 0,
  });

  const noBaseballWebsite =
    canonicalD1Programs.filter(
      (college) =>
        !clean(
          college.baseballProgram
            ?.baseballWebsiteUrl ??
            college.programWebsiteUrl,
        ),
    );

  const noCoaches = canonicalD1Programs.filter(
    (college) =>
      (college.baseballProgram?.coaches.length ??
        0) === 0,
  );

  const noHeadCoach = canonicalD1Programs.filter(
    (college) =>
      !college.baseballProgram?.coaches.some(
        (coach) => coach.isHeadCoach,
      ),
  );

  const multipleHeadCoaches =
    canonicalD1Programs.filter(
      (college) =>
        (
          college.baseballProgram?.coaches.filter(
            (coach) => coach.isHeadCoach,
          ).length ?? 0
        ) > 1,
    );

  printSection("D1 DATABASE INVENTORY SUMMARY");

  console.log(
    `Total College records:                       ${colleges.length}`,
  );
  console.log(
    `Total CollegeBaseballProgram records:        ${allPrograms.length}`,
  );
  console.log(
    `Canonical program.division = NCAA_D1:        ${canonicalD1Programs.length}`,
  );
  console.log(
    `Legacy College.division looks D1:            ${legacyD1Colleges.length}`,
  );
  console.log(
    `D1 in either field, deduplicated by ID:      ${eitherFieldLooksD1.length}`,
  );
  console.log(
    `Expected external D1 inventory:              ${EXPECTED_EXTERNAL_D1_INVENTORY}`,
  );
  console.log(
    `Canonical gap versus ${EXPECTED_EXTERNAL_D1_INVENTORY}:                    ${
      EXPECTED_EXTERNAL_D1_INVENTORY -
      canonicalD1Programs.length
    }`,
  );
  console.log(
    `Either-field gap versus ${EXPECTED_EXTERNAL_D1_INVENTORY}:                 ${
      EXPECTED_EXTERNAL_D1_INVENTORY -
      eitherFieldLooksD1.length
    }`,
  );

  printSection("DIVISION VALUE DISTRIBUTION");

  console.log("CollegeBaseballProgram.division:");

  for (
    const [division, count] of Array.from(
      programDivisionDistribution.entries(),
    ).sort((a, b) => b[1] - a[1])
  ) {
    console.log(
      `  ${division.padEnd(35)} ${String(
        count,
      ).padStart(5)}`,
    );
  }

  console.log("");
  console.log("College.division:");

  for (
    const [division, count] of Array.from(
      collegeDivisionDistribution.entries(),
    ).sort((a, b) => b[1] - a[1])
  ) {
    console.log(
      `  ${division.padEnd(35)} ${String(
        count,
      ).padStart(5)}`,
    );
  }

  printSection("DIVISION FIELD MISMATCHES");

  console.log(
    `Legacy D1 with no baseball program:          ${legacyD1MissingProgram.length}`,
  );
  console.log(
    `Legacy D1 but program division is not D1:    ${legacyD1ButProgramNotD1.length}`,
  );
  console.log(
    `Program D1 but legacy field is not D1:       ${programD1ButLegacyNotD1.length}`,
  );
  console.log(
    `Legacy D1 with null program division:        ${programDivisionMissingButLegacyD1.length}`,
  );

  printSection("DUPLICATE CANDIDATES");

  console.log(
    `Normalized-name candidate rows:              ${duplicateNameCandidates.length}`,
  );
  console.log(
    `Normalized-name candidate groups:            ${
      new Set(
        duplicateNameCandidates.map(
          (row) => row.normalizedValue,
        ),
      ).size
    }`,
  );
  console.log(
    `Website-hostname candidate rows:             ${duplicateHostnameCandidates.length}`,
  );
  console.log(
    `Website-hostname candidate groups:           ${
      new Set(
        duplicateHostnameCandidates.map(
          (row) => row.normalizedValue,
        ),
      ).size
    }`,
  );

  printSection("CANONICAL D1 DATA QUALITY");

  console.log(
    `Coached programs not classified NCAA_D1:     ${coachedProgramsNotCanonicalD1.length}`,
  );
  console.log(
    `D1 programs without baseball website:        ${noBaseballWebsite.length}`,
  );
  console.log(
    `D1 programs with zero coaches:               ${noCoaches.length}`,
  );
  console.log(
    `D1 programs without marked head coach:       ${noHeadCoach.length}`,
  );
  console.log(
    `D1 programs with multiple head coaches:      ${multipleHeadCoaches.length}`,
  );

  writeCsv(
    path.join(
      outputDirectory,
      "canonical-d1-programs.csv",
    ),
    canonicalRows,
  );

  writeCsv(
    path.join(
      outputDirectory,
      "legacy-d1-missing-baseball-program.csv",
    ),
    legacyD1MissingProgram.map(toMismatchRow),
  );

  writeCsv(
    path.join(
      outputDirectory,
      "legacy-d1-program-not-d1.csv",
    ),
    legacyD1ButProgramNotD1.map(toMismatchRow),
  );

  writeCsv(
    path.join(
      outputDirectory,
      "program-d1-legacy-not-d1.csv",
    ),
    programD1ButLegacyNotD1.map(toMismatchRow),
  );

  writeCsv(
    path.join(
      outputDirectory,
      "legacy-d1-null-program-division.csv",
    ),
    programDivisionMissingButLegacyD1.map(
      toMismatchRow,
    ),
  );

  writeCsv(
    path.join(
      outputDirectory,
      "duplicate-normalized-name-candidates.csv",
    ),
    duplicateNameCandidates,
  );

  writeCsv(
    path.join(
      outputDirectory,
      "duplicate-website-hostname-candidates.csv",
    ),
    duplicateHostnameCandidates,
  );

  writeCsv(
    path.join(
      outputDirectory,
      "d1-missing-baseball-website.csv",
    ),
    noBaseballWebsite.map(toMismatchRow),
  );

  writeCsv(
    path.join(
      outputDirectory,
      "d1-zero-coaches.csv",
    ),
    noCoaches.map(toMismatchRow),
  );

  writeCsv(
    path.join(
      outputDirectory,
      "d1-no-head-coach.csv",
    ),
    noHeadCoach.map(toMismatchRow),
  );

  writeCsv(
    path.join(
      outputDirectory,
      "coached-programs-not-canonical-d1.csv",
    ),
    coachedProgramsNotCanonicalD1.map(
      toMismatchRow,
    ),
  );

  writeCsv(
    path.join(
      outputDirectory,
      "d1-multiple-head-coaches.csv",
    ),
    multipleHeadCoaches.map(toMismatchRow),
  );

  const summary = {
    generatedAt: new Date().toISOString(),
    expectedExternalD1Inventory:
      EXPECTED_EXTERNAL_D1_INVENTORY,
    totalCollegeRecords: colleges.length,
    totalBaseballProgramRecords:
      allPrograms.length,
    canonicalD1Programs:
      canonicalD1Programs.length,
    legacyD1Colleges: legacyD1Colleges.length,
    eitherFieldD1Colleges:
      eitherFieldLooksD1.length,
    canonicalGapVersus308:
      EXPECTED_EXTERNAL_D1_INVENTORY -
      canonicalD1Programs.length,
    eitherFieldGapVersus308:
      EXPECTED_EXTERNAL_D1_INVENTORY -
      eitherFieldLooksD1.length,
    divisionDistribution: {
      baseballProgram: Object.fromEntries(
        Array.from(
          programDivisionDistribution.entries(),
        ).sort((a, b) => b[1] - a[1]),
      ),
      college: Object.fromEntries(
        Array.from(
          collegeDivisionDistribution.entries(),
        ).sort((a, b) => b[1] - a[1]),
      ),
    },
    divisionMismatches: {
      legacyD1MissingProgram:
        legacyD1MissingProgram.length,
      legacyD1ButProgramNotD1:
        legacyD1ButProgramNotD1.length,
      programD1ButLegacyNotD1:
        programD1ButLegacyNotD1.length,
      legacyD1WithNullProgramDivision:
        programDivisionMissingButLegacyD1.length,
    },
    duplicateCandidates: {
      normalizedNameRows:
        duplicateNameCandidates.length,
      normalizedNameGroups: new Set(
        duplicateNameCandidates.map(
          (row) => row.normalizedValue,
        ),
      ).size,
      websiteHostnameRows:
        duplicateHostnameCandidates.length,
      websiteHostnameGroups: new Set(
        duplicateHostnameCandidates.map(
          (row) => row.normalizedValue,
        ),
      ).size,
    },
    canonicalD1DataQuality: {
      coachedProgramsNotCanonicalD1:
        coachedProgramsNotCanonicalD1.length,
      missingBaseballWebsite:
        noBaseballWebsite.length,
      zeroCoaches: noCoaches.length,
      noMarkedHeadCoach: noHeadCoach.length,
      multipleMarkedHeadCoaches:
        multipleHeadCoaches.length,
    },
  };

  fs.writeFileSync(
    path.join(outputDirectory, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );

  printSection("OUTPUT");

  console.log("Audit files written to:");
  console.log(outputDirectory);
  console.log("");
  console.log(
    "No database records were created, updated, or deleted.",
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error("D1 inventory audit failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });