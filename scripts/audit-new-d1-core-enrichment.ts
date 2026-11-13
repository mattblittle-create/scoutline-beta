// scripts/audit-new-d1-core-enrichment.ts

import fs from "fs";
import path from "path";
import {
  Prisma,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

const NEW_D1_SLUGS = [
  "university-of-california-santa-barbara",
  "california-polytechnic-state-university",
  "university-of-california-san-diego",
  "california-state-university-sacramento",
  "southern-illinois-university-edwardsville",
  "california-state-university-fullerton",
  "binghamton-university",
  "university-of-california-irvine",
  "university-of-hawaii-at-manoa",
  "hofstra-university",
  "university-of-maine",
  "university-of-california-davis",
  "lipscomb-university",
  "oral-roberts-university",
  "lindenwood-university",
  "bryant-university",
  "california-state-university-northridge",
  "university-of-maryland-baltimore-county",
  "university-of-massachusetts-lowell",
  "california-state-university-bakersfield",
  "south-dakota-state-university",
  "university-of-delaware",
  "california-state-university-long-beach",
  "university-of-nebraska-omaha",
  "iona-university",
  "la-salle-university",
  "university-of-california-riverside",
  "university-at-albany-suny",
  "north-dakota-state-university",
  "st-bonaventure-university",
  "new-jersey-institute-of-technology",
  "university-of-st-thomas-minnesota",
  "university-of-northern-colorado",
  "mercyhurst-university",
  "university-of-new-haven",
  "coppin-state-university",
] as const;

type NullableValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;

type AuditRow = {
  collegeId: string;
  programId: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  missingCollegeFields: string[];
  missingProgramFields: string[];
  missingFieldCount: number;
};

const COLLEGE_FIELDS = [
  "websiteUrl",
  "admissionsUrl",
  "academicsUrl",
  "majorsUrl",
  "applicationUrl",
  "financialAidUrl",
  "city",
  "state",
  "zipCode",
  "region",
  "latitude",
  "longitude",
  "control",
  "conference",
  "division",
  "logoUrl",
  "programWebsiteUrl",
  "programInstagramUrl",
  "programXUrl",
  "recruitingQuestionnaireUrl",
] as const;

const PROGRAM_FIELDS = [
  "nickname",
  "logoUrl",
  "baseballWebsiteUrl",
  "rosterUrl",
  "scheduleUrl",
  "campsUrl",
  "questionnaireUrl",
  "generalContactUrl",
  "generalContactEmail",
  "programXUrl",
  "programInstagramUrl",
  "programYoutubeUrl",
  "division",
  "conference",
  "dataSourceUrl",
  "lastVerifiedAt",
] as const;

function isMissing(value: NullableValue): boolean {
  if (value == null) return true;

  if (
    typeof value === "string" &&
    value.trim().length === 0
  ) {
    return true;
  }

  return false;
}

function missingFields<
  T extends object,
  K extends readonly (keyof T)[],
>(record: T, fields: K): string[] {
  return fields
    .filter((field) =>
      isMissing(record[field] as NullableValue),
    )
    .map(String);
}

function escapeCsv(value: unknown): string {
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

function timestampForPath(): string {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
}

function writeAuditCsv(
  outputDirectory: string,
  rows: AuditRow[],
): void {
  const headers = [
    "collegeId",
    "programId",
    "name",
    "slug",
    "city",
    "state",
    "missingCollegeFields",
    "missingProgramFields",
    "missingFieldCount",
  ];

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.collegeId,
        row.programId,
        row.name,
        row.slug,
        row.city,
        row.state,
        row.missingCollegeFields.join(" | "),
        row.missingProgramFields.join(" | "),
        row.missingFieldCount,
      ]
        .map(escapeCsv)
        .join(","),
    ),
  ];

  fs.writeFileSync(
    path.join(
      outputDirectory,
      "new-d1-core-enrichment-audit.csv",
    ),
    lines.join("\n"),
    "utf8",
  );
}

function writeMissingFieldSummaryCsv(
  outputDirectory: string,
  fieldCounts: Map<string, number>,
): void {
  const rows = Array.from(fieldCounts.entries())
    .map(([field, missingCount]) => ({
      field,
      missingCount,
    }))
    .sort((a, b) => {
      if (b.missingCount !== a.missingCount) {
        return b.missingCount - a.missingCount;
      }

      return a.field.localeCompare(b.field);
    });

  const lines = [
    "field,missingCount",
    ...rows.map((row) =>
      [
        escapeCsv(row.field),
        escapeCsv(row.missingCount),
      ].join(","),
    ),
  ];

  fs.writeFileSync(
    path.join(
      outputDirectory,
      "new-d1-missing-field-summary.csv",
    ),
    lines.join("\n"),
    "utf8",
  );
}

function writeEnrichmentTemplateCsv(
  outputDirectory: string,
  colleges: Array<{
    name: string;
    slug: string;
    city: string | null;
    state: string | null;
    websiteUrl: string | null;
    admissionsUrl: string | null;
    academicsUrl: string | null;
    majorsUrl: string | null;
    applicationUrl: string | null;
    financialAidUrl: string | null;

    tuitionInState: number | null;
    tuitionOutOfState: number | null;
    tuitionInternational: number | null;
    tuitionYear: number | null;
    enrollmentTotal: number | null;
    enrollmentUndergrad: number | null;
    acceptanceRate:
      | Prisma.Decimal
      | number
      | null;

    graduationRate:
      | Prisma.Decimal
      | number
      | null;
    dataSourceUrl: string | null;
    verificationStatus: string;

    zipCode: string | null;
    region: string | null;
    latitude: number | null;
    longitude: number | null;
    control: string | null;
    conference: string | null;
    division: string | null;
    logoUrl: string | null;
    programWebsiteUrl: string | null;
    programInstagramUrl: string | null;
    programXUrl: string | null;
    recruitingQuestionnaireUrl: string | null;
    baseballProgram: {
      nickname: string | null;
      logoUrl: string | null;
      baseballWebsiteUrl: string | null;
      rosterUrl: string | null;
      scheduleUrl: string | null;
      campsUrl: string | null;
      questionnaireUrl: string | null;
      generalContactUrl: string | null;
      generalContactEmail: string | null;
      programXUrl: string | null;
      programInstagramUrl: string | null;
      programYoutubeUrl: string | null;
      division: string | null;
      conference: string | null;
      dataSourceUrl: string | null;
      verificationStatus: string;
    } | null;
  }>,
): void {
  const headers = [
    "name",
    "slug",
    "city",
    "state",
    "zipCode",
    "region",
    "latitude",
    "longitude",
    "control",
    "schoolType",

    "websiteUrl",
    "admissionsUrl",
    "academicsUrl",
    "majorsUrl",
    "applicationUrl",
    "financialAidUrl",

    "tuitionInState",
    "tuitionOutOfState",
    "tuitionInternational",
    "tuitionYear",
    "enrollmentTotal",
    "enrollmentUndergrad",
    "acceptanceRate",
    "graduationRate",

    "dataSourceUrl",
    "verificationStatus",

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

    "currentRosterSize",
    "averageGpa",
    "scholarshipNotes",
    "scholarshipInfoUrl",
    "transferHeavy",
    "jucoFriendly",

    "baseballDataSourceUrl",
    "baseballVerificationStatus",
  ];

  const lines = [
    headers.join(","),
    ...colleges.map((college) => {
      const program = college.baseballProgram;

      const values: Record<string, unknown> = {
        name: college.name,
        slug: college.slug,
        city: college.city,
        state: college.state,
        zipCode: college.zipCode,
        region: college.region,
        latitude: college.latitude,
        longitude: college.longitude,
        control: college.control,
        schoolType: "FOUR_YEAR",

        websiteUrl: college.websiteUrl,
        admissionsUrl: college.admissionsUrl,
        academicsUrl: college.academicsUrl,
        majorsUrl: college.majorsUrl,
        applicationUrl: college.applicationUrl,
        financialAidUrl: college.financialAidUrl,

tuitionInState:
  college.tuitionInState ?? "",
tuitionOutOfState:
  college.tuitionOutOfState ?? "",
tuitionInternational:
  college.tuitionInternational ?? "",
tuitionYear:
  college.tuitionYear ?? "",
enrollmentTotal:
  college.enrollmentTotal ?? "",
enrollmentUndergrad:
  college.enrollmentUndergrad ?? "",
acceptanceRate:
  college.acceptanceRate ?? "",
graduationRate:
  college.graduationRate ?? "",

dataSourceUrl:
  college.dataSourceUrl ?? "",
verificationStatus:
  college.verificationStatus,

        baseballNickname: program?.nickname ?? "",
        baseballWebsiteUrl:
          program?.baseballWebsiteUrl ??
          college.programWebsiteUrl ??
          "",
        rosterUrl: program?.rosterUrl ?? "",
        scheduleUrl: program?.scheduleUrl ?? "",
        campsUrl: program?.campsUrl ?? "",
        questionnaireUrl:
          program?.questionnaireUrl ??
          college.recruitingQuestionnaireUrl ??
          "",
        generalContactUrl:
          program?.generalContactUrl ?? "",
        generalContactEmail:
          program?.generalContactEmail ?? "",

        division:
          program?.division ??
          college.division ??
          "NCAA_D1",
        conference:
          program?.conference ??
          college.conference ??
          "",
        logoUrl:
          program?.logoUrl ??
          college.logoUrl ??
          "",

        programXUrl:
          program?.programXUrl ??
          college.programXUrl ??
          "",
        programInstagramUrl:
          program?.programInstagramUrl ??
          college.programInstagramUrl ??
          "",
        programYoutubeUrl:
          program?.programYoutubeUrl ?? "",

        currentRosterSize: "",
        averageGpa: "",
        scholarshipNotes: "",
        scholarshipInfoUrl: "",
        transferHeavy: "false",
        jucoFriendly: "false",

        baseballDataSourceUrl:
          program?.dataSourceUrl ?? "",
        baseballVerificationStatus:
          program?.verificationStatus ??
          "UNVERIFIED",
      };

      return headers
        .map((header) => escapeCsv(values[header]))
        .join(",");
    }),
  ];

  fs.writeFileSync(
    path.join(
      outputDirectory,
      "new-d1-core-enrichment.csv",
    ),
    lines.join("\n"),
    "utf8",
  );
}

async function main(): Promise<void> {
  console.log("");
  console.log("=".repeat(100));
  console.log("NEW NCAA D1 CORE ENRICHMENT AUDIT");
  console.log("=".repeat(100));
  console.log("");
  console.log(
    `Expected newly created programs: ${NEW_D1_SLUGS.length}`,
  );

  const colleges = await prisma.college.findMany({
    where: {
      slug: {
        in: [...NEW_D1_SLUGS],
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,

      websiteUrl: true,
      admissionsUrl: true,
      academicsUrl: true,
      majorsUrl: true,
      applicationUrl: true,
      financialAidUrl: true,

      tuitionInState: true,
      tuitionOutOfState: true,
      tuitionInternational: true,
      tuitionYear: true,
      enrollmentTotal: true,
      enrollmentUndergrad: true,
      acceptanceRate: true,
      graduationRate: true,
      dataSourceUrl: true,
      verificationStatus: true,

      city: true,
      state: true,
      zipCode: true,
      region: true,
      latitude: true,
      longitude: true,
      control: true,

      conference: true,
      division: true,
      logoUrl: true,
      programWebsiteUrl: true,
      programInstagramUrl: true,
      programXUrl: true,
      recruitingQuestionnaireUrl: true,

      baseballProgram: {
        select: {
          id: true,
          nickname: true,
          logoUrl: true,
          baseballWebsiteUrl: true,
          rosterUrl: true,
          scheduleUrl: true,
          campsUrl: true,
          questionnaireUrl: true,
          generalContactUrl: true,
          generalContactEmail: true,
          programXUrl: true,
          programInstagramUrl: true,
          programYoutubeUrl: true,
          division: true,
          conference: true,
          dataSourceUrl: true,
          lastVerifiedAt: true,
          verificationStatus: true,
          _count: {
            select: {
              coaches: true,
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const foundSlugs = new Set(
    colleges.map((college) => college.slug),
  );

  const missingDatabaseSlugs = NEW_D1_SLUGS.filter(
    (slug) => !foundSlugs.has(slug),
  );

  if (missingDatabaseSlugs.length > 0) {
    console.log("");
    console.log("MISSING DATABASE RECORDS");
    console.log("-".repeat(100));

    for (const slug of missingDatabaseSlugs) {
      console.log(slug);
    }

    throw new Error(
      `Expected ${NEW_D1_SLUGS.length} colleges, but found ${colleges.length}.`,
    );
  }

  const programsMissing = colleges.filter(
    (college) => !college.baseballProgram,
  );

  if (programsMissing.length > 0) {
    console.log("");
    console.log("COLLEGES WITHOUT BASEBALL PROGRAMS");
    console.log("-".repeat(100));

    for (const college of programsMissing) {
      console.log(`${college.name} | ${college.slug}`);
    }

    throw new Error(
      `${programsMissing.length} college(s) are missing baseball programs.`,
    );
  }

  const auditRows: AuditRow[] = [];
  const fieldCounts = new Map<string, number>();

  let zeroCoachPrograms = 0;

  for (const college of colleges) {
    const program = college.baseballProgram;

    if (!program) {
      continue;
    }

    const missingCollegeFields = missingFields(
      college,
      COLLEGE_FIELDS,
    ).map((field) => `college.${field}`);

    const missingProgramFields = missingFields(
      program,
      PROGRAM_FIELDS,
    ).map((field) => `program.${field}`);

    const allMissingFields = [
      ...missingCollegeFields,
      ...missingProgramFields,
    ];

    for (const field of allMissingFields) {
      fieldCounts.set(
        field,
        (fieldCounts.get(field) ?? 0) + 1,
      );
    }

    if (program._count.coaches === 0) {
      zeroCoachPrograms++;
    }

    auditRows.push({
      collegeId: college.id,
      programId: program.id,
      name: college.name,
      slug: college.slug,
      city: college.city ?? "",
      state: college.state ?? "",
      missingCollegeFields,
      missingProgramFields,
      missingFieldCount: allMissingFields.length,
    });
  }

  auditRows.sort((a, b) => {
    if (b.missingFieldCount !== a.missingFieldCount) {
      return b.missingFieldCount - a.missingFieldCount;
    }

    return a.name.localeCompare(b.name);
  });

  const outputDirectory = path.join(
    process.cwd(),
    "data",
    "enrichment",
    "generated",
    `new-d1-core-enrichment-audit-${timestampForPath()}`,
  );

  fs.mkdirSync(outputDirectory, {
    recursive: true,
  });

writeAuditCsv(outputDirectory, auditRows);

writeMissingFieldSummaryCsv(
  outputDirectory,
  fieldCounts,
);

writeEnrichmentTemplateCsv(
  outputDirectory,
  colleges,
);

  const totalMissingFields = auditRows.reduce(
    (sum, row) => sum + row.missingFieldCount,
    0,
  );

  const fullyCompletePrograms = auditRows.filter(
    (row) => row.missingFieldCount === 0,
  ).length;

  const incompletePrograms =
    auditRows.length - fullyCompletePrograms;

  const sortedFieldCounts = Array.from(
    fieldCounts.entries(),
  ).sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }

    return a[0].localeCompare(b[0]);
  });

  console.log("");
  console.log("SUMMARY");
  console.log("-".repeat(100));
  console.log(`Colleges audited:             ${auditRows.length}`);
  console.log(`Fully complete:               ${fullyCompletePrograms}`);
  console.log(`Incomplete:                   ${incompletePrograms}`);
  console.log(`Total missing field values:   ${totalMissingFields}`);
  console.log(`Programs with zero coaches:   ${zeroCoachPrograms}`);

  console.log("");
  console.log("MISSING FIELD COUNTS");
  console.log("-".repeat(100));

  for (const [field, count] of sortedFieldCounts) {
    console.log(
      `${field.padEnd(45)} ${String(count).padStart(3)}`,
    );
  }

  console.log("");
  console.log("MOST INCOMPLETE PROGRAMS");
  console.log("-".repeat(100));

  for (const row of auditRows.slice(0, 15)) {
    console.log(
      `${String(row.missingFieldCount).padStart(2)} missing | ${row.name}`,
    );
  }

  console.log("");
  console.log(`Output directory: ${outputDirectory}`);
  console.log(
    "Working file: new-d1-core-enrichment.csv",
  );
  console.log("");
  console.log(
    "Audit complete. No ScoutLine database records were created, updated, or deleted.",
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error("New D1 core enrichment audit failed.");

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