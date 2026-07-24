// scripts/audit-college-inventory.ts

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OUTPUT_DIRECTORY = path.join(
  process.cwd(),
  "data",
  "enrichment",
  "generated",
);

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function normalizeSchoolName(value: string): string {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bthe\b/g, " ")
    .replace(/\buniversity\b/g, " ")
    .replace(/\bcollege\b/g, " ")
    .replace(/\bof\b/g, " ")
    .replace(/\bat\b/g, " ")
    .replace(/\bmain campus\b/g, " ")
    .replace(/\bcampus\b/g, " ")
    .replace(/\bst\.\b/g, " saint ")
    .replace(/\bst\b/g, " saint ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDivision(value: string | null): string {
  return clean(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

function legacyDivisionLooksD1(value: string | null): boolean {
  const normalized = normalizeDivision(value);

  return [
    "D1",
    "DI",
    "DIVISION1",
    "DIVISIONI",
    "NCAAD1",
    "NCAADI",
    "NCAADIVISION1",
    "NCAADIVISIONI",
  ].includes(normalized);
}

function getHostname(value: string | null): string {
  const raw = clean(value);

  if (!raw) {
    return "";
  }

  try {
    return new URL(raw).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "";
  }
}

function writeCsv(
  filename: string,
  headers: string[],
  rows: unknown[][],
): string {
  fs.mkdirSync(OUTPUT_DIRECTORY, {
    recursive: true,
  });

  const outputPath = path.join(
    OUTPUT_DIRECTORY,
    filename,
  );

  const csv = [
    headers,
    ...rows,
  ]
    .map((row) =>
      row.map(csvEscape).join(","),
    )
    .join("\n");

  fs.writeFileSync(
    outputPath,
    `${csv}\n`,
    "utf8",
  );

  return outputPath;
}

async function main() {
  const colleges = await prisma.college.findMany({
    include: {
      baseballProgram: {
        include: {
          _count: {
            select: {
              coaches: true,
              rosterNeeds: true,
              metricAverages: true,
              rosterSnapshots: true,
              portalActivities: true,
              programOutcomes: true,
            },
          },
        },
      },
      _count: {
        select: {
          coaches: true,
          coachInvites: true,
          coachJoinRequests: true,
          coachNotes: true,
          coachPlayerRatings: true,
          recruitingBoardEntries: true,
          recruitingLists: true,
          savedByPlayers: true,
          profileViewEvents: true,
          programVerificationSubmissions: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const totalColleges = colleges.length;

  const collegesWithBaseballPrograms = colleges.filter(
    (college) => Boolean(college.baseballProgram),
  );

  const canonicalD1 = colleges.filter(
    (college) =>
      college.baseballProgram?.division === "NCAA_D1",
  );

  const scraperEligibleD1 = canonicalD1.filter(
    (college) =>
      Boolean(
        clean(
          college.baseballProgram
            ?.baseballWebsiteUrl,
        ),
      ),
  );

  const canonicalD1MissingBaseballUrl =
    canonicalD1.filter(
      (college) =>
        !clean(
          college.baseballProgram
            ?.baseballWebsiteUrl,
        ),
    );

  const legacyD1 = colleges.filter(
    (college) =>
      legacyDivisionLooksD1(college.division),
  );

  const legacyD1WithoutProgram = legacyD1.filter(
    (college) => !college.baseballProgram,
  );

  const legacyOnlyD1 = colleges.filter(
    (college) =>
      legacyDivisionLooksD1(college.division) &&
      college.baseballProgram?.division !==
        "NCAA_D1",
  );

  const canonicalOnlyD1 = canonicalD1.filter(
    (college) =>
      !legacyDivisionLooksD1(college.division),
  );

  const divisionConflicts = colleges.filter(
    (college) => {
      const legacyIsD1 =
        legacyDivisionLooksD1(college.division);

      const canonicalIsD1 =
        college.baseballProgram?.division ===
        "NCAA_D1";

      return (
        Boolean(college.baseballProgram) &&
        legacyIsD1 !== canonicalIsD1
      );
    },
  );

  const normalizedNameGroups =
    new Map<string, typeof colleges>();

  for (const college of colleges) {
    const normalizedName =
      normalizeSchoolName(college.name);

    if (!normalizedName) {
      continue;
    }

    const existing =
      normalizedNameGroups.get(normalizedName) ??
      [];

    existing.push(college);
    normalizedNameGroups.set(
      normalizedName,
      existing,
    );
  }

  const duplicateNameGroups = Array.from(
    normalizedNameGroups.entries(),
  )
    .filter(([, group]) => group.length > 1)
    .sort(
      (left, right) =>
        right[1].length - left[1].length ||
        left[0].localeCompare(right[0]),
    );

  const hostnameGroups =
    new Map<string, typeof colleges>();

  for (const college of colleges) {
    const hostname =
      getHostname(
        college.baseballProgram
          ?.baseballWebsiteUrl ??
          college.programWebsiteUrl ??
          college.websiteUrl,
      );

    if (!hostname) {
      continue;
    }

    const existing =
      hostnameGroups.get(hostname) ?? [];

    existing.push(college);
    hostnameGroups.set(hostname, existing);
  }

  const duplicateHostnameGroups =
    Array.from(hostnameGroups.entries())
      .filter(([, group]) => group.length > 1)
      .sort(
        (left, right) =>
          right[1].length - left[1].length ||
          left[0].localeCompare(right[0]),
      );

  const suspiciousD1Names = canonicalD1.filter(
    (college) => {
      const searchable = [
        college.name,
        college.baseballProgram?.nickname,
        college.baseballProgram?.conference,
      ]
        .map(clean)
        .join(" ")
        .toLowerCase();

      return [
        "club",
        "intramural",
        "discontinued",
        "closed",
        "inactive",
        "defunct",
        "no longer sponsors",
      ].some((term) =>
        searchable.includes(term),
      );
    },
  );

  const allRows = colleges.map((college) => {
    const program = college.baseballProgram;

    return [
      college.id,
      college.name,
      college.slug,
      college.city,
      college.state,
      college.division,
      college.conference,
      program?.id,
      program?.division,
      program?.conference,
      program?.baseballWebsiteUrl,
      getHostname(
        program?.baseballWebsiteUrl ??
          college.programWebsiteUrl ??
          college.websiteUrl,
      ),
      normalizeSchoolName(college.name),
      legacyDivisionLooksD1(
        college.division,
      ),
      program?.division === "NCAA_D1",
      Boolean(
        clean(program?.baseballWebsiteUrl),
      ),
      program?._count.coaches ?? 0,
      college._count.coaches,
      college._count.savedByPlayers,
      college._count.recruitingBoardEntries,
      college._count.recruitingLists,
      college._count.coachInvites,
      college._count.coachJoinRequests,
      college._count.programVerificationSubmissions,
      college.verificationStatus,
      program?.verificationStatus,
      college.createdAt.toISOString(),
      college.updatedAt.toISOString(),
    ];
  });

  const allInventoryPath = writeCsv(
    `college-inventory-audit.${timestamp}.csv`,
    [
      "collegeId",
      "collegeName",
      "slug",
      "city",
      "state",
      "legacyDivision",
      "legacyConference",
      "baseballProgramId",
      "canonicalDivision",
      "canonicalConference",
      "baseballWebsiteUrl",
      "athleticsHostname",
      "normalizedSchoolName",
      "legacyLooksD1",
      "canonicalIsD1",
      "scraperEligible",
      "importedCoachCount",
      "linkedCoachUsers",
      "savedByPlayers",
      "recruitingBoardEntries",
      "recruitingLists",
      "coachInvites",
      "coachJoinRequests",
      "verificationSubmissions",
      "collegeVerificationStatus",
      "programVerificationStatus",
      "createdAt",
      "updatedAt",
    ],
    allRows,
  );

  const duplicateNameRows: unknown[][] = [];

  for (
    const [normalizedName, group]
    of duplicateNameGroups
  ) {
    for (const college of group) {
      duplicateNameRows.push([
        normalizedName,
        group.length,
        college.id,
        college.name,
        college.slug,
        college.city,
        college.state,
        college.division,
        college.baseballProgram?.division,
        college.baseballProgram?.conference,
        college.baseballProgram
          ?.baseballWebsiteUrl,
        college.baseballProgram?._count
          .coaches ?? 0,
        college._count.savedByPlayers,
        college._count
          .recruitingBoardEntries,
        college._count.recruitingLists,
        college._count.coachInvites,
        college._count.coaches,
        college.createdAt.toISOString(),
        college.updatedAt.toISOString(),
      ]);
    }
  }

  const duplicateNamesPath = writeCsv(
    `college-inventory-duplicate-names.${timestamp}.csv`,
    [
      "normalizedSchoolName",
      "groupSize",
      "collegeId",
      "collegeName",
      "slug",
      "city",
      "state",
      "legacyDivision",
      "canonicalDivision",
      "canonicalConference",
      "baseballWebsiteUrl",
      "importedCoachCount",
      "savedByPlayers",
      "recruitingBoardEntries",
      "recruitingLists",
      "coachInvites",
      "linkedCoachUsers",
      "createdAt",
      "updatedAt",
    ],
    duplicateNameRows,
  );

  const duplicateHostnameRows: unknown[][] = [];

  for (
    const [hostname, group]
    of duplicateHostnameGroups
  ) {
    for (const college of group) {
      duplicateHostnameRows.push([
        hostname,
        group.length,
        college.id,
        college.name,
        college.slug,
        college.city,
        college.state,
        college.baseballProgram?.division,
        college.baseballProgram
          ?.baseballWebsiteUrl,
        college.baseballProgram?._count
          .coaches ?? 0,
      ]);
    }
  }

  const duplicateHostnamesPath = writeCsv(
    `college-inventory-duplicate-hostnames.${timestamp}.csv`,
    [
      "athleticsHostname",
      "groupSize",
      "collegeId",
      "collegeName",
      "slug",
      "city",
      "state",
      "canonicalDivision",
      "baseballWebsiteUrl",
      "importedCoachCount",
    ],
    duplicateHostnameRows,
  );

  const conflictRows = divisionConflicts.map(
    (college) => [
      college.id,
      college.name,
      college.slug,
      college.city,
      college.state,
      college.division,
      college.baseballProgram?.division,
      college.conference,
      college.baseballProgram?.conference,
      college.baseballProgram
        ?.baseballWebsiteUrl,
      college.baseballProgram?._count
        .coaches ?? 0,
    ],
  );

  const conflictsPath = writeCsv(
    `college-inventory-division-conflicts.${timestamp}.csv`,
    [
      "collegeId",
      "collegeName",
      "slug",
      "city",
      "state",
      "legacyDivision",
      "canonicalDivision",
      "legacyConference",
      "canonicalConference",
      "baseballWebsiteUrl",
      "importedCoachCount",
    ],
    conflictRows,
  );

  const missingUrlRows =
    canonicalD1MissingBaseballUrl.map(
      (college) => [
        college.id,
        college.name,
        college.slug,
        college.city,
        college.state,
        college.division,
        college.baseballProgram?.division,
        college.programWebsiteUrl,
        college.websiteUrl,
        college.baseballProgram?._count
          .coaches ?? 0,
      ],
    );

  const missingUrlsPath = writeCsv(
    `college-inventory-d1-missing-baseball-url.${timestamp}.csv`,
    [
      "collegeId",
      "collegeName",
      "slug",
      "city",
      "state",
      "legacyDivision",
      "canonicalDivision",
      "legacyProgramWebsiteUrl",
      "schoolWebsiteUrl",
      "importedCoachCount",
    ],
    missingUrlRows,
  );

  console.log("");
  console.log(
    "======================================================",
  );
  console.log(
    "COLLEGE DATABASE INVENTORY AUDIT",
  );
  console.log(
    "======================================================",
  );
  console.log(
    `Total College records:                 ${totalColleges}`,
  );
  console.log(
    `Colleges with baseball program:        ${collegesWithBaseballPrograms.length}`,
  );
  console.log(
    `Canonical NCAA D1 programs:            ${canonicalD1.length}`,
  );
  console.log(
    `D1 programs eligible for scraper:      ${scraperEligibleD1.length}`,
  );
  console.log(
    `Canonical D1 missing baseball URL:     ${canonicalD1MissingBaseballUrl.length}`,
  );
  console.log(
    `Legacy College.division looks D1:      ${legacyD1.length}`,
  );
  console.log(
    `Legacy D1 without baseball program:    ${legacyD1WithoutProgram.length}`,
  );
  console.log(
    `Legacy-only D1 records:                ${legacyOnlyD1.length}`,
  );
  console.log(
    `Canonical-only D1 records:             ${canonicalOnlyD1.length}`,
  );
  console.log(
    `Legacy/canonical division conflicts:   ${divisionConflicts.length}`,
  );
  console.log(
    `Normalized duplicate-name groups:     ${duplicateNameGroups.length}`,
  );
  console.log(
    `Duplicate athletics-host groups:       ${duplicateHostnameGroups.length}`,
  );
  console.log(
    `Suspicious D1 status/name records:     ${suspiciousD1Names.length}`,
  );
  console.log(
    "======================================================",
  );

  console.log("\nGenerated files:");
  console.log(`  ${allInventoryPath}`);
  console.log(`  ${duplicateNamesPath}`);
  console.log(`  ${duplicateHostnamesPath}`);
  console.log(`  ${conflictsPath}`);
  console.log(`  ${missingUrlsPath}`);

  if (legacyD1.length === 281) {
    console.log(
      "\n🎯 The former 281 count came from legacy College.division.",
    );
  } else if (
    canonicalD1.length +
      legacyOnlyD1.length ===
    281
  ) {
    console.log(
      "\n🎯 The former 281 count came from combining canonical and legacy-only D1 records.",
    );
  } else {
    console.log(
      "\nThe former 281 count was not reproduced exactly. The generated CSVs will show which inventory definition produced the discrepancy.",
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });