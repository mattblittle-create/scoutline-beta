// scripts/audit-college-program-data.ts

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type AuditRow = {
  collegeId: string;
  collegeName: string;
  slug: string;
  city: string;
  state: string;
  division: string;
  conference: string;
  hasBaseballProgram: boolean;
  missingNickname: boolean;
  missingConference: boolean;
  missingBaseballWebsite: boolean;
  missingRoster: boolean;
  missingSchedule: boolean;
  missingQuestionnaire: boolean;
  missingAdmissions: boolean;
  missingAcademics: boolean;
  missingNilProfile: boolean;
  missingNilCollective: boolean;
  missingNilWebsite: boolean;
};

function csvCell(value: unknown): string {
  const text = String(value ?? "");

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

function boolText(value: boolean): string {
  return value ? "YES" : "NO";
}

function normalizeDivision(value: unknown): string {
  const division = String(value ?? "").trim();

  return division || "UNASSIGNED";
}

function printFieldCounts(
  title: string,
  rows: AuditRow[]
) {
  const counts = {
    noBaseballProgram: rows.filter((row) => !row.hasBaseballProgram).length,
    nickname: rows.filter((row) => row.missingNickname).length,
    conference: rows.filter((row) => row.missingConference).length,
    baseballWebsite: rows.filter((row) => row.missingBaseballWebsite).length,
    roster: rows.filter((row) => row.missingRoster).length,
    schedule: rows.filter((row) => row.missingSchedule).length,
    questionnaire: rows.filter((row) => row.missingQuestionnaire).length,
    admissions: rows.filter((row) => row.missingAdmissions).length,
    academics: rows.filter((row) => row.missingAcademics).length,
    nilProfile: rows.filter((row) => row.missingNilProfile).length,
    nilCollective: rows.filter((row) => row.missingNilCollective).length,
    nilWebsite: rows.filter((row) => row.missingNilWebsite).length,
  };

  console.log();
  console.log(title);
  console.log("-".repeat(title.length));

  for (const [field, count] of Object.entries(counts)) {
    console.log(
      `${field.padEnd(20)} ${String(count).padStart(5)} missing`
    );
  }

  console.log(`${"total".padEnd(20)} ${String(rows.length).padStart(5)} records`);
}

async function main() {
  const colleges = await prisma.college.findMany({
    include: {
      baseballProgram: true,
      nilProfile: {
        include: {
          collectives: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const rows: AuditRow[] = colleges.map((college) => {
    const program = college.baseballProgram;
    const collectives = college.nilProfile?.collectives ?? [];

    const division = normalizeDivision(
      program?.division ?? college.division
    );

    const conference =
      String(program?.conference ?? college.conference ?? "").trim();

    return {
      collegeId: college.id,
      collegeName: college.name,
      slug: college.slug,
      city: college.city ?? "",
      state: college.state ?? "",
      division,
      conference,
      hasBaseballProgram: Boolean(program),
      missingNickname: !program?.nickname,
      missingConference: !conference,
      missingBaseballWebsite: !program?.baseballWebsiteUrl,
      missingRoster: !program?.rosterUrl,
      missingSchedule: !program?.scheduleUrl,
      missingQuestionnaire:
        !program?.questionnaireUrl &&
        !college.recruitingQuestionnaireUrl,
      missingAdmissions: !college.admissionsUrl,
      missingAcademics:
        !college.academicsUrl &&
        !college.majorsUrl,
      missingNilProfile: !college.nilProfile,
      missingNilCollective:
        Boolean(college.nilProfile) &&
        collectives.length === 0,
      missingNilWebsite:
        collectives.length === 0 ||
        !collectives.some((collective) => collective.websiteUrl),
    };
  });

  console.log();
  console.log("========== COLLEGE PROGRAM DATA AUDIT ==========");

  printFieldCounts("ALL COLLEGES", rows);

  const divisions = Array.from(
    new Set(rows.map((row) => row.division))
  ).sort((a, b) => a.localeCompare(b));

  for (const division of divisions) {
    const divisionRows = rows.filter(
      (row) => row.division === division
    );

    printFieldCounts(division, divisionRows);
  }

  const outputDir = path.join(
    process.cwd(),
    "data",
    "enrichment",
    "generated"
  );

  fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const outputPath = path.join(
    outputDir,
    `college-program-data-audit.${timestamp}.csv`
  );

  const headers: Array<keyof AuditRow> = [
    "collegeId",
    "collegeName",
    "slug",
    "city",
    "state",
    "division",
    "conference",
    "hasBaseballProgram",
    "missingNickname",
    "missingConference",
    "missingBaseballWebsite",
    "missingRoster",
    "missingSchedule",
    "missingQuestionnaire",
    "missingAdmissions",
    "missingAcademics",
    "missingNilProfile",
    "missingNilCollective",
    "missingNilWebsite",
  ];

  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header];

          return csvCell(
            typeof value === "boolean"
              ? boolText(value)
              : value
          );
        })
        .join(",")
    ),
  ];

  fs.writeFileSync(
    outputPath,
    `${csvLines.join("\n")}\n`,
    "utf8"
  );

  console.log();
  console.log(`CSV written to: ${outputPath}`);
  console.log();
}

main()
  .catch((error) => {
    console.error("COLLEGE_PROGRAM_AUDIT_ERROR", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });