// scripts/import-college-enrichment.ts

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROOT = process.cwd();
const ENRICHMENT_DIR = path.join(ROOT, "data", "enrichment");

const DRY_RUN = process.argv.includes("--dry-run");

type CsvRow = Record<string, string>;

function readCsv(fileName: string): CsvRow[] {
  const filePath = path.join(ENRICHMENT_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Missing ${fileName}; skipping.`);
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return parseCsv(raw);
}

function parseCsv(input: string): CsvRow[] {
  const lines: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      field = "";

      if (row.some((v) => v.trim() !== "")) {
        lines.push(row);
      }

      row = [];
      continue;
    }

    field += char;
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.some((v) => v.trim() !== "")) {
      lines.push(row);
    }
  }

  const [headers, ...records] = lines;
  if (!headers) return [];

  return records.map((record) => {
    const obj: CsvRow = {};
    headers.forEach((header, index) => {
      obj[header.trim()] = (record[index] ?? "").trim();
    });
    return obj;
  });
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

function parseBool(value: string | undefined, fallback = false): boolean {
  const v = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(v)) return true;
  if (["false", "0", "no", "n"].includes(v)) return false;
  return fallback;
}

function parseIntOrNull(value: string | undefined): number | null {
  const trimmed = String(value ?? "").replace(/[$,]/g, "").trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDecimalOrNull(value: string | undefined): string | null {
  const trimmed = String(value ?? "").replace(/[%,$]/g, "").trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? String(parsed) : null;
}

function parseDateOrNull(value: string | undefined): Date | null {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function requireCollegeBySlug(slug: string) {
  const college = await prisma.college.findUnique({
    where: { slug },
    include: {
      baseballProgram: true,
      nilProfile: {
        include: {
          collectives: true,
        },
      },
    },
  });

if (!college) {
  console.error(`❌ No college found for slug: "${slug}"`);
  throw new Error(`No college found for slug: ${slug}`);
}

  return college;
}

async function importAcademicProfiles() {
  const rows = readCsv("college-academic-profiles.csv");
  console.log(`\n📚 Academic profiles: ${rows.length}`);

  for (const row of rows) {
const slug = String(row.slug ?? "").trim();

if (!slug) {
  console.log("⚠️ Missing slug row:", row);
  continue;
}

console.log(`Processing slug: "${slug}"`);

    const college = await requireCollegeBySlug(slug);

    const data = {
      majorsSummary: emptyToNull(row.majorsSummary),
      strongestMajors: emptyToNull(row.strongestMajors),
      academicStrengthTags: emptyToNull(row.academicStrengthTags),
      intendedMajorCategories: emptyToNull(row.intendedMajorCategories),
      sportsManagement: parseBool(row.sportsManagement),
      kinesiology: parseBool(row.kinesiology),
      business: parseBool(row.business),
      engineering: parseBool(row.engineering),
      nursing: parseBool(row.nursing),
      communications: parseBool(row.communications),
      education: parseBool(row.education),
      biologyPreMed: parseBool(row.biologyPreMed),
      majorsUrl: emptyToNull(row.majorsUrl),
      sourceUrl: emptyToNull(row.sourceUrl),
      sourceType: emptyToNull(row.sourceType) as any,
      confidence: (emptyToNull(row.confidence) ?? "UNKNOWN") as any,
      verifiedAt: parseDateOrNull(row.verifiedAt),
    };

    if (DRY_RUN) {
      console.log(`  DRY academic: ${slug}`);
      continue;
    }

    await prisma.collegeAcademicProfile.upsert({
      where: { collegeId: college.id },
      update: data,
      create: {
        collegeId: college.id,
        ...data,
      },
    });

    console.log(`  ✅ academic: ${slug}`);
  }
}

async function importNilProfiles() {
  const rows = readCsv("college-nil-profiles.csv");
  console.log(`\n💰 NIL profiles: ${rows.length}`);

  for (const row of rows) {
const slug = String(row.slug ?? "").trim();

if (!slug) {
  console.log("⚠️ Missing slug row:", row);
  continue;
}

console.log(`Processing slug: "${slug}"`);

    const college = await requireCollegeBySlug(slug);

    const data = {
      nilAvailable: parseBool(row.nilAvailable),
      overallNilStrength: (emptyToNull(row.overallNilStrength) ?? "UNKNOWN") as any,
      baseballNilStrength: (emptyToNull(row.baseballNilStrength) ?? "UNKNOWN") as any,
      localMarketScore: parseIntOrNull(row.localMarketScore),
      localBusinessSupportScore: parseIntOrNull(row.localBusinessSupportScore),
      athleteBrandSupport: emptyToNull(row.athleteBrandSupport),
      nilSummary: emptyToNull(row.nilSummary),
      nilNotes: emptyToNull(row.nilNotes),
      sourceUrl: emptyToNull(row.sourceUrl),
      sourceType: emptyToNull(row.sourceType) as any,
      confidence: (emptyToNull(row.confidence) ?? "UNKNOWN") as any,
      verifiedAt: parseDateOrNull(row.verifiedAt),
    };

    if (DRY_RUN) {
      console.log(`  DRY NIL profile: ${slug}`);
      continue;
    }

    await prisma.collegeNilProfile.upsert({
      where: { collegeId: college.id },
      update: data,
      create: {
        collegeId: college.id,
        ...data,
      },
    });

    console.log(`  ✅ NIL profile: ${slug}`);
  }
}

async function importNilCollectives() {
  const rows = readCsv("college-nil-collectives.csv");
  console.log(`\n🏦 NIL collectives: ${rows.length}`);

  const touchedCollegeIds = new Set<string>();

  for (const row of rows) {
const slug = String(row.slug ?? "").trim();

if (!slug) {
  console.log("⚠️ Missing slug row:", row);
  continue;
}

console.log(`Processing slug: "${slug}"`);

    const college = await requireCollegeBySlug(slug);
    touchedCollegeIds.add(college.id);
  }

  if (!DRY_RUN) {
    for (const collegeId of touchedCollegeIds) {
      const nilProfile = await prisma.collegeNilProfile.findUnique({
        where: { collegeId },
      });

      if (nilProfile) {
        await prisma.collegeNilCollective.deleteMany({
          where: { nilProfileId: nilProfile.id },
        });
      }
    }
  }

  for (const row of rows) {
const slug = String(row.slug ?? "").trim();

if (!slug) {
  console.log("⚠️ Missing slug row:", row);
  continue;
}

console.log(`Processing slug: "${slug}"`);

    const college = await requireCollegeBySlug(slug);

    if (DRY_RUN) {
      console.log(`  DRY NIL collective: ${slug} / ${row.name}`);
      continue;
    }

    const nilProfile = await prisma.collegeNilProfile.upsert({
      where: { collegeId: college.id },
      update: {},
      create: {
        collegeId: college.id,
        nilAvailable: true,
      },
    });

    await prisma.collegeNilCollective.create({
      data: {
        nilProfileId: nilProfile.id,
        name: row.name,
        websiteUrl: emptyToNull(row.websiteUrl),
        xUrl: emptyToNull(row.xUrl),
        instagramUrl: emptyToNull(row.instagramUrl),
        contactEmail: emptyToNull(row.contactEmail),
        contactUrl: emptyToNull(row.contactUrl),
        estimatedAnnualValueCents: parseIntOrNull(row.estimatedAnnualValueCents),
        fundingTier: (emptyToNull(row.fundingTier) ?? "UNKNOWN") as any,
        notes: emptyToNull(row.notes),
        sourceUrl: emptyToNull(row.sourceUrl),
        sourceType: emptyToNull(row.sourceType) as any,
        confidence: (emptyToNull(row.confidence) ?? "UNKNOWN") as any,
        verifiedAt: parseDateOrNull(row.verifiedAt),
      },
    });

    console.log(`  ✅ NIL collective: ${slug} / ${row.name}`);
  }
}

async function importNilSportAllocations() {
  const rows = readCsv("college-nil-sport-allocations.csv");
  console.log(`\n⚾ NIL sport allocations: ${rows.length}`);

  for (const row of rows) {
    const slug = row.slug;
    const collectiveName = row.collectiveName;
    const sport = row.sport;

    if (!slug || !collectiveName || !sport) continue;

    const college = await requireCollegeBySlug(slug);

    if (DRY_RUN) {
      console.log(`  DRY NIL allocation: ${slug} / ${collectiveName} / ${sport}`);
      continue;
    }

    const nilProfile = await prisma.collegeNilProfile.findUnique({
      where: { collegeId: college.id },
      include: { collectives: true },
    });

    const collective = nilProfile?.collectives.find(
      (c) => c.name.trim().toLowerCase() === collectiveName.trim().toLowerCase()
    );

    if (!collective) {
      throw new Error(`No collective found for ${slug}: ${collectiveName}`);
    }

    await prisma.collegeNilSportAllocation.upsert({
      where: {
        collectiveId_sport: {
          collectiveId: collective.id,
          sport: sport as any,
        },
      },
      update: {
        estimatedAnnualAllocationCents: parseIntOrNull(row.estimatedAnnualAllocationCents),
        allocationPercent: parseDecimalOrNull(row.allocationPercent),
        strengthTier: (emptyToNull(row.strengthTier) ?? "UNKNOWN") as any,
        notes: emptyToNull(row.notes),
        sourceUrl: emptyToNull(row.sourceUrl),
        sourceType: emptyToNull(row.sourceType) as any,
        confidence: (emptyToNull(row.confidence) ?? "UNKNOWN") as any,
        verifiedAt: parseDateOrNull(row.verifiedAt),
      },
      create: {
        collectiveId: collective.id,
        sport: sport as any,
        estimatedAnnualAllocationCents: parseIntOrNull(row.estimatedAnnualAllocationCents),
        allocationPercent: parseDecimalOrNull(row.allocationPercent),
        strengthTier: (emptyToNull(row.strengthTier) ?? "UNKNOWN") as any,
        notes: emptyToNull(row.notes),
        sourceUrl: emptyToNull(row.sourceUrl),
        sourceType: emptyToNull(row.sourceType) as any,
        confidence: (emptyToNull(row.confidence) ?? "UNKNOWN") as any,
        verifiedAt: parseDateOrNull(row.verifiedAt),
      },
    });

    console.log(`  ✅ NIL allocation: ${slug} / ${collectiveName} / ${sport}`);
  }
}

async function importBaseballCoaches() {
  const verifiedRows = readCsv("college-baseball-coaches.verified.d1-pilot.csv");
const fallbackRows = verifiedRows.length
  ? []
  : readCsv("college-baseball-coaches.csv");

const rows = verifiedRows.length ? verifiedRows : fallbackRows;
  console.log(`\n👔 Baseball coaches: ${rows.length}`);

  const touchedProgramIds = new Set<string>();

  for (const row of rows) {
const slug = String(row.slug ?? "").trim();

if (!slug) {
  console.log("⚠️ Missing slug row:", row);
  continue;
}

console.log(`Processing slug: "${slug}"`);

    const college = await requireCollegeBySlug(slug);

    if (!college.baseballProgram) {
      throw new Error(`No baseball program found for slug: ${slug}`);
    }

    touchedProgramIds.add(college.baseballProgram.id);
  }

  if (!DRY_RUN) {
    for (const programId of touchedProgramIds) {
      await prisma.collegeBaseballCoach.deleteMany({
        where: { programId },
      });
    }
  }

  for (const row of rows) {
const slug = String(row.slug ?? "").trim();

if (!slug) {
  console.log("⚠️ Missing slug row:", row);
  continue;
}

console.log(`Processing slug: "${slug}"`);

    const college = await requireCollegeBySlug(slug);

    if (!college.baseballProgram) {
      throw new Error(`No baseball program found for slug: ${slug}`);
    }

    if (DRY_RUN) {
      console.log(`  DRY coach: ${slug} / ${row.name}`);
      continue;
    }

    await prisma.collegeBaseballCoach.create({
      data: {
        programId: college.baseballProgram.id,
        name: row.name,
        title: emptyToNull(row.title),
        email: emptyToNull(row.email),
        phone: emptyToNull(row.phone),
        bioUrl: emptyToNull(row.bioUrl),
        contactUrl: emptyToNull(row.contactUrl),
        headshotUrl: emptyToNull(row.headshotUrl),
        xUrl: emptyToNull(row.xUrl),
        instagramUrl: emptyToNull(row.instagramUrl),
        linkedinUrl: emptyToNull(row.linkedinUrl),
        isHeadCoach: parseBool(row.isHeadCoach),
      },
    });

    console.log(`  ✅ coach: ${slug} / ${row.name}`);
  }
}

async function main() {
  console.log(`ScoutLine enrichment import`);
  console.log(DRY_RUN ? `Mode: DRY RUN` : `Mode: WRITE`);

  await importAcademicProfiles();
  await importNilProfiles();
  await importNilCollectives();
  await importNilSportAllocations();
  await importBaseballCoaches();

  console.log(`\n✅ Done.`);
}

main()
  .catch((err) => {
    console.error("\n❌ Import failed:");
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });