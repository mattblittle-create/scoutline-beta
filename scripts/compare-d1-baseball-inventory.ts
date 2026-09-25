// scripts/compare-d1-baseball-inventory.ts

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REFERENCE_CSV_PATH = path.join(
  process.cwd(),
  "data",
  "reference",
  "ncaa-d1-baseball-programs-2026.csv",
);

const OUTPUT_DIRECTORY = path.join(
  process.cwd(),
  "data",
  "enrichment",
  "generated",
  `d1-inventory-comparison-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}`,
);

type ReferenceRow = {
  rank: number;
  school: string;
  season: string;
  source: string;
  extractedAt: string;
};

type DatabaseProgram = {
  collegeId: string;
  collegeName: string;
  collegeSlug: string;
  city: string | null;
  state: string | null;
  legacyDivision: string | null;
  programId: string;
  programDivision: string | null;
  collegeConference: string | null;
  programConference: string | null;
  baseballWebsiteUrl: string | null;
};

type MatchMethod =
  | "EXACT_NORMALIZED"
  | "ALIAS"
  | "TOKEN_MATCH"
  | "UNMATCHED";

type MatchResult = {
  reference: ReferenceRow;
  database: DatabaseProgram | null;
  method: MatchMethod;
  normalizedReference: string;
  normalizedDatabase: string;
};

const SCHOOL_ALIASES: Record<string, string[]> = {
  "a and m corpus christi": [
    "texas a m university corpus christi",
    "texas a m corpus christi",
    "texas a and m university corpus christi",
    "texas a and m corpus christi",
  ],

  "air force": [
    "air force academy",
    "united states air force academy",
  ],

  "alabama": [
    "university of alabama",
  ],

  "app state": [
    "appalachian state university",
    "appalachian state",
  ],

  "arizona state": [
    "arizona state university",
    "arizona state",
  ],

  "arizona st": [
    "arizona state university",
    "arizona state",
  ],

  "arkansas": [
    "university of arkansas",
  ],

  "ark pine bluff": [
    "university of arkansas at pine bluff",
    "arkansas pine bluff",
  ],

  "army west point": [
    "united states military academy",
    "army",
  ],

  "cal poly": [
    "california polytechnic state university san luis obispo",
    "california polytechnic state university",
    "cal poly san luis obispo",
    "cal poly slo",
  ],

  "cal poly slo": [
    "california polytechnic state university san luis obispo",
    "california polytechnic state university",
    "cal poly san luis obispo",
  ],

  "cal state fullerton": [
    "california state university fullerton",
    "cal state fullerton",
  ],

  "cal st fullerton": [
    "california state university fullerton",
    "cal state fullerton",
  ],

  "cal state northridge": [
    "california state university northridge",
    "cal state northridge",
  ],

  "california": [
    "university of california berkeley",
  ],

  "central ark": [
    "university of central arkansas",
    "central arkansas",
  ],

  "central conn state": [
    "central connecticut state university",
    "central connecticut state",
  ],

  "central conn st": [
    "central connecticut state university",
    "central connecticut state",
  ],

  "central mich": [
    "central michigan university",
    "central michigan",
  ],

  "charleston so": [
    "charleston southern university",
    "charleston southern",
  ],

  "charlotte": [
    "university of north carolina at charlotte",
  ],

  "col of charleston": [
    "college of charleston",
  ],

  "coppin state": [
    "coppin state university",
    "coppin state",
  ],

  "csu bakersfield": [
    "california state university bakersfield",
    "cal state bakersfield",
  ],

  "csun": [
    "california state university northridge",
    "cal state northridge",
  ],

  "dbu": [
    "dallas baptist university",
    "dallas baptist",
  ],

  "delaware": [
    "university of delaware",
    "delaware",
  ],

  "eastern ill": [
    "eastern illinois university",
    "eastern illinois",
  ],

  "eastern ky": [
    "eastern kentucky university",
    "eastern kentucky",
  ],

  "eastern mich": [
    "eastern michigan university",
    "eastern michigan",
  ],

  "etsu": [
    "east tennessee state university",
    "east tennessee state",
  ],

  "fdu": [
    "fairleigh dickinson university",
    "fairleigh dickinson",
  ],

  "fgcu": [
    "florida gulf coast university",
    "florida gulf coast",
  ],

  "fiu": [
    "florida international university",
  ],

  "fla atlantic": [
    "florida atlantic university",
    "florida atlantic",
  ],

  "florida": [
    "university of florida",
  ],

  "florida state": [
    "florida state university",
    "florida state",
  ],

  "florida st": [
    "florida state university",
    "florida state",
  ],

  "fresno state": [
    "california state university fresno",
    "fresno state university",
    "fresno state",
  ],

  "fresno st": [
    "california state university fresno",
    "fresno state university",
    "fresno state",
  ],

  "ga southern": [
    "georgia southern university",
    "georgia southern",
  ],

  "georgia": [
    "university of georgia",
  ],

  "georgia state": [
    "georgia state university",
    "georgia state",
  ],

  "georgia st": [
    "georgia state university",
    "georgia state",
  ],

  "hawaii": [
    "university of hawaii at manoa",
    "university of hawaii manoa",
    "university of hawaii",
    "hawaii",
  ],

  "illinois": [
    "university of illinois",
  ],

  "illinois state": [
    "illinois state university",
    "illinois state",
  ],

  "illinois st": [
    "illinois state university",
    "illinois state",
  ],

  "indiana": [
    "indiana university",
  ],

  "indiana state": [
    "indiana state university",
    "indiana state",
  ],

  "indiana st": [
    "indiana state university",
    "indiana state",
  ],

  "iowa": [
    "university of iowa",
  ],

  "jackson state": [
    "jackson state university",
    "jackson state",
  ],

  "jackson st": [
    "jackson state university",
    "jackson state",
  ],

  "jacksonville state": [
    "jacksonville state university",
    "jacksonville state",
  ],

  "jacksonville st": [
    "jacksonville state university",
    "jacksonville state",
  ],

  "kansas": [
    "university of kansas",
  ],

  "kansas state": [
    "kansas state university",
    "kansas state",
  ],

  "kansas st": [
    "kansas state university",
    "kansas state",
  ],

  "kennesaw state": [
    "kennesaw state university",
    "kennesaw state",
  ],

  "kennesaw st": [
    "kennesaw state university",
    "kennesaw state",
  ],

  "kent state": [
    "kent state university",
    "kent state",
  ],

  "kent st": [
    "kent state university",
    "kent state",
  ],

  "lamar university": [
    "lamar university",
    "lamar",
  ],

  "little rock": [
    "university of arkansas at little rock",
  ],

  "liu": [
    "long island university",
    "long island",
  ],

  "lmu ca": [
    "loyola marymount university",
    "loyola marymount",
  ],

  "long beach state": [
    "california state university long beach",
    "cal state long beach",
    "long beach state university",
    "long beach state",
  ],

  "louisiana": [
    "university of louisiana at lafayette",
    "university of louisiana lafayette",
    "louisiana lafayette",
  ],

  "lsu": [
    "louisiana state university",
    "louisiana state",
  ],

  "massachusetts": [
    "university of massachusetts amherst",
  ],

  "middle tenn": [
    "middle tennessee state university",
    "middle tennessee",
  ],

  "miami fl": [
    "university of miami",
    "miami university florida",
    "miami florida",
  ],

  "miami oh": [
    "miami university",
    "miami ohio",
  ],

  "michigan": [
    "university of michigan",
  ],

  "michigan state": [
    "michigan state university",
    "michigan state",
  ],

  "michigan st": [
    "michigan state university",
    "michigan state",
  ],

  "milwaukee": [
    "university of wisconsin milwaukee",
  ],

  "mississippi state": [
    "mississippi state university",
    "mississippi state",
  ],

  "mississippi st": [
    "mississippi state university",
    "mississippi state",
  ],

  "mississippi val": [
    "mississippi valley state university",
    "mississippi valley state",
  ],

  "missouri": [
    "university of missouri",
  ],

  "missouri state": [
    "missouri state university",
    "missouri state",
  ],

  "missouri st": [
    "missouri state university",
    "missouri state",
  ],

  "morehead state": [
    "morehead state university",
    "morehead state",
  ],

  "morehead st": [
    "morehead state university",
    "morehead state",
  ],

  "mount state marys": [
    "mount st marys university",
    "mount saint marys university",
  ],

  "mount st marys": [
    "mount st marys university",
    "mount saint marys university",
  ],

  "murray state": [
    "murray state university",
    "murray state",
  ],

  "murray st": [
    "murray state university",
    "murray state",
  ],

  "n c a t": [
    "north carolina agricultural and technical state university",
    "north carolina a t state university",
    "north carolina a t",
  ],

  "navy": [
    "united states naval academy",
    "naval academy",
  ],

  "nc state": [
    "north carolina state university",
    "north carolina state",
  ],

  "nevada": [
    "university of nevada reno",
  ],

  "new mexico": [
    "university of new mexico",
  ],

  "new mexico state": [
    "new mexico state university",
    "new mexico state",
  ],

  "new mexico st": [
    "new mexico state university",
    "new mexico state",
  ],

  "niu": [
    "northern illinois university",
    "northern illinois",
  ],

  "njit": [
    "new jersey institute of technology",
    "njit",
  ],

  "north ala": [
    "university of north alabama",
    "north alabama",
  ],

  "north carolina": [
    "university of north carolina at chapel hill",
  ],

  "north dakota state": [
    "north dakota state university",
    "north dakota state",
  ],

  "north dakota st": [
    "north dakota state university",
    "north dakota state",
  ],

  "northern colo": [
    "university of northern colorado",
    "northern colorado",
  ],

  "northern colorado": [
    "university of northern colorado",
    "northern colorado",
  ],

  "northern ky": [
    "northern kentucky university",
    "northern kentucky",
  ],

  "northwestern": [
    "northwestern university",
  ],

  "northwestern state": [
    "northwestern state university",
    "northwestern state",
  ],

  "northwestern st": [
    "northwestern state university",
    "northwestern state",
  ],

  "ohio state": [
    "ohio state university",
    "the ohio state university",
    "ohio state",
  ],

  "ohio st": [
    "ohio state university",
    "the ohio state university",
    "ohio state",
  ],

  "oklahoma": [
    "university of oklahoma",
  ],

  "oklahoma state": [
    "oklahoma state university",
    "oklahoma state",
  ],

  "oklahoma st": [
    "oklahoma state university",
    "oklahoma state",
  ],

  "ole miss": [
    "university of mississippi",
  ],

  "omaha": [
    "university of nebraska omaha",
    "university of nebraska at omaha",
    "nebraska omaha",
  ],

  "oregon": [
    "university of oregon",
  ],

  "oregon state": [
    "oregon state university",
    "oregon state",
  ],

  "oregon st": [
    "oregon state university",
    "oregon state",
  ],

  "penn": [
    "university of pennsylvania",
  ],

  "penn state": [
    "pennsylvania state university",
    "penn state university",
    "penn state",
  ],

  "penn st": [
    "pennsylvania state university",
    "penn state university",
    "penn state",
  ],

  "prairie view": [
    "prairie view a m university",
    "prairie view a and m university",
  ],

  "queens nc": [
    "queens university of charlotte",
  ],

  "sacramento state": [
    "california state university sacramento",
    "cal state sacramento",
    "sacramento state university",
    "sacramento state",
  ],

  "sacramento st": [
    "california state university sacramento",
    "cal state sacramento",
    "sacramento state university",
    "sacramento state",
  ],

  "saint marys ca": [
    "saint marys college of california",
    "saint marys california",
  ],

  "san diego": [
    "university of san diego",
  ],

  "san diego state": [
    "san diego state university",
    "san diego state",
  ],

  "san diego st": [
    "san diego state university",
    "san diego state",
  ],

  "san jose state": [
    "san jose state university",
    "san jose state",
  ],

  "san jose st": [
    "san jose state university",
    "san jose state",
  ],

  "seattle u": [
    "seattle university",
  ],

  "sfa": [
    "stephen f austin state university",
    "stephen f austin university",
    "stephen f austin",
  ],

  "siue": [
    "southern illinois university edwardsville",
    "southern illinois university at edwardsville",
    "siu edwardsville",
  ],

  "south carolina": [
    "university of south carolina",
  ],

  "south dakota state": [
    "south dakota state university",
    "south dakota state",
  ],

  "south dakota st": [
    "south dakota state university",
    "south dakota state",
  ],

  "south fla": [
    "university of south florida",
    "south florida",
  ],

  "southeast mo state": [
    "southeast missouri state university",
    "southeast missouri state",
  ],

  "southeast mo st": [
    "southeast missouri state university",
    "southeast missouri state",
  ],

  "southeastern la": [
    "southeastern louisiana university",
    "southeastern louisiana",
  ],

  "southern ill": [
    "southern illinois university",
    "southern illinois university carbondale",
    "southern illinois",
  ],

  "southern ind": [
    "university of southern indiana",
    "southern indiana",
  ],

  "southern miss": [
    "university of southern mississippi",
    "southern mississippi",
    "southern miss",
  ],

  "southern u": [
    "southern university and a m college",
    "southern university and a and m college",
    "southern university",
  ],

  "state bonaventure": [
    "st bonaventure university",
    "saint bonaventure university",
  ],

  "st bonaventure": [
    "st bonaventure university",
    "saint bonaventure university",
  ],

  "state johns ny": [
    "st johns university",
    "saint johns university",
    "saint johns university new york",
  ],

  "state thomas": [
    "university of st thomas",
    "university of saint thomas",
    "university of saint thomas minnesota",
    "st thomas university minnesota",
  ],

  "state thomas mn": [
    "university of st thomas",
    "university of saint thomas",
    "university of saint thomas minnesota",
    "st thomas university minnesota",
  ],

  "tarleton state": [
    "tarleton state university",
    "tarleton state",
  ],

  "tarleton st": [
    "tarleton state university",
    "tarleton state",
  ],

  "tennessee tech": [
    "tennessee technological university",
  ],

  "texas": [
    "university of texas",
    "university of texas at austin",
  ],

  "texas state": [
    "texas state university",
    "texas state",
  ],

  "texas st": [
    "texas state university",
    "texas state",
  ],

  "uab": [
    "university of alabama at birmingham",
  ],

  "ualbany": [
    "university at albany",
    "university at albany suny",
    "state university of new york at albany",
    "suny albany",
  ],

  "uc davis": [
    "university of california davis",
    "university of california at davis",
    "uc davis",
  ],

  "uc irvine": [
    "university of california irvine",
    "university of california at irvine",
    "uc irvine",
  ],

  "uc riverside": [
    "university of california riverside",
    "university of california at riverside",
    "uc riverside",
  ],

  "uc san diego": [
    "university of california san diego",
    "university of california at san diego",
    "uc san diego",
  ],

  "uc santa barbara": [
    "university of california santa barbara",
    "university of california at santa barbara",
    "uc santa barbara",
  ],

  "ucf": [
    "university of central florida",
    "central florida",
  ],

  "uconn": [
    "university of connecticut",
    "connecticut",
  ],

  "uic": [
    "university of illinois chicago",
  ],

  "uiw": [
    "university of the incarnate word",
  ],

  "ulm": [
    "university of louisiana monroe",
  ],

  "umass lowell": [
    "university of massachusetts lowell",
    "university of massachusetts at lowell",
    "massachusetts lowell",
  ],

  "umbc": [
    "university of maryland baltimore county",
    "university of maryland at baltimore county",
    "maryland baltimore county",
  ],

  "umes": [
    "university of maryland eastern shore",
    "maryland eastern shore",
  ],

  "unc asheville": [
    "university of north carolina at asheville",
    "unc asheville",
  ],

  "unc greensboro": [
    "university of north carolina at greensboro",
    "unc greensboro",
  ],

  "uncw": [
    "university of north carolina wilmington",
    "university of north carolina at wilmington",
    "unc wilmington",
  ],

  "unlv": [
    "university of nevada las vegas",
  ],

  "ut arlington": [
    "university of texas arlington",
    "university of texas at arlington",
    "texas arlington",
  ],

  "ut martin": [
    "university of tennessee martin",
    "university of tennessee at martin",
    "tennessee martin",
  ],

  "utah": [
    "university of utah",
  ],

  "utah tech": [
    "utah tech university",
    "dixie state university",
  ],

  "utrgv": [
    "university of texas rio grande valley",
    "texas rio grande valley",
  ],

  "utsa": [
    "university of texas at san antonio",
    "texas san antonio",
  ],

  "vcu": [
    "virginia commonwealth university",
    "virginia commonwealth",
  ],

  "vmi": [
    "virginia military institute",
  ],

  "washington": [
    "university of washington",
  ],

  "washington state": [
    "washington state university",
    "washington state",
  ],

  "washington st": [
    "washington state university",
    "washington state",
  ],

  "west ga": [
    "university of west georgia",
    "west georgia",
  ],

  "western caro": [
    "western carolina university",
    "western carolina",
  ],

  "western ill": [
    "western illinois university",
    "western illinois",
  ],

  "western ky": [
    "western kentucky university",
    "western kentucky",
  ],

  "western mich": [
    "western michigan university",
    "western michigan",
  ],

  "wichita state": [
    "wichita state university",
    "wichita state",
  ],

  "wichita st": [
    "wichita state university",
    "wichita state",
  ],

  "wright state": [
    "wright state university",
    "wright state",
  ],

  "wright st": [
    "wright state university",
    "wright state",
  ],

  "youngstown state": [
    "youngstown state university",
    "youngstown state",
  ],

  "youngstown st": [
    "youngstown state university",
    "youngstown state",
  ],
};

/**
 * Normalize both alias keys and alias values once when the script loads.
 *
 * This avoids repeatedly scanning SCHOOL_ALIASES for every NCAA program
 * and guarantees that entries such as "Delaware St." resolve through the
 * normalized key "delaware state".
 */
const NORMALIZED_SCHOOL_ALIASES = new Map<string, Set<string>>();

const GENERIC_TOKENS = new Set([
  "college",
  "university",
  "state",
  "the",
  "of",
  "at",
  "and",
  "campus",
  "main",
]);

function cleanText(
  value: string | null | undefined,
): string {
  return (value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSchoolName(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, " and ")

    /*
     * Preserve NCAA uses of "St." as State.
     * Handle actual Saint names through aliases instead.
     */
    .replace(/\bst\./g, " state ")
    .replace(/\bst\b/g, " state ")

    .replace(/\bft\./g, " fort ")
    .replace(/\bmt\./g, " mount ")

    /*
     * Expand only unambiguous abbreviations.
     * Do not expand bare "UT" or "UC" globally.
     */
    .replace(/\bcal st\./g, " california state ")
    .replace(/\bcal st\b/g, " california state ")
    .replace(/\bcsu\b/g, " california state university ")

    .replace(/\bn\.c\./g, " north carolina ")
    .replace(/\bnc\b/g, " north carolina ")

    .replace(/\ba&m\b/g, " a and m ")
    .replace(/\ba & m\b/g, " a and m ")

    .replace(/\./g, "")
    .replace(/[’']/g, "")
    .replace(/[(),/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenKey(value: string): string {
  return normalizeSchoolName(value)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !GENERIC_TOKENS.has(token))
    .sort()
    .join(" ");
}

for (const [aliasKey, aliasValues] of Object.entries(
  SCHOOL_ALIASES,
)) {
  const normalizedAliasKey =
    normalizeSchoolName(aliasKey);

  const existingValues =
    NORMALIZED_SCHOOL_ALIASES.get(
      normalizedAliasKey,
    ) ?? new Set<string>();

  existingValues.add(normalizedAliasKey);

  for (const aliasValue of aliasValues) {
    existingValues.add(
      normalizeSchoolName(aliasValue),
    );
  }

  NORMALIZED_SCHOOL_ALIASES.set(
    normalizedAliasKey,
    existingValues,
  );
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];

      if (insideQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current);

  return values.map(cleanText);
}

function readReferenceCsv(
  filePath: string,
): ReferenceRow[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Reference CSV does not exist: ${filePath}`,
    );
  }

  const lines = fs
    .readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error(
      `Reference CSV contains no data rows: ${filePath}`,
    );
  }

  const headers = parseCsvLine(lines[0]);

  const requiredHeaders = [
    "rank",
    "school",
    "season",
    "source",
    "extractedAt",
  ];

  for (const requiredHeader of requiredHeaders) {
    if (!headers.includes(requiredHeader)) {
      throw new Error(
        `Reference CSV is missing header "${requiredHeader}".`,
      );
    }
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(
      headers.map((header, index) => [
        header,
        values[index] ?? "",
      ]),
    );

    return {
      rank: Number(row.rank),
      school: row.school,
      season: row.season,
      source: row.source,
      extractedAt: row.extractedAt,
    };
  });
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
  headers: string[],
): void {
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

function getAliasValues(
  normalizedReference: string,
): Set<string> {
  return (
    NORMALIZED_SCHOOL_ALIASES.get(
      normalizedReference,
    ) ?? new Set<string>()
  );
}

function comparePrograms(
  referenceRows: ReferenceRow[],
  databasePrograms: DatabaseProgram[],
): MatchResult[] {
  const unmatchedDatabase = new Map(
    databasePrograms.map((program) => [
      program.programId,
      program,
    ]),
  );

  /*
   * NCAA rank values are not guaranteed to be unique.
   *
   * Use the reference row's array index as the internal
   * comparison key so one NCAA row cannot overwrite another.
   */
  const resultsByReferenceIndex = new Map<
    number,
    MatchResult
  >();

  /*
   * Pass 1:
   * Reserve every exact and alias match before token matching
   * is allowed to consume any database program.
   */
  for (
    let referenceIndex = 0;
    referenceIndex < referenceRows.length;
    referenceIndex += 1
  ) {
    const reference =
      referenceRows[referenceIndex];

    const normalizedReference =
      normalizeSchoolName(reference.school);

    const exactMatch = Array.from(
      unmatchedDatabase.values(),
    ).find(
      (program) =>
        normalizeSchoolName(
          program.collegeName,
        ) === normalizedReference,
    );

    if (exactMatch) {
      unmatchedDatabase.delete(
        exactMatch.programId,
      );

      resultsByReferenceIndex.set(
        referenceIndex,
        {
          reference,
          database: exactMatch,
          method: "EXACT_NORMALIZED",
          normalizedReference,
          normalizedDatabase:
            normalizeSchoolName(
              exactMatch.collegeName,
            ),
        },
      );

      continue;
    }

    const aliasValues = getAliasValues(
      normalizedReference,
    );

    const aliasCandidates = Array.from(
      unmatchedDatabase.values(),
    ).filter((program) =>
      aliasValues.has(
        normalizeSchoolName(
          program.collegeName,
        ),
      ),
    );

    if (aliasCandidates.length === 1) {
      const aliasMatch = aliasCandidates[0];

      unmatchedDatabase.delete(
        aliasMatch.programId,
      );

      resultsByReferenceIndex.set(
        referenceIndex,
        {
          reference,
          database: aliasMatch,
          method: "ALIAS",
          normalizedReference,
          normalizedDatabase:
            normalizeSchoolName(
              aliasMatch.collegeName,
            ),
        },
      );
    }
  }

  /*
   * Pass 2:
   * Apply token matching only to NCAA rows and database
   * programs that remain unmatched after deterministic matching.
   */
  for (
    let referenceIndex = 0;
    referenceIndex < referenceRows.length;
    referenceIndex += 1
  ) {
    if (
      resultsByReferenceIndex.has(
        referenceIndex,
      )
    ) {
      continue;
    }

    const reference =
      referenceRows[referenceIndex];

    const normalizedReference =
      normalizeSchoolName(reference.school);

    const referenceTokenKey = tokenKey(
      reference.school,
    );

    const tokenCandidates = Array.from(
      unmatchedDatabase.values(),
    ).filter(
      (program) =>
        tokenKey(program.collegeName) ===
        referenceTokenKey,
    );

    if (tokenCandidates.length === 1) {
      const tokenMatch = tokenCandidates[0];

      unmatchedDatabase.delete(
        tokenMatch.programId,
      );

      resultsByReferenceIndex.set(
        referenceIndex,
        {
          reference,
          database: tokenMatch,
          method: "TOKEN_MATCH",
          normalizedReference,
          normalizedDatabase:
            normalizeSchoolName(
              tokenMatch.collegeName,
            ),
        },
      );

      continue;
    }

    resultsByReferenceIndex.set(
      referenceIndex,
      {
        reference,
        database: null,
        method: "UNMATCHED",
        normalizedReference,
        normalizedDatabase: "",
      },
    );
  }

  return referenceRows.map(
    (reference, referenceIndex) => {
      const result =
        resultsByReferenceIndex.get(
          referenceIndex,
        );

      if (!result) {
        throw new Error(
          `No match result generated for reference index ${referenceIndex}, rank ${reference.rank}: ${reference.school}`,
        );
      }

      return result;
    },
  );
}

async function main(): Promise<void> {
  fs.mkdirSync(OUTPUT_DIRECTORY, {
    recursive: true,
  });

  const referenceRows = readReferenceCsv(
    REFERENCE_CSV_PATH,
  );

  const rawPrograms =
    await prisma.collegeBaseballProgram.findMany({
      where: {
        division: "NCAA_D1",
      },
      include: {
        college: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            division: true,
            conference: true,
          },
        },
      },
      orderBy: {
        college: {
          name: "asc",
        },
      },
    });

  const databasePrograms: DatabaseProgram[] =
    rawPrograms.map((program) => ({
      collegeId: program.college.id,
      collegeName: program.college.name,
      collegeSlug: program.college.slug,
      city: program.college.city,
      state: program.college.state,
      legacyDivision: program.college.division,
      programId: program.id,
      programDivision: program.division,
      collegeConference:
        program.college.conference,
      programConference: program.conference,
      baseballWebsiteUrl:
        program.baseballWebsiteUrl,
    }));

  const matchResults = comparePrograms(
    referenceRows,
    databasePrograms,
  );

  const matchedResults = matchResults.filter(
    (result) => result.database,
  );

  const matchedProgramIds = new Set(
    matchedResults.map(
      (result) => result.database!.programId,
    ),
  );

  const matchedProgramIdCounts = new Map<
    string,
    MatchResult[]
  >();

  for (const result of matchedResults) {
    const programId = result.database!.programId;

    const existingResults =
      matchedProgramIdCounts.get(programId) ?? [];

    existingResults.push(result);

    matchedProgramIdCounts.set(
      programId,
      existingResults,
    );
  }

  const duplicateProgramMatches = Array.from(
    matchedProgramIdCounts.entries(),
  )
    .filter(([, results]) => results.length > 1)
    .map(([programId, results]) => ({
      programId,
      databaseSchool:
        results[0].database!.collegeName,
      ncaaSchools: results
        .map((result) => result.reference.school)
        .join(" | "),
      matchMethods: results
        .map((result) => result.method)
        .join(" | "),
    }));

  const matchedRows = matchResults
    .filter((result) => result.database)
    .map((result) => ({
      rank: result.reference.rank,
      ncaaSchool: result.reference.school,
      databaseSchool:
        result.database!.collegeName,
      matchMethod: result.method,
      collegeId: result.database!.collegeId,
      programId: result.database!.programId,
      collegeSlug:
        result.database!.collegeSlug,
      city: result.database!.city,
      state: result.database!.state,
      baseballWebsiteUrl:
        result.database!.baseballWebsiteUrl,
      normalizedNcaa:
        result.normalizedReference,
      normalizedDatabase:
        result.normalizedDatabase,
    }));

  const missingRows = matchResults
    .filter((result) => !result.database)
    .map((result) => ({
      rank: result.reference.rank,
      ncaaSchool: result.reference.school,
      normalizedNcaa:
        result.normalizedReference,
      season: result.reference.season,
      source: result.reference.source,
    }));

  const extraRows = databasePrograms
    .filter(
      (program) =>
        !matchedProgramIds.has(program.programId),
    )
    .map((program) => ({
      collegeId: program.collegeId,
      collegeName: program.collegeName,
      collegeSlug: program.collegeSlug,
      city: program.city,
      state: program.state,
      legacyDivision: program.legacyDivision,
      programId: program.programId,
      programDivision:
        program.programDivision,
      collegeConference:
        program.collegeConference,
      programConference:
        program.programConference,
      baseballWebsiteUrl:
        program.baseballWebsiteUrl,
    }));

  const reviewRows = matchedRows.filter(
    (row) => row.matchMethod !== "EXACT_NORMALIZED",
  );

  writeCsv(
    path.join(OUTPUT_DIRECTORY, "matched.csv"),
    matchedRows,
    [
      "rank",
      "ncaaSchool",
      "databaseSchool",
      "matchMethod",
      "collegeId",
      "programId",
      "collegeSlug",
      "city",
      "state",
      "baseballWebsiteUrl",
      "normalizedNcaa",
      "normalizedDatabase",
    ],
  );

  writeCsv(
    path.join(
      OUTPUT_DIRECTORY,
      "missing-from-db.csv",
    ),
    missingRows,
    [
      "rank",
      "ncaaSchool",
      "normalizedNcaa",
      "season",
      "source",
    ],
  );

  writeCsv(
    path.join(OUTPUT_DIRECTORY, "extra-in-db.csv"),
    extraRows,
    [
      "collegeId",
      "collegeName",
      "collegeSlug",
      "city",
      "state",
      "legacyDivision",
      "programId",
      "programDivision",
      "collegeConference",
      "programConference",
      "baseballWebsiteUrl",
    ],
  );

  writeCsv(
    path.join(
      OUTPUT_DIRECTORY,
      "matched-needs-review.csv",
    ),
    reviewRows,
    [
      "rank",
      "ncaaSchool",
      "databaseSchool",
      "matchMethod",
      "collegeId",
      "programId",
      "collegeSlug",
      "city",
      "state",
      "baseballWebsiteUrl",
      "normalizedNcaa",
      "normalizedDatabase",
    ],
  );

  console.log("");
  console.log("=".repeat(90));
  console.log(
    "NCAA D1 BASEBALL INVENTORY COMPARISON",
  );
  console.log("=".repeat(90));
  console.log(
    `Official NCAA inventory:        ${referenceRows.length}`,
  );
  console.log(
    `Database NCAA_D1 programs:       ${databasePrograms.length}`,
  );
  console.log(
    `Matched result rows:             ${matchedRows.length}`,
  );
  console.log(
    `Unique matched program IDs:      ${matchedProgramIds.size}`,
  );
  console.log(
    `Duplicate program matches:       ${duplicateProgramMatches.length}`,
  );
  console.log(
    `Expected extras by unique IDs:   ${
      databasePrograms.length -
      matchedProgramIds.size
    }`,
  );
  console.log(
    `Exact normalized matches:        ${
      matchedRows.filter(
        (row) =>
          row.matchMethod === "EXACT_NORMALIZED",
      ).length
    }`,
  );
  console.log(
    `Alias matches:                   ${
      matchedRows.filter(
        (row) => row.matchMethod === "ALIAS",
      ).length
    }`,
  );
  console.log(
    `Token matches:                   ${
      matchedRows.filter(
        (row) =>
          row.matchMethod === "TOKEN_MATCH",
      ).length
    }`,
  );
  console.log(
    `Missing from database:           ${missingRows.length}`,
  );
  console.log(
    `Extra in database:               ${extraRows.length}`,
  );
  console.log(
    `Non-exact matches for review:    ${reviewRows.length}`,
  );
  if (duplicateProgramMatches.length > 0) {
    console.log("");
    console.log(
      "DUPLICATE DATABASE PROGRAM MATCHES",
    );
    console.log("-".repeat(90));

    for (const duplicate of duplicateProgramMatches) {
      console.log(
        `${duplicate.databaseSchool}`,
      );
      console.log(
        `  Program ID: ${duplicate.programId}`,
      );
      console.log(
        `  NCAA rows:  ${duplicate.ncaaSchools}`,
      );
      console.log(
        `  Methods:    ${duplicate.matchMethods}`,
      );
    }
  }

  console.log("");
  console.log(`Output directory:`);
  console.log(OUTPUT_DIRECTORY);
  console.log("");
  console.log(
    "No ScoutLine database records were created, updated, or deleted.",
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "D1 inventory comparison failed.",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });