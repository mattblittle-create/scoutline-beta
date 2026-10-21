// scripts/diagnose-missing-d1-programs.ts

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type DiagnosticStatus =
  | "COLLEGE_AND_PROGRAM_MISSING"
  | "COLLEGE_EXISTS_PROGRAM_MISSING"
  | "PROGRAM_EXISTS_WRONG_DIVISION"
  | "PROGRAM_EXISTS_D1_UNMATCHED"
  | "POSSIBLE_DUPLICATE_COLLEGE"
  | "AMBIGUOUS_CANDIDATES";

type MissingInventoryRow = {
  rank: string;
  ncaaSchool: string;
  normalizedNcaa: string;
  season: string;
  source: string;
};

type CollegeRecord = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  division: string | null;
  conference: string | null;
  baseballProgram: {
    id: string;
    division: string | null;
    conference: string | null;
    baseballWebsiteUrl: string | null;
  } | null;
};

type CandidateMatch = {
  college: CollegeRecord;
  matchReason:
    | "EXACT_NORMALIZED"
    | "EXPECTED_NAME"
    | "CORE_NAME"
    | "TOKEN_MATCH";
  score: number;
};

/**
 * These aliases are only used to diagnose whether a College row already
 * exists under a longer or alternate database name.
 *
 * They do not create, update, match, or delete database records.
 */
const EXPECTED_DATABASE_NAMES: Record<string, string[]> = {
  "uc santa barbara": [
    "university of california santa barbara",
    "university of california at santa barbara",
    "uc santa barbara",
  ],

  "cal poly": [
    "california polytechnic state university",
    "california polytechnic state university san luis obispo",
    "cal poly san luis obispo",
    "cal poly slo",
  ],

  "uc san diego": [
    "university of california san diego",
    "university of california at san diego",
    "uc san diego",
  ],

  "sacramento state": [
    "california state university sacramento",
    "california state university at sacramento",
    "cal state sacramento",
    "sacramento state university",
    "sacramento state",
  ],

  siue: [
    "southern illinois university edwardsville",
    "southern illinois university at edwardsville",
    "siu edwardsville",
    "siue",
  ],

  "cal state fullerton": [
    "california state university fullerton",
    "california state university at fullerton",
    "cal state fullerton",
  ],

  binghamton: [
    "binghamton university",
    "state university of new york at binghamton",
    "suny binghamton",
  ],

  "uc irvine": [
    "university of california irvine",
    "university of california at irvine",
    "uc irvine",
  ],

  hawaii: [
    "university of hawaii at manoa",
    "university of hawaii manoa",
    "university of hawaii",
    "hawaii",
  ],

  hofstra: [
    "hofstra university",
    "hofstra",
  ],

  maine: [
    "university of maine",
    "university of maine at orono",
    "maine",
  ],

  "uc davis": [
    "university of california davis",
    "university of california at davis",
    "uc davis",
  ],

  lipscomb: [
    "lipscomb university",
    "lipscomb",
  ],

  "oral roberts": [
    "oral roberts university",
    "oral roberts",
  ],

  lindenwood: [
    "lindenwood university",
    "lindenwood",
  ],

  bryant: [
    "bryant university",
    "bryant",
  ],

  csun: [
    "california state university northridge",
    "california state university at northridge",
    "cal state northridge",
    "csun",
  ],

  umbc: [
    "university of maryland baltimore county",
    "university of maryland at baltimore county",
    "maryland baltimore county",
    "umbc",
  ],

  "umass lowell": [
    "university of massachusetts lowell",
    "university of massachusetts at lowell",
    "massachusetts lowell",
    "umass lowell",
  ],

  "california state university bakersfield": [
    "california state university bakersfield",
    "california state university at bakersfield",
    "cal state bakersfield",
    "csu bakersfield",
  ],

  "south dakota state": [
    "south dakota state university",
    "south dakota state",
  ],

  "long beach state": [
    "california state university long beach",
    "california state university at long beach",
    "cal state long beach",
    "long beach state university",
    "long beach state",
  ],

  omaha: [
    "university of nebraska omaha",
    "university of nebraska at omaha",
    "nebraska omaha",
    "omaha",
  ],

  iona: [
    "iona university",
    "iona college",
    "iona",
  ],

  "la salle": [
    "la salle university",
    "lasalle university",
    "la salle",
  ],

  "uc riverside": [
    "university of california riverside",
    "university of california at riverside",
    "uc riverside",
  ],

  ualbany: [
    "university at albany",
    "university at albany suny",
    "state university of new york at albany",
    "suny albany",
    "ualbany",
  ],

  "north dakota state": [
    "north dakota state university",
    "north dakota state",
  ],

  "state bonaventure": [
    "st bonaventure university",
    "saint bonaventure university",
    "st bonaventure",
    "saint bonaventure",
  ],

  njit: [
    "new jersey institute of technology",
    "njit",
  ],

  "state thomas mn": [
    "university of st thomas",
    "university of saint thomas",
    "university of st thomas minnesota",
    "university of saint thomas minnesota",
    "st thomas minnesota",
  ],

  "northern colo": [
    "university of northern colorado",
    "northern colorado",
  ],

  mercyhurst: [
    "mercyhurst university",
    "mercyhurst college",
    "mercyhurst",
  ],

  "new haven": [
    "university of new haven",
    "new haven",
  ],

  "coppin state": [
    "coppin state university",
    "coppin state",
  ],

  delaware: [
    "university of delaware",
    "delaware",
  ],
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "college",
  "of",
  "the",
  "university",
]);

function normalizeSchoolName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bst[.]?\b/g, "state")
    .replace(/\bcal st\b/g, "cal state")
    .replace(/\bcsu\b/g, "california state university")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulTokens(value: string): string[] {
  return normalizeSchoolName(value)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !STOP_WORDS.has(token));
}

function coreSchoolName(value: string): string {
  return meaningfulTokens(value).join(" ");
}

function getExpectedNames(row: MissingInventoryRow): Set<string> {
  const normalizedKey = normalizeSchoolName(row.normalizedNcaa);
  const rawKey = normalizeSchoolName(row.ncaaSchool);

  const aliases = [
    ...(EXPECTED_DATABASE_NAMES[normalizedKey] ?? []),
    ...(EXPECTED_DATABASE_NAMES[rawKey] ?? []),
  ];

  return new Set(
    [
      row.ncaaSchool,
      row.normalizedNcaa,
      normalizedKey,
      rawKey,
      ...aliases,
    ].map(normalizeSchoolName),
  );
}

function tokenScore(reference: string, candidate: string): number {
  const referenceTokens = new Set(meaningfulTokens(reference));
  const candidateTokens = new Set(meaningfulTokens(candidate));

  if (referenceTokens.size === 0 || candidateTokens.size === 0) {
    return 0;
  }

  let shared = 0;

  for (const token of referenceTokens) {
    if (candidateTokens.has(token)) {
      shared += 1;
    }
  }

  const coverage = shared / referenceTokens.size;
  const precision = shared / candidateTokens.size;

  return Number(((coverage * 0.7 + precision * 0.3) * 100).toFixed(2));
}

function findCandidates(
  row: MissingInventoryRow,
  colleges: CollegeRecord[],
): CandidateMatch[] {
  const expectedNames = getExpectedNames(row);
  const normalizedNcaa = normalizeSchoolName(row.ncaaSchool);
  const normalizedInput = normalizeSchoolName(row.normalizedNcaa);
  const referenceCore = coreSchoolName(row.ncaaSchool);

  const matches = new Map<string, CandidateMatch>();

  for (const college of colleges) {
    const normalizedCollege = normalizeSchoolName(college.name);
    const collegeCore = coreSchoolName(college.name);

    let candidate: CandidateMatch | null = null;

    if (
      normalizedCollege === normalizedNcaa ||
      normalizedCollege === normalizedInput
    ) {
      candidate = {
        college,
        matchReason: "EXACT_NORMALIZED",
        score: 100,
      };
    } else if (expectedNames.has(normalizedCollege)) {
      candidate = {
        college,
        matchReason: "EXPECTED_NAME",
        score: 99,
      };
    } else if (
      referenceCore.length >= 4 &&
      collegeCore === referenceCore
    ) {
      candidate = {
        college,
        matchReason: "CORE_NAME",
        score: 95,
      };
    } else {
      const score = Math.max(
        tokenScore(row.ncaaSchool, college.name),
        tokenScore(row.normalizedNcaa, college.name),
      );

      /**
       * Token matches are diagnostic suggestions only.
       * A reasonably high threshold prevents one-word names from matching
       * unrelated schools such as Delaware → Delaware State.
       */
      if (score >= 72) {
        candidate = {
          college,
          matchReason: "TOKEN_MATCH",
          score,
        };
      }
    }

    if (!candidate) {
      continue;
    }

    const previous = matches.get(college.id);

    if (!previous || candidate.score > previous.score) {
      matches.set(college.id, candidate);
    }
  }

  return [...matches.values()]
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.college.name.localeCompare(b.college.name);
    })
    .slice(0, 10);
}

function classifyCandidates(
  candidates: CandidateMatch[],
): DiagnosticStatus {
  /**
   * Only deterministic name matches are authoritative enough to classify
   * an existing College or CollegeBaseballProgram.
   *
   * TOKEN_MATCH candidates remain visible in candidateSummary, but they
   * must not cause an NCAA school to be treated as an existing program.
   */
  const authoritativeCandidates = candidates.filter(
    (candidate) =>
      candidate.matchReason === "EXACT_NORMALIZED" ||
      candidate.matchReason === "EXPECTED_NAME" ||
      candidate.matchReason === "CORE_NAME",
  );

  if (authoritativeCandidates.length === 0) {
    return "COLLEGE_AND_PROGRAM_MISSING";
  }

  if (authoritativeCandidates.length > 1) {
    const uniqueCollegeIds = new Set(
      authoritativeCandidates.map(
        (candidate) => candidate.college.id,
      ),
    );

    if (uniqueCollegeIds.size > 1) {
      return "POSSIBLE_DUPLICATE_COLLEGE";
    }
  }

  const primaryCandidate = authoritativeCandidates[0];

  if (!primaryCandidate.college.baseballProgram) {
    return "COLLEGE_EXISTS_PROGRAM_MISSING";
  }

  if (
    primaryCandidate.college.baseballProgram.division === "NCAA_D1"
  ) {
    return "PROGRAM_EXISTS_D1_UNMATCHED";
  }

  return "PROGRAM_EXISTS_WRONG_DIVISION";
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];

      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);

  return values;
}

function readMissingInventoryCsv(
  inputPath: string,
): MissingInventoryRow[] {
  const raw = fs.readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error(`No missing inventory rows found in ${inputPath}`);
  }

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record = Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );

    return {
      rank: record.rank ?? "",
      ncaaSchool: record.ncaaSchool ?? "",
      normalizedNcaa: record.normalizedNcaa ?? "",
      season: record.season ?? "",
      source: record.source ?? "",
    };
  });
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function findLatestMissingInventoryCsv(): string {
  const generatedRoot = path.resolve(
    process.cwd(),
    "data",
    "enrichment",
    "generated",
  );

  if (!fs.existsSync(generatedRoot)) {
    throw new Error(
      `Generated enrichment directory not found: ${generatedRoot}`,
    );
  }

  const candidates = fs
    .readdirSync(generatedRoot, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith("d1-inventory-comparison-"),
    )
    .map((entry) => {
      const fullPath = path.join(
        generatedRoot,
        entry.name,
        "missing-from-db.csv",
      );

      if (!fs.existsSync(fullPath)) {
        return null;
      }

      return {
        fullPath,
        modifiedAtMs: fs.statSync(fullPath).mtimeMs,
      };
    })
    .filter(
      (
        value,
      ): value is {
        fullPath: string;
        modifiedAtMs: number;
      } => value !== null,
    )
    .sort((a, b) => b.modifiedAtMs - a.modifiedAtMs);

  if (candidates.length === 0) {
    throw new Error(
      `No missing-from-db.csv files found under ${generatedRoot}`,
    );
  }

  return candidates[0].fullPath;
}

function resolveInputPath(): string {
  const inputFlagIndex = process.argv.findIndex(
    (argument) => argument === "--input",
  );

  if (inputFlagIndex >= 0) {
    const suppliedPath = process.argv[inputFlagIndex + 1];

    if (!suppliedPath) {
      throw new Error("--input requires a CSV file path.");
    }

    return path.resolve(process.cwd(), suppliedPath);
  }

  return findLatestMissingInventoryCsv();
}

async function main(): Promise<void> {
  const inputPath = resolveInputPath();

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const missingRows = readMissingInventoryCsv(inputPath);

  const colleges = (await prisma.college.findMany({
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
    orderBy: {
      name: "asc",
    },
  })) as CollegeRecord[];

const diagnosticRows = missingRows.map((row) => {
  const candidates = findCandidates(row, colleges);
  const status = classifyCandidates(candidates);

  const primaryCandidate =
    candidates.find(
      (candidate) =>
        candidate.matchReason === "EXACT_NORMALIZED" ||
        candidate.matchReason === "EXPECTED_NAME" ||
        candidate.matchReason === "CORE_NAME",
    ) ?? null;

    return {
      rank: row.rank,
      ncaaSchool: row.ncaaSchool,
      normalizedNcaa: row.normalizedNcaa,
      status,

      candidateCount: candidates.length,

      primaryMatchReason: primaryCandidate?.matchReason ?? "",
      primaryScore: primaryCandidate?.score ?? "",

      collegeId: primaryCandidate?.college.id ?? "",
      collegeName: primaryCandidate?.college.name ?? "",
      collegeSlug: primaryCandidate?.college.slug ?? "",
      city: primaryCandidate?.college.city ?? "",
      state: primaryCandidate?.college.state ?? "",
      legacyCollegeDivision:
        primaryCandidate?.college.division ?? "",
      collegeConference:
        primaryCandidate?.college.conference ?? "",

      programId:
        primaryCandidate?.college.baseballProgram?.id ?? "",
      programDivision:
        primaryCandidate?.college.baseballProgram?.division ?? "",
      programConference:
        primaryCandidate?.college.baseballProgram?.conference ?? "",
      baseballWebsiteUrl:
        primaryCandidate?.college.baseballProgram
          ?.baseballWebsiteUrl ?? "",

      candidateSummary: candidates
        .map((candidate) => {
          const programDivision =
            candidate.college.baseballProgram?.division ?? "NO_PROGRAM";

          return [
            candidate.college.name,
            candidate.matchReason,
            candidate.score,
            candidate.college.id,
            candidate.college.baseballProgram?.id ?? "NO_PROGRAM",
            programDivision,
          ].join(" | ");
        })
        .join(" || "),

      season: row.season,
      source: row.source,
    };
  });

  const outputDirectory = path.dirname(inputPath);
  const outputPath = path.join(
    outputDirectory,
    "missing-program-diagnostic.csv",
  );

  const headers = [
    "rank",
    "ncaaSchool",
    "normalizedNcaa",
    "status",
    "candidateCount",
    "primaryMatchReason",
    "primaryScore",
    "collegeId",
    "collegeName",
    "collegeSlug",
    "city",
    "state",
    "legacyCollegeDivision",
    "collegeConference",
    "programId",
    "programDivision",
    "programConference",
    "baseballWebsiteUrl",
    "candidateSummary",
    "season",
    "source",
  ] as const;

  const csv = [
    headers.join(","),
    ...diagnosticRows.map((row) =>
      headers
        .map((header) => csvEscape(row[header]))
        .join(","),
    ),
  ].join("\n");

  fs.writeFileSync(outputPath, `${csv}\n`, "utf8");

  const counts = diagnosticRows.reduce<
    Record<DiagnosticStatus, number>
  >(
    (accumulator, row) => {
      accumulator[row.status] += 1;
      return accumulator;
    },
    {
      COLLEGE_AND_PROGRAM_MISSING: 0,
      COLLEGE_EXISTS_PROGRAM_MISSING: 0,
      PROGRAM_EXISTS_WRONG_DIVISION: 0,
      PROGRAM_EXISTS_D1_UNMATCHED: 0,
      POSSIBLE_DUPLICATE_COLLEGE: 0,
      AMBIGUOUS_CANDIDATES: 0,
    },
  );

  console.log("");
  console.log("=".repeat(90));
  console.log("MISSING NCAA D1 BASEBALL PROGRAM DIAGNOSTIC");
  console.log("=".repeat(90));
  console.log(`Input missing programs:              ${missingRows.length}`);
  console.log(`College rows searched:               ${colleges.length}`);
  console.log("");
  console.log(
    `College and program missing:          ${counts.COLLEGE_AND_PROGRAM_MISSING}`,
  );
  console.log(
    `College exists, program missing:      ${counts.COLLEGE_EXISTS_PROGRAM_MISSING}`,
  );
  console.log(
    `Program exists, wrong division:       ${counts.PROGRAM_EXISTS_WRONG_DIVISION}`,
  );
  console.log(
    `Program exists as D1 but unmatched:   ${counts.PROGRAM_EXISTS_D1_UNMATCHED}`,
  );
  console.log(
    `Possible duplicate colleges:          ${counts.POSSIBLE_DUPLICATE_COLLEGE}`,
  );
  console.log(
    `Ambiguous candidate matches:          ${counts.AMBIGUOUS_CANDIDATES}`,
  );
  console.log("");
  console.log("Output:");
  console.log(outputPath);
  console.log("");
  console.log(
    "No ScoutLine database records were created, updated, or deleted.",
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error("Missing D1 diagnostic failed.");

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