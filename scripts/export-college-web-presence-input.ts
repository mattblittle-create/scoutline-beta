// scripts/export-college-web-presence-input.ts

// scripts/export-college-web-presence-input.ts

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROOT = process.cwd();

const GENERATED_DIR = path.join(
  ROOT,
  "data",
  "enrichment",
  "generated",
);

type InputRow = {
  collegeId: string;
  slug: string;
  name: string;
  missingFields: string;

  websiteUrl: string;
  admissionsUrl: string;
  academicsUrl: string;
  majorsUrl: string;

  baseballNickname: string;
  baseballWebsiteUrl: string;
  rosterUrl: string;
  scheduleUrl: string;
  campsUrl: string;
  questionnaireUrl: string;
  generalContactUrl: string;
  generalContactEmail: string;

  division: string;
  conference: string;
  logoUrl: string;

  programXUrl: string;
  programInstagramUrl: string;
  programYoutubeUrl: string;
};

const OUTPUT_HEADERS: Array<keyof InputRow> = [
  "collegeId",
  "slug",
  "name",
  "missingFields",

  "websiteUrl",
  "admissionsUrl",
  "academicsUrl",
  "majorsUrl",

  "baseballNickname",
  "baseballWebsiteUrl",
  "rosterUrl",
  "scheduleUrl",
  "campsUrl",
  "questionnaireUrl",
  "generalContactUrl",
  "generalContactEmail",

  "division",
  "conference",
  "logoUrl",

  "programXUrl",
  "programInstagramUrl",
  "programYoutubeUrl",
];

function getArgValue(
  flag: string,
): string | undefined {
  const index = process.argv.indexOf(flag);

  if (index !== -1) {
    return process.argv[index + 1];
  }

  /*
   * Some npm/PowerShell combinations remove custom
   * flag names while retaining their values.
   *
   * Example:
   *   --division NCAA_D1 --limit 5
   *
   * may arrive as:
   *   NCAA_D1 5
   */
  const positionalArgs =
    process.argv
      .slice(2)
      .filter(
        (value) =>
          !value.startsWith("--"),
      );

  if (flag === "--division") {
    return positionalArgs[0];
  }

  if (flag === "--limit") {
    return positionalArgs[1];
  }

  return undefined;
}

function parsePositiveInt(
  value: string | undefined,
): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : null;
}

function normalizeDivision(
  value: string | undefined,
): string | null {
  const cleaned = String(value ?? "")
    .trim()
    .toUpperCase();

  return cleaned || null;
}

function timestampForPath(): string {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
}

function escapeCsv(
  value: unknown,
): string {
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

function getMissingWebPresenceFields(
  row: InputRow,
): string[] {
  const missingFields: string[] = [];

  if (!row.websiteUrl) {
    missingFields.push("websiteUrl");
  }

  if (!row.admissionsUrl) {
    missingFields.push("admissionsUrl");
  }

  if (
    !row.academicsUrl &&
    !row.majorsUrl
  ) {
    missingFields.push(
      "academicsUrl",
      "majorsUrl",
    );
  }

  if (!row.baseballNickname) {
    missingFields.push(
      "baseballNickname",
    );
  }

  if (!row.conference) {
    missingFields.push("conference");
  }

  if (!row.baseballWebsiteUrl) {
    missingFields.push(
      "baseballWebsiteUrl",
    );
  }

  if (!row.rosterUrl) {
    missingFields.push("rosterUrl");
  }

  if (!row.scheduleUrl) {
    missingFields.push("scheduleUrl");
  }

  if (!row.campsUrl) {
    missingFields.push("campsUrl");
  }

  if (!row.questionnaireUrl) {
    missingFields.push(
      "questionnaireUrl",
    );
  }

  if (!row.generalContactUrl) {
    missingFields.push(
      "generalContactUrl",
    );
  }

  if (!row.generalContactEmail) {
    missingFields.push(
      "generalContactEmail",
    );
  }

  if (!row.logoUrl) {
    missingFields.push("logoUrl");
  }

  if (!row.programXUrl) {
    missingFields.push("programXUrl");
  }

  if (!row.programInstagramUrl) {
    missingFields.push(
      "programInstagramUrl",
    );
  }

  if (!row.programYoutubeUrl) {
    missingFields.push(
      "programYoutubeUrl",
    );
  }

  return missingFields;
}

async function main(): Promise<void> {
  const requestedDivision =
    normalizeDivision(
      getArgValue("--division"),
    );

  const limit =
    parsePositiveInt(
      getArgValue("--limit"),
    );

  const colleges =
    await prisma.college.findMany({
      where: {
        baseballProgram: {
          isNot: null,
        },
      },
      include: {
        baseballProgram: true,
      },
      orderBy: [
        {
          name: "asc",
        },
      ],
    });

  const mappedRows: InputRow[] =
    colleges.map((college) => {
      const program =
        college.baseballProgram;

      const division =
        String(
          program?.division ??
            college.division ??
            "",
        ).trim();

      const conference =
        String(
          program?.conference ??
            college.conference ??
            "",
        ).trim();

      return {
        collegeId: college.id,
        slug: college.slug,
        name: college.name,
        missingFields: "",

        websiteUrl:
          college.websiteUrl ?? "",

        admissionsUrl:
          college.admissionsUrl ?? "",

        academicsUrl:
          college.academicsUrl ?? "",

        majorsUrl:
          college.majorsUrl ?? "",

        baseballNickname:
          program?.nickname ?? "",

        baseballWebsiteUrl:
          program?.baseballWebsiteUrl ??
          college.programWebsiteUrl ??
          "",

        rosterUrl:
          program?.rosterUrl ?? "",

        scheduleUrl:
          program?.scheduleUrl ?? "",

        campsUrl:
          program?.campsUrl ?? "",

        questionnaireUrl:
          program?.questionnaireUrl ??
          college.recruitingQuestionnaireUrl ??
          "",

        generalContactUrl:
          program?.generalContactUrl ?? "",

        generalContactEmail:
          program?.generalContactEmail ?? "",

        division,
        conference,

        logoUrl:
          program?.logoUrl ??
          college.logoUrl ??
          "",

        programXUrl:
          program?.programXUrl ?? "",

        programInstagramUrl:
          program?.programInstagramUrl ??
          "",

        programYoutubeUrl:
          program?.programYoutubeUrl ??
          "",
      };
    });

  const realProgramRows =
    mappedRows.filter((row) => {
      return (
        row.name.trim().toUpperCase() !==
          "TEST" &&
        row.slug.trim().toLowerCase() !==
          "test"
      );
    });

  const divisionRows =
    requestedDivision
      ? realProgramRows.filter(
          (row) =>
            row.division.toUpperCase() ===
            requestedDivision,
        )
      : realProgramRows;

const missingRows =
  divisionRows
    .map((row) => {
      const missingFields =
        getMissingWebPresenceFields(
          row,
        );

      return {
        ...row,
        missingFields:
          missingFields.join("|"),
      };
    })
    .filter(
      (row) =>
        Boolean(row.missingFields),
    );

  const selectedRows =
    limit
      ? missingRows.slice(0, limit)
      : missingRows;

  fs.mkdirSync(
    GENERATED_DIR,
    {
      recursive: true,
    },
  );

  const outputPath =
    path.join(
      GENERATED_DIR,
      `college-web-presence-input.${timestampForPath()}.csv`,
    );

  const csvLines = [
    OUTPUT_HEADERS.join(","),
    ...selectedRows.map((row) =>
      OUTPUT_HEADERS
        .map((header) =>
          escapeCsv(row[header]),
        )
        .join(","),
    ),
  ];

  fs.writeFileSync(
    outputPath,
    `${csvLines.join("\n")}\n`,
    "utf8",
  );

  console.log("");
  console.log(
    "=".repeat(90),
  );
  console.log(
    "SCOUTLINE COLLEGE WEB-PRESENCE INPUT EXPORT",
  );
  console.log(
    "=".repeat(90),
  );
  console.log("");
  console.log(
    `Colleges with baseball programs: ${realProgramRows.length}`,
  );
  console.log(
    `Requested division:             ${requestedDivision ?? "ALL"}`,
  );
  console.log(
    `Division records:               ${divisionRows.length}`,
  );
  console.log(
    `Records missing target fields:  ${missingRows.length}`,
  );
  console.log(
    `Rows exported:                  ${selectedRows.length}`,
  );
  console.log("");
  console.log(
    `Output CSV: ${outputPath}`,
  );
  console.log("");
  console.log(
    "No ScoutLine database records were created, updated, or deleted.",
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "College web-presence input export failed.",
    );

    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });