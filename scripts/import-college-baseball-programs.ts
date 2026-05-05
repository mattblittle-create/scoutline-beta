// scripts/import-college-baseball-programs.ts

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CollegeRegion =
  | "NORTHEAST"
  | "MID_ATLANTIC"
  | "SOUTHEAST"
  | "MIDWEST"
  | "SOUTHWEST"
  | "WEST"
  | "PACIFIC";

type CollegeControl = "PUBLIC" | "PRIVATE";

type CollegeSchoolType =
  | "FOUR_YEAR"
  | "TWO_YEAR"
  | "COMMUNITY_COLLEGE"
  | "JUNIOR_COLLEGE"
  | "OTHER";

type Division =
  | "NCAA_D1"
  | "NCAA_D2"
  | "NCAA_D3"
  | "NAIA"
  | "NJCAA_D1"
  | "NJCAA_D2"
  | "NJCAA_D3"
  | "OTHER";

type VerificationStatus = "UNVERIFIED" | "VERIFIED" | "NEEDS_REVIEW" | "BROKEN_LINK";

type CsvRow = {
  name: string;
  slug: string;
  city?: string;
  state?: string;
  region?: CollegeRegion;
  control?: CollegeControl;
  schoolType?: CollegeSchoolType;
  websiteUrl?: string;
  admissionsUrl?: string;
  academicsUrl?: string;
  majorsUrl?: string;
  applicationUrl?: string;
  financialAidUrl?: string;
  tuitionInState?: string;
  tuitionOutOfState?: string;
  tuitionInternational?: string;
  tuitionYear?: string;
  enrollmentTotal?: string;
  enrollmentUndergrad?: string;
  acceptanceRate?: string;
  graduationRate?: string;
  dataSourceUrl?: string;
  verificationStatus?: VerificationStatus;

  baseballNickname?: string;
  baseballWebsiteUrl?: string;
  rosterUrl?: string;
  scheduleUrl?: string;
  campsUrl?: string;
  questionnaireUrl?: string;
  generalContactUrl?: string;
  generalContactEmail?: string;
  division?: Division;
  conference?: string;
  logoUrl?: string;
  currentRosterSize?: string;
  averageGpa?: string;
  scholarshipNotes?: string;
  scholarshipInfoUrl?: string;
  transferHeavy?: string;
  jucoFriendly?: string;
  baseballDataSourceUrl?: string;
  baseballVerificationStatus?: VerificationStatus;
};

const CSV_PATH = path.join(process.cwd(), "data", "college-baseball-programs.csv");

function clean(value: unknown): string | undefined {
  const s = String(value ?? "").trim();
  return s || undefined;
}

function intOrUndefined(value: unknown): number | undefined {
  const s = clean(value);
  if (!s) return undefined;

  const n = Number(s.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

function decimalOrUndefined(value: unknown): number | undefined {
  const s = clean(value);
  if (!s) return undefined;

  const n = Number(s.replace(/[%,$,]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function boolOrDefault(value: unknown, fallback = false): boolean {
  const s = String(value ?? "").trim().toLowerCase();
  if (!s) return fallback;
  return ["true", "yes", "y", "1"].includes(s);
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  out.push(current);
  return out.map((v) => v.trim());
}

function parseCsv(content: string): CsvRow[] {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row as CsvRow;
  });
}

function requireField(row: CsvRow, field: keyof CsvRow) {
  const value = clean(row[field]);
  if (!value) {
    throw new Error(`Missing required field "${String(field)}" for row: ${JSON.stringify(row)}`);
  }
  return value;
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV not found at ${CSV_PATH}`);
  }

  const content = fs.readFileSync(CSV_PATH, "utf8");
  const rows = parseCsv(content);

  console.log(`Found ${rows.length} college baseball program rows.`);

  let seeded = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = requireField(row, "name");
    const slug = requireField(row, "slug");

    const state = clean(row.state);
    if (!state) {
      console.warn(`Skipping ${name}: missing state.`);
      skipped += 1;
      continue;
    }

    const college = await prisma.college.upsert({
      where: { slug },
      update: {
        name,
        websiteUrl: clean(row.websiteUrl),
        admissionsUrl: clean(row.admissionsUrl),
        academicsUrl: clean(row.academicsUrl),
        majorsUrl: clean(row.majorsUrl),
        applicationUrl: clean(row.applicationUrl),
        financialAidUrl: clean(row.financialAidUrl),
        city: clean(row.city),
        state,
        region: row.region || undefined,
        control: row.control || undefined,
        schoolType: row.schoolType || undefined,
        tuitionInState: intOrUndefined(row.tuitionInState),
        tuitionOutOfState: intOrUndefined(row.tuitionOutOfState),
        tuitionInternational: intOrUndefined(row.tuitionInternational),
        tuitionYear: intOrUndefined(row.tuitionYear),
        enrollmentTotal: intOrUndefined(row.enrollmentTotal),
        enrollmentUndergrad: intOrUndefined(row.enrollmentUndergrad),
        acceptanceRate: decimalOrUndefined(row.acceptanceRate),
        graduationRate: decimalOrUndefined(row.graduationRate),
        dataSourceUrl: clean(row.dataSourceUrl),
        verificationStatus: row.verificationStatus || "UNVERIFIED",
      },
      create: {
        name,
        slug,
        websiteUrl: clean(row.websiteUrl),
        admissionsUrl: clean(row.admissionsUrl),
        academicsUrl: clean(row.academicsUrl),
        majorsUrl: clean(row.majorsUrl),
        applicationUrl: clean(row.applicationUrl),
        financialAidUrl: clean(row.financialAidUrl),
        city: clean(row.city),
        state,
        region: row.region || undefined,
        control: row.control || undefined,
        schoolType: row.schoolType || undefined,
        tuitionInState: intOrUndefined(row.tuitionInState),
        tuitionOutOfState: intOrUndefined(row.tuitionOutOfState),
        tuitionInternational: intOrUndefined(row.tuitionInternational),
        tuitionYear: intOrUndefined(row.tuitionYear),
        enrollmentTotal: intOrUndefined(row.enrollmentTotal),
        enrollmentUndergrad: intOrUndefined(row.enrollmentUndergrad),
        acceptanceRate: decimalOrUndefined(row.acceptanceRate),
        graduationRate: decimalOrUndefined(row.graduationRate),
        dataSourceUrl: clean(row.dataSourceUrl),
        verificationStatus: row.verificationStatus || "UNVERIFIED",
      },
    });

    if (row.division || row.baseballWebsiteUrl || row.baseballNickname || row.conference) {
      await prisma.collegeBaseballProgram.upsert({
        where: { collegeId: college.id },
        update: {
          nickname: clean(row.baseballNickname),
          logoUrl: clean(row.logoUrl),
          baseballWebsiteUrl: clean(row.baseballWebsiteUrl),
          rosterUrl: clean(row.rosterUrl),
          scheduleUrl: clean(row.scheduleUrl),
          campsUrl: clean(row.campsUrl),
          questionnaireUrl: clean(row.questionnaireUrl),
          generalContactUrl: clean(row.generalContactUrl),
          generalContactEmail: clean(row.generalContactEmail),
          division: row.division || undefined,
          conference: clean(row.conference),
          currentRosterSize: intOrUndefined(row.currentRosterSize),
          averageGpa: decimalOrUndefined(row.averageGpa),
          scholarshipNotes: clean(row.scholarshipNotes),
          scholarshipInfoUrl: clean(row.scholarshipInfoUrl),
          transferHeavy: boolOrDefault(row.transferHeavy),
          jucoFriendly: boolOrDefault(row.jucoFriendly),
          dataSourceUrl: clean(row.baseballDataSourceUrl),
          verificationStatus: row.baseballVerificationStatus || "UNVERIFIED",
        },
        create: {
          collegeId: college.id,
          nickname: clean(row.baseballNickname),
          logoUrl: clean(row.logoUrl),
          baseballWebsiteUrl: clean(row.baseballWebsiteUrl),
          rosterUrl: clean(row.rosterUrl),
          scheduleUrl: clean(row.scheduleUrl),
          campsUrl: clean(row.campsUrl),
          questionnaireUrl: clean(row.questionnaireUrl),
          generalContactUrl: clean(row.generalContactUrl),
          generalContactEmail: clean(row.generalContactEmail),
          division: row.division || undefined,
          conference: clean(row.conference),
          currentRosterSize: intOrUndefined(row.currentRosterSize),
          averageGpa: decimalOrUndefined(row.averageGpa),
          scholarshipNotes: clean(row.scholarshipNotes),
          scholarshipInfoUrl: clean(row.scholarshipInfoUrl),
          transferHeavy: boolOrDefault(row.transferHeavy),
          jucoFriendly: boolOrDefault(row.jucoFriendly),
          dataSourceUrl: clean(row.baseballDataSourceUrl),
          verificationStatus: row.baseballVerificationStatus || "UNVERIFIED",
        },
      });
    }

    seeded += 1;
    console.log(`Seeded: ${name}`);
  }

  console.log(`Done. Seeded ${seeded}; skipped ${skipped}.`);
}

main()
  .catch((err) => {
    console.error("IMPORT_COLLEGE_BASEBALL_PROGRAMS_ERROR", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });