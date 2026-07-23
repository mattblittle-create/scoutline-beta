// scripts/import-college-enrichment.ts

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROOT = process.cwd();
const ENRICHMENT_DIR = path.join(ROOT, "data", "enrichment");

const ARGS = process.argv.slice(2);

const SHOW_HELP =
  ARGS.includes("--help") ||
  ARGS.includes("-h");

const WRITE_MODE =
  ARGS.includes("--write");

const DRY_RUN =
  !WRITE_MODE;

const ONLY_PROGRAM_SOCIALS =
  ARGS.includes(
    "--only-program-socials",
  );

  const ONLY_COACHES =
  ARGS.includes(
    "--only-coaches",
  );

function getArgumentValue(
  flag: string,
): string | null {
  const flagIndex =
    ARGS.indexOf(flag);

  if (
    flagIndex === -1 ||
    flagIndex ===
      ARGS.length - 1
  ) {
    return null;
  }

  const value =
    ARGS[flagIndex + 1];

  if (
    !value ||
    value.startsWith("--")
  ) {
    return null;
  }

  return value;
}

const PROGRAM_SOCIALS_FILE =
  getArgumentValue(
    "--program-socials",
  );

  const COACHES_FILE =
  getArgumentValue(
    "--coaches",
  );

type CsvRow = Record<string, string>;

function resolveCsvPath(
  fileNameOrPath: string,
): string {
  if (
    path.isAbsolute(
      fileNameOrPath,
    )
  ) {
    return fileNameOrPath;
  }

  const projectRelativePath =
    path.resolve(
      ROOT,
      fileNameOrPath,
    );

  if (
    fs.existsSync(
      projectRelativePath,
    )
  ) {
    return projectRelativePath;
  }

  return path.join(
    ENRICHMENT_DIR,
    fileNameOrPath,
  );
}

function readCsv(
  fileNameOrPath: string,
): CsvRow[] {
  const filePath =
    resolveCsvPath(
      fileNameOrPath,
    );

  if (
    !fs.existsSync(
      filePath,
    )
  ) {
    console.log(
      `⚠️ Missing CSV; skipping: ${filePath}`,
    );

    return [];
  }

  const raw =
    fs
      .readFileSync(
        filePath,
        "utf8",
      )
      .replace(
        /^\uFEFF/,
        "",
      );

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

function normalizedCoachTitle(
  value: string | undefined,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");
}

function isHeadCoachRow(
  row: CsvRow,
): boolean {
  if (
    parseBool(
      row.isHeadCoach,
    )
  ) {
    return true;
  }

  const title =
    normalizedCoachTitle(
      row.title,
    );

  if (!title) {
    return false;
  }

  const nonHeadCoachTerms = [
    "associate head coach",
    "assistant head coach",
    "assistant to the head coach",
    "special assistant to the head coach",
  ];

  if (
    nonHeadCoachTerms.some(
      (term) =>
        title.includes(term),
    )
  ) {
    return false;
  }

const isNamedDirectorHeadCoach =
  title ===
    "director of baseball" ||
  title.endsWith(
    " director of baseball",
  );

return (
  title.includes(
    "head coach",
  ) ||
  title.includes(
    "head baseball coach",
  ) ||
  title.includes(
    "head coaching chair",
  ) ||
  title.includes(
    "head coach of baseball",
  ) ||
  isNamedDirectorHeadCoach
);
}

function isImportableCoach(
  row: CsvRow,
): boolean {
  const name =
    String(
      row.name ?? "",
    ).trim();

  const lowerName =
    name.toLowerCase();

  const title =
    normalizedCoachTitle(
      row.title,
    );

  if (
    !name ||
    !title
  ) {
    return false;
  }

  const badExactNames = [
    "full bio",
    "bio",
    "view bio",
    "read bio",
    "baseball",
    "baseball staff",
    "baseball coaching staff",
    "coaching staff",
  ];

  if (
    badExactNames.includes(
      lowerName,
    )
  ) {
    return false;
  }

  const badNamePrefixes = [
    "full bio ",
    "view bio ",
    "read bio ",
  ];

  if (
    badNamePrefixes.some(
      (prefix) =>
        lowerName.startsWith(
          prefix,
        ),
    )
  ) {
    return false;
  }

  const badNameTerms = [
    "basketball",
    "football",
    "soccer",
    "golf",
    "volleyball",
    "track",
    "softball",
    "wrestling",
    "lacrosse",
    "cheerleading",
    "rowing",
    "tennis",
    "ticketing",
    "team roster",
    "news schedule",
    "staff directory",
    "sports covered",
    "alma mater",
    "coaches coaches",
  ];

  if (
    badNameTerms.some(
      (term) =>
        lowerName.includes(
          term,
        ),
    )
  ) {
    return false;
  }

  const excludedTitleTerms = [
    "director of operations",
    "baseball operations",
    "director of baseball strategy",
    "director of baseball player personnel",
    "assistant director of operations",
    "operations coordinator",
    "director of player development",
    "director of baseball player development",
    "assistant director of player development",
    "player development coordinator",
    "director of pitching development",
    "director of hitting development",
    "pitching development",
    "hitting development",
    "director of baseball analytics",
    "baseball analytics",
    "pitching analytics",
    "hitting analytics",
    "video coordinator",
    "creative video",
    "quality control",
    "strength & conditioning",
    "strength and conditioning",
    "strenght coach",
    "sports performance",
    "baseball performance",
    "athletic performance",
    "athletic trainer",
    "communications",
    "equipment",
    "video analytics",
    "team manager",
    "graduate assistant",
    "graduate manager",
    "student assistant",
    "undergraduate assistant",
    "volunteer assistant",
    "scouting assistant",
    "special assistant",
  ];

  if (
    excludedTitleTerms.some(
      (term) =>
        title.includes(term),
    )
  ) {
    return false;
  }

const isCoachTitle =
  title.includes("coach");

const isRecruitingTitle =
  title.includes(
    "recruiting coordinator",
  ) ||
  title.includes(
    "director of recruiting",
  );

const isConfirmedHeadCoach =
  isHeadCoachRow(row);

if (
  !isCoachTitle &&
  !isRecruitingTitle &&
  !isConfirmedHeadCoach
) {
  return false;
}

  const nameParts =
    name
      .split(/\s+/)
      .filter(Boolean);

  if (
    nameParts.length < 2 ||
    nameParts.length > 5
  ) {
    return false;
  }

  return true;
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
    throw new Error(
      `No college found for slug: ${slug}`,
    );
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

async function importProgramSocials(
  dryRun: boolean,
) {
  const programSocialsFile =
    PROGRAM_SOCIALS_FILE ??
    "college-program-socials.csv";

  const rows =
    readCsv(
      programSocialsFile,
    );

  console.log(
    `Program socials CSV: ${resolveCsvPath(
      programSocialsFile,
    )}`,
  );

  console.log(
    `\n📣 Program socials: ${rows.length}`,
  );

  let updatedCount = 0;
  let missingCollegeCount = 0;
  let missingProgramCount = 0;

  for (const row of rows) {
    const slug = String(
      row.slug || "",
    ).trim();

    if (!slug) {
      console.log(
        "⚠️ Missing slug row:",
        row,
      );

      continue;
    }

    console.log(
      `Processing slug: "${slug}"`,
    );

    const college =
      await prisma.college.findUnique({
        where: {
          slug,
        },
        select: {
          id: true,
        },
      });

    if (!college) {
      missingCollegeCount += 1;

      console.log(
        `  ⚠️ College not found; skipped: ${slug}`,
      );

      continue;
    }

    const data = {
      programWebsiteUrl:
        emptyToNull(
          row.baseballWebsiteUrl,
        ),

      programXUrl:
        emptyToNull(
          row.programXUrl,
        ),

      programInstagramUrl:
        emptyToNull(
          row.programInstagramUrl,
        ),

      recruitingQuestionnaireUrl:
        emptyToNull(
          row.questionnaireUrl ||
            row.recruitingQuestionnaireUrl,
        ),
    };

    const programData = {
      nickname:
        emptyToNull(
          row.nickname,
        ),

      logoUrl:
        emptyToNull(
          row.logoUrl,
        ),

      baseballWebsiteUrl:
        emptyToNull(
          row.baseballWebsiteUrl,
        ),

      rosterUrl:
        emptyToNull(
          row.rosterUrl,
        ),

      scheduleUrl:
        emptyToNull(
          row.scheduleUrl,
        ),

      campsUrl:
        emptyToNull(
          row.campsUrl,
        ),

      questionnaireUrl:
        emptyToNull(
          row.questionnaireUrl ||
            row.recruitingQuestionnaireUrl,
        ),

      generalContactUrl:
        emptyToNull(
          row.generalContactUrl ||
            row.recruitsPageUrl,
        ),

      generalContactEmail:
        emptyToNull(
          row.generalContactEmail,
        ),

      programXUrl:
        emptyToNull(
          row.programXUrl,
        ),

      programInstagramUrl:
        emptyToNull(
          row.programInstagramUrl,
        ),

      programYoutubeUrl:
        emptyToNull(
          row.programYoutubeUrl,
        ),

      division:
        emptyToNull(
          row.division,
        ) as any,

      conference:
        emptyToNull(
          row.conference,
        ),

      dataSourceUrl:
        emptyToNull(
          row.sourceUrl,
        ),

      verificationStatus:
        "NEEDS_REVIEW" as const,
    };

    if (dryRun) {
      console.log(
        `  DRY program socials: ${slug}`,
      );

      continue;
    }

    await prisma.college.update({
      where: {
        id: college.id,
      },
      data,
    });

    const programResult =
      await prisma.collegeBaseballProgram.updateMany({
        where: {
          collegeId:
            college.id,
        },
        data:
          programData,
      });

    if (
      programResult.count === 0
    ) {
      missingProgramCount += 1;

      console.log(
        `  ⚠️ Baseball program not found; college updated only: ${slug}`,
      );

      continue;
    }

    updatedCount += 1;

    console.log(
      `  ✅ program socials: ${slug}`,
    );
  }

  console.log(
    "\n📣 Program socials summary",
  );

  console.log(
    `  Updated: ${updatedCount}`,
  );

  console.log(
    `  Missing colleges skipped: ${missingCollegeCount}`,
  );

  console.log(
    `  Missing baseball programs: ${missingProgramCount}`,
  );
}

async function importBaseballCoaches() {
  const rows = COACHES_FILE
    ? readCsv(COACHES_FILE)
    : [];

  console.log(
    `\n👔 Baseball coach source rows: ${rows.length}`,
  );

  if (rows.length === 0) {
    throw new Error(
      "No coach rows were found. Supply --coaches <path>.",
    );
  }

  const importableRowsBySlug =
    new Map<string, CsvRow[]>();

  let missingSlugCount = 0;
  let skippedRowCount = 0;

  for (const row of rows) {
    const slug =
      String(row.slug ?? "").trim();

    if (!slug) {
      missingSlugCount += 1;
      console.log(
        "  ⚠️ Missing slug row:",
        row,
      );
      continue;
    }

    if (!isImportableCoach(row)) {
      skippedRowCount += 1;

      console.log(
        `  ⚠️ Skipping coach row: ${slug} / ${
          row.name || ""
        } / ${row.title || ""}`,
      );

      continue;
    }

    const existingRows =
      importableRowsBySlug.get(slug) ??
      [];

    existingRows.push(row);

    importableRowsBySlug.set(
      slug,
      existingRows,
    );
  }

  console.log(
    `  Importable schools: ${importableRowsBySlug.size}`,
  );

  console.log(
    `  Importable coach rows: ${
      Array.from(
        importableRowsBySlug.values(),
      ).reduce(
        (total, schoolRows) =>
          total + schoolRows.length,
        0,
      )
    }`,
  );

  console.log(
    `  Skipped non-importable rows: ${skippedRowCount}`,
  );

  console.log(
    `  Missing-slug rows: ${missingSlugCount}`,
  );

let importedCoachCount = 0;
let replacedProgramCount = 0;
let missingProgramCount = 0;

  for (
    const [slug, schoolRows]
    of importableRowsBySlug.entries()
  ) {
    console.log(
      `\nProcessing coach staff: "${slug}"`,
    );

const college =
      await prisma.college.findUnique({
        where: {
          slug,
        },
        include: {
          baseballProgram: true,
        },
      });

if (!college) {
  console.log(
    `  ⚠️ Unknown college slug; skipping coach staff: ${slug}`,
  );

  continue;
}

if (!college.baseballProgram) {
  missingProgramCount += 1;

  console.log(
    `  ⚠️ No baseball program; skipping coach staff: ${slug}`,
  );

  continue;
}

const hasHeadCoach =
  schoolRows.some(
    isHeadCoachRow,
  );

if (!hasHeadCoach) {
  console.log(
    `  ⚠️ No confirmed head coach; preserving existing staff: ${slug}`,
  );

  for (
    const row
    of schoolRows
  ) {
    console.log(
      `    Preserved candidate: ${row.name} / ${
        row.title || ""
      }`,
    );
  }

  continue;
}

    if (DRY_RUN) {
      console.log(
        `  DRY replace: ${schoolRows.length} coach row(s)`,
      );

      for (const row of schoolRows) {
        console.log(
          `    DRY coach: ${row.name} / ${
            row.title || ""
          }`,
        );
      }

      replacedProgramCount += 1;
      importedCoachCount +=
        schoolRows.length;

      continue;
    }

    await prisma.$transaction(
      async (transaction) => {
        await transaction
          .collegeBaseballCoach
          .deleteMany({
            where: {
              programId:
                college.baseballProgram!.id,
            },
          });

        for (const row of schoolRows) {
          await transaction
            .collegeBaseballCoach
            .create({
              data: {
                programId:
                  college.baseballProgram!.id,
                name:
                  String(
                    row.name ?? "",
                  ).trim(),
                title:
                  emptyToNull(
                    row.title,
                  ),
                email:
                  emptyToNull(
                    row.email,
                  ),
                phone:
                  emptyToNull(
                    row.phone,
                  ),
                bioUrl:
                  emptyToNull(
                    row.bioUrl,
                  ),
                contactUrl:
                  emptyToNull(
                    row.contactUrl,
                  ),
                headshotUrl:
                  emptyToNull(
                    row.headshotUrl,
                  ),
                xUrl:
                  emptyToNull(
                    row.xUrl,
                  ),
                instagramUrl:
                  emptyToNull(
                    row.instagramUrl,
                  ),
                linkedinUrl:
                  emptyToNull(
                    row.linkedinUrl,
                  ),
                isHeadCoach:
                  parseBool(
                    row.isHeadCoach,
                  ),
              },
            });
        }
      },
    );

    replacedProgramCount += 1;
    importedCoachCount +=
      schoolRows.length;

    console.log(
      `  ✅ Replaced staff with ${schoolRows.length} coach row(s)`,
    );
  }

  console.log(
    "\n👔 Baseball coach import summary",
  );

  console.log(
    `  Programs processed: ${replacedProgramCount}`,
  );

  console.log(
    `  Coaches processed: ${importedCoachCount}`,
  );

  console.log(
    `  Skipped rows: ${skippedRowCount}`,
  );

  console.log(
    `  Missing-slug rows: ${missingSlugCount}`,
  );

  console.log(
    `  Schools without baseball programs: ${missingProgramCount}`,
  );
}

function printHelp() {
  console.log(`
ScoutLine enrichment import

Usage:
  npx tsx scripts/import-college-enrichment.ts [options]

Safety:
  The importer defaults to DRY RUN.
  Database writes require --write.

Options:
  --help, -h
      Show this help message.

  --write
      Enable database writes.

  --dry-run
      Run without database writes.
      This is also the default mode.

  --only-program-socials
      Import only program-social data.

  --program-socials <path>
      Import program-social data from a specific CSV.

  --only-coaches
      Import only baseball coach data.

  --coaches <path>
      Import baseball coach data from a specific CSV.

Example dry run:
  npx tsx scripts/import-college-enrichment.ts --only-program-socials --program-socials "data/enrichment/generated/college-web-presence-2026-07-23T19-42-08-756Z/college-program-socials.generated.csv"

Example write:
  npx tsx scripts/import-college-enrichment.ts --write --only-program-socials --program-socials "data/enrichment/generated/college-web-presence-2026-07-23T19-42-08-756Z/college-program-socials.generated.csv"

  Example coach dry run:
  npx tsx scripts/import-college-enrichment.ts --only-coaches --coaches "data/enrichment/generated/college-baseball-coaches.dom.generated.2026-07-20T19-05-22-833Z.csv"

Example coach write:
  npx tsx scripts/import-college-enrichment.ts --write --only-coaches --coaches "data/enrichment/generated/college-baseball-coaches.dom.generated.2026-07-20T19-05-22-833Z.csv"
`);
}

async function main() {
  if (SHOW_HELP) {
    printHelp();
    return;
  }

  if (
    ARGS.includes("--dry-run") &&
    WRITE_MODE
  ) {
    throw new Error(
      "Use either --dry-run or --write, not both.",
    );
  }

  if (
    ONLY_PROGRAM_SOCIALS &&
    !PROGRAM_SOCIALS_FILE
  ) {
    throw new Error(
      "--only-program-socials requires --program-socials <path>.",
    );
  }

  if (
  ONLY_COACHES &&
  !COACHES_FILE
) {
  throw new Error(
    "--only-coaches requires --coaches <path>.",
  );
}

if (
  ONLY_PROGRAM_SOCIALS &&
  ONLY_COACHES
) {
  throw new Error(
    "Use either --only-program-socials or --only-coaches, not both.",
  );
}

  console.log(
    "ScoutLine enrichment import",
  );

  console.log(
    DRY_RUN
      ? "Mode: DRY RUN"
      : "Mode: WRITE",
  );

if (ONLY_COACHES) {
  await importBaseballCoaches();
} else if (ONLY_PROGRAM_SOCIALS) {
  await importProgramSocials(
    DRY_RUN,
  );
} else {
  await importAcademicProfiles();
  await importNilProfiles();
  await importNilCollectives();
  await importNilSportAllocations();

  await importProgramSocials(
    DRY_RUN,
  );
}

  console.log(
    "\n✅ Done.",
  );
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