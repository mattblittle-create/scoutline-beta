// scripts/audit-college-baseball-coaches.ts

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const IMPORT_SOURCE = "DOM_ENRICHMENT";

const GENERATED_DIRECTORY = path.join(
  process.cwd(),
  "data",
  "enrichment",
  "generated",
);

type Division =
  | "NCAA_D1"
  | "NCAA_D2"
  | "NCAA_D3"
  | "NAIA"
  | "NJCAA_D1"
  | "NJCAA_D2"
  | "NJCAA_D3";

type AuditRow = {
  programId: string;
  schoolName: string;
  slug: string;
  division: string;
  issue: string;
  coachId: string;
  coachName: string;
  title: string;
  email: string;
  phone: string;
  dataSource: string;
  reviewStatus: string;
  isActive: string;
  isHeadCoach: string;
  lastSeenAt: string;
  bioUrl: string;
  contactUrl: string;
};

function getArgumentValue(flag: string): string | null {
  const exactIndex = process.argv.indexOf(flag);

  if (exactIndex !== -1) {
    return process.argv[exactIndex + 1] ?? null;
  }

  const prefixedArgument = process.argv.find((argument) =>
    argument.startsWith(`${flag}=`),
  );

  if (!prefixedArgument) {
    return null;
  }

  return prefixedArgument.slice(flag.length + 1) || null;
}

function getDivision(): Division {
  const value = (
    getArgumentValue("--division") || "NCAA_D1"
  ).toUpperCase();

  const allowed: Division[] = [
    "NCAA_D1",
    "NCAA_D2",
    "NCAA_D3",
    "NAIA",
    "NJCAA_D1",
    "NJCAA_D2",
    "NJCAA_D3",
  ];

  if (!allowed.includes(value as Division)) {
    throw new Error(
      `Unsupported division "${value}". Allowed values: ${allowed.join(", ")}`,
    );
  }

  return value as Division;
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

function normalizePhone(value: string | null): string {
  const digits = value?.replace(/\D/g, "") ?? "";

  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }

  return digits;
}

function isValidEmail(value: string | null): boolean {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string | null): boolean {
  if (!value) {
    return true;
  }

  const normalized = value.trim();

  const extensionMatch = normalized.match(
    /(?:ext\.?|extension|x)\s*(\d+)$/i,
  );

  const basePhone = extensionMatch
    ? normalized.slice(0, extensionMatch.index).trim()
    : normalized;

  const digits = normalizePhone(basePhone);

  return digits.length === 10;
}

function isSharedOrTemporaryHeadCoachTitle(
  title: string | null,
): boolean {
  const normalized = String(title || "").toLowerCase();

  return (
    normalized.includes("co-head coach") ||
    normalized.includes("acting head coach") ||
    normalized.includes("interim head coach")
  );
}

function hasOfficialUrl(coach: {
  bioUrl: string | null;
  contactUrl: string | null;
  sourceUrl: string | null;
}): boolean {
  return Boolean(
    coach.bioUrl?.trim() ||
      coach.contactUrl?.trim() ||
      coach.sourceUrl?.trim(),
  );
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
  outputPath: string,
  rows: AuditRow[],
): void {
  const headers: Array<keyof AuditRow> = [
    "programId",
    "schoolName",
    "slug",
    "division",
    "issue",
    "coachId",
    "coachName",
    "title",
    "email",
    "phone",
    "dataSource",
    "reviewStatus",
    "isActive",
    "isHeadCoach",
    "lastSeenAt",
    "bioUrl",
    "contactUrl",
  ];

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsv(row[header])).join(","),
    ),
  ];

  fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
}

function formatTimestamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[:.]/g, "-");
}

async function main(): Promise<void> {
  const division = getDivision();
  const now = new Date();

  const programs =
    await prisma.collegeBaseballProgram.findMany({
      where: {
        division,
      },
      select: {
        id: true,
        division: true,
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
            sourceUrl: true,
            dataSource: true,
            reviewStatus: true,
            isActive: true,
            isHeadCoach: true,
            lastSeenAt: true,
            manuallyVerifiedAt: true,
            claimedByUserId: true,
          },
          orderBy: [
            {
              isHeadCoach: "desc",
            },
            {
              name: "asc",
            },
          ],
        },
      },
      orderBy: {
        college: {
          name: "asc",
        },
      },
    });

  const issueRows: AuditRow[] = [];

  let totalCoaches = 0;
  let activeCoaches = 0;
  let inactiveCoaches = 0;
  let protectedRecords = 0;
  let activeDomRecords = 0;
  let activeManualRecords = 0;

  const programsWithZeroActiveCoaches: string[] = [];
  const programsWithZeroHeadCoaches: string[] = [];
  const programsWithMultipleHeadCoaches: string[] = [];

  const staleCutoff = new Date(now);
  staleCutoff.setDate(staleCutoff.getDate() - 120);

  const addIssue = (
    program: (typeof programs)[number],
    issue: string,
    coach?: (typeof program.coaches)[number],
  ): void => {
    issueRows.push({
      programId: program.id,
      schoolName: program.college.name,
      slug: program.college.slug,
      division: program.division || division,
      issue,
      coachId: coach?.id ?? "",
      coachName: coach?.name ?? "",
      title: coach?.title ?? "",
      email: coach?.email ?? "",
      phone: coach?.phone ?? "",
      dataSource: coach?.dataSource ?? "",
      reviewStatus: coach?.reviewStatus ?? "",
      isActive:
        coach === undefined ? "" : String(coach.isActive),
      isHeadCoach:
        coach === undefined ? "" : String(coach.isHeadCoach),
      lastSeenAt:
        coach?.lastSeenAt?.toISOString() ?? "",
      bioUrl: coach?.bioUrl ?? "",
      contactUrl: coach?.contactUrl ?? "",
    });
  };

  for (const program of programs) {
    totalCoaches += program.coaches.length;

    const active = program.coaches.filter(
      (coach) => coach.isActive,
    );

    const inactive = program.coaches.filter(
      (coach) => !coach.isActive,
    );

    const activeHeadCoaches = active.filter(
      (coach) => coach.isHeadCoach,
    );

    activeCoaches += active.length;
    inactiveCoaches += inactive.length;

    if (active.length === 0) {
      programsWithZeroActiveCoaches.push(
        program.college.name,
      );

      addIssue(
        program,
        "PROGRAM_WITH_ZERO_ACTIVE_COACHES",
      );
    }

    if (activeHeadCoaches.length === 0) {
      programsWithZeroHeadCoaches.push(
        program.college.name,
      );

      addIssue(
        program,
        "PROGRAM_WITH_ZERO_ACTIVE_HEAD_COACHES",
      );
    }

const hasSharedOrTemporaryLeadership =
  activeHeadCoaches.some((coach) =>
    isSharedOrTemporaryHeadCoachTitle(coach.title),
  );

if (
  activeHeadCoaches.length > 1 &&
  !hasSharedOrTemporaryLeadership
) {
      programsWithMultipleHeadCoaches.push(
        program.college.name,
      );

      for (const coach of activeHeadCoaches) {
        addIssue(
          program,
          "PROGRAM_WITH_MULTIPLE_ACTIVE_HEAD_COACHES",
          coach,
        );
      }
    }

    const activeByNormalizedName = new Map<
      string,
      typeof active
    >();

    for (const coach of active) {
      const normalized = normalizeName(coach.name);
      const matches =
        activeByNormalizedName.get(normalized) ?? [];

      matches.push(coach);
      activeByNormalizedName.set(normalized, matches);
    }

    for (const duplicates of activeByNormalizedName.values()) {
      if (duplicates.length < 2) {
        continue;
      }

      for (const coach of duplicates) {
        addIssue(
          program,
          "DUPLICATE_ACTIVE_COACH_NAME",
          coach,
        );
      }
    }

    for (const coach of program.coaches) {
      const isProtected =
        coach.manuallyVerifiedAt !== null ||
        coach.claimedByUserId !== null;

      if (isProtected) {
        protectedRecords += 1;
      }

      if (coach.isActive) {
        if (coach.dataSource === IMPORT_SOURCE) {
          activeDomRecords += 1;
        } else {
          activeManualRecords += 1;
        }
      }

      if (!coach.isActive) {
        continue;
      }

      if (!coach.name.trim()) {
        addIssue(
          program,
          "ACTIVE_COACH_MISSING_NAME",
          coach,
        );
      }

      if (!coach.title?.trim()) {
        addIssue(
          program,
          "ACTIVE_COACH_MISSING_TITLE",
          coach,
        );
      }

      if (
        coach.isHeadCoach &&
        !coach.email?.trim()
      ) {
        addIssue(
          program,
          "ACTIVE_HEAD_COACH_MISSING_EMAIL",
          coach,
        );
      }

      if (!isValidEmail(coach.email)) {
        addIssue(
          program,
          "MALFORMED_EMAIL",
          coach,
        );
      }

      if (!isValidPhone(coach.phone)) {
        addIssue(
          program,
          "MALFORMED_PHONE",
          coach,
        );
      }

      if (!hasOfficialUrl(coach)) {
        addIssue(
          program,
          "MISSING_ALL_OFFICIAL_URLS",
          coach,
        );
      }

      if (
        coach.dataSource === IMPORT_SOURCE &&
        coach.lastSeenAt === null
      ) {
        addIssue(
          program,
          "ACTIVE_DOM_RECORD_NEVER_SEEN",
          coach,
        );
      }

      if (
        coach.dataSource === IMPORT_SOURCE &&
        coach.lastSeenAt !== null &&
        coach.lastSeenAt < staleCutoff
      ) {
        addIssue(
          program,
          "STALE_ACTIVE_DOM_RECORD",
          coach,
        );
      }

      if (
        coach.reviewStatus === "NEEDS_REVIEW"
      ) {
        addIssue(
          program,
          "ACTIVE_RECORD_NEEDS_REVIEW",
          coach,
        );
      }
    }
  }

  const issueCounts = new Map<string, number>();

  for (const row of issueRows) {
    issueCounts.set(
      row.issue,
      (issueCounts.get(row.issue) ?? 0) + 1,
    );
  }

  const outputDirectory = path.join(
    GENERATED_DIRECTORY,
    `coach-database-audit-${division.toLowerCase()}-${formatTimestamp(now)}`,
  );

  fs.mkdirSync(outputDirectory, {
    recursive: true,
  });

  const exceptionsCsvPath = path.join(
    outputDirectory,
    "coach-audit-exceptions.csv",
  );

  writeCsv(exceptionsCsvPath, issueRows);

  const summaryPath = path.join(
    outputDirectory,
    "summary.txt",
  );

  const summaryLines = [
    "=".repeat(80),
    `COLLEGE BASEBALL COACH DATABASE AUDIT — ${division}`,
    "=".repeat(80),
    "",
    `Programs audited:                         ${programs.length}`,
    `Total coach records:                      ${totalCoaches}`,
    `Active coach records:                     ${activeCoaches}`,
    `Inactive coach records:                   ${inactiveCoaches}`,
    `Active DOM enrichment records:            ${activeDomRecords}`,
    `Active non-DOM/manual records:             ${activeManualRecords}`,
    `Protected claimed/verified records:        ${protectedRecords}`,
    "",
    `Programs with zero active coaches:        ${programsWithZeroActiveCoaches.length}`,
    `Programs with zero active head coaches:   ${programsWithZeroHeadCoaches.length}`,
    `Programs with multiple head coaches:      ${programsWithMultipleHeadCoaches.length}`,
    `Total audit exception rows:               ${issueRows.length}`,
    "",
    "ISSUE COUNTS",
    "-".repeat(80),
    ...[...issueCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([issue, count]) =>
          `${issue.padEnd(48)} ${count}`,
      ),
    "",
    `Exceptions CSV: ${exceptionsCsvPath}`,
    "=".repeat(80),
  ];

  fs.writeFileSync(
    summaryPath,
    `${summaryLines.join("\n")}\n`,
    "utf8",
  );

  console.log(summaryLines.join("\n"));

  if (programsWithZeroActiveCoaches.length > 0) {
    console.log("");
    console.log("PROGRAMS WITH ZERO ACTIVE COACHES");
    console.log("-".repeat(80));

    for (const school of programsWithZeroActiveCoaches) {
      console.log(school);
    }
  }

  if (programsWithZeroHeadCoaches.length > 0) {
    console.log("");
    console.log("PROGRAMS WITH ZERO ACTIVE HEAD COACHES");
    console.log("-".repeat(80));

    for (const school of programsWithZeroHeadCoaches) {
      console.log(school);
    }
  }

  if (programsWithMultipleHeadCoaches.length > 0) {
    console.log("");
    console.log("PROGRAMS WITH MULTIPLE ACTIVE HEAD COACHES");
    console.log("-".repeat(80));

    for (const school of programsWithMultipleHeadCoaches) {
      console.log(school);
    }
  }

  console.log("");
  console.log(`Wrote audit output to: ${outputDirectory}`);
}

main()
  .catch((error) => {
    console.error("");
    console.error("Audit failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });