// scripts/import-d1-rosters.ts
//
// Imports the frozen / approved D1 baseball roster baseline.
//
// DEFAULT:
//   DRY RUN — NO DATABASE WRITES
//
// APPLY:
//   npx tsx scripts/import-d1-rosters.ts --apply
//
// Approved source files:
//   data/enrichment/approved/d1-rosters/
//     college-baseball-rosters.d1.approved.summary.csv
//     college-baseball-rosters.d1.approved.players.csv
//
// Safety rules:
// - SUCCESS and accepted PARTIAL programs may be imported.
// - NO_ROSTER programs are never used to erase existing data.
// - Northwestern is explicitly protected.
// - Writes are scoped to exact programId + season.
// - Player replacement happens only within an approved
//   programId + season pair.
// - No cross-season deletes.
// - Dry run is the default.

import fs from "node:fs";
import path from "node:path";

import {
  PrismaClient,
} from "@prisma/client";

const prisma =
  new PrismaClient();

const APPLY =
  process.argv.includes(
    "--apply",
  );

const ROOT =
  process.cwd();

const APPROVED_DIR =
  path.join(
    ROOT,
    "data",
    "enrichment",
    "approved",
    "d1-rosters",
  );

const SUMMARY_FILE =
  path.join(
    APPROVED_DIR,
    "college-baseball-rosters.d1.approved.summary.csv",
  );

const PLAYER_FILE =
  path.join(
    APPROVED_DIR,
    "college-baseball-rosters.d1.approved.players.csv",
  );

const PROTECTED_NO_ROSTER_PROGRAMS =
  new Set([
    "Northwestern University",
  ]);

const ACCEPTED_PARTIAL_PROGRAMS =
  new Set([
    "Southern University and A&M College",
    "Georgia Southern University",
    "Troy University",
    "Arizona State University",
    "Lipscomb University",
    "Wake Forest University",
  ]);

type CsvRow =
  Record<
    string,
    string
  >;

type SummaryRow = {
  programId: string;
  collegeName: string;
  status: string;
  season: string;
  sourceUrl: string;

  playersParsed:
    number;

  rosterReadyPlayers:
    number;

  completePlayers:
    number;

  error: string;
};

type ApprovedPlayer = {
  programId: string;
  collegeName: string;
  season: string;

  name: string;

  positionRaw:
    string | null;

  primaryPosition:
    string | null;

  classYearRaw:
    string | null;

  classBucket:
    string | null;

  heightRaw:
    string | null;

  heightInches:
    number | null;

  weightRaw:
    string | null;

  weightLb:
    number | null;

  rosterProfileUrl:
    string | null;

  sourceUrl:
    string | null;
};

type SnapshotData = {
  programId: string;
  season: string;

  rosterSize:
    number;

  freshmen:
    number;

  sophomores:
    number;

  juniors:
    number;

  seniors:
    number;

  graduateStudents:
    number;

  pitchers:
    number;

  catchers:
    number;

  infielders:
    number;

  outfielders:
    number;

  twoWayPlayers:
    number;

  leftHandedPitchers:
    number;

  rightHandedPitchers:
    number;

  sourceUrl:
    string | null;
};

function clean(
  value:
    string |
    null |
    undefined,
) {
  return String(
    value ?? "",
  ).trim();
}

function nullable(
  value:
    string |
    null |
    undefined,
) {
  const v =
    clean(
      value,
    );

  return v
    ? v
    : null;
}

function numberOrNull(
  value:
    string |
    null |
    undefined,
) {
  const v =
    clean(
      value,
    );

  if (!v) {
    return null;
  }

  const n =
    Number(
      v,
    );

  return Number.isFinite(
    n,
  )
    ? n
    : null;
}

function integerOrZero(
  value:
    string |
    null |
    undefined,
) {
  return (
    numberOrNull(
      value,
    ) ?? 0
  );
}

/*
 * Minimal RFC-style CSV parser.
 *
 * Handles:
 * - commas
 * - quoted fields
 * - escaped quotes ""
 * - CRLF / LF
 * - embedded commas
 * - embedded line breaks inside quoted fields
 *
 * Avoids adding another npm dependency to the importer.
 */
function parseCsv(
  text: string,
): CsvRow[] {
  const rows:
    string[][] = [];

  let row:
    string[] = [];

  let field =
    "";

  let quoted =
    false;

  for (
    let i = 0;
    i < text.length;
    i += 1
  ) {
    const char =
      text[i];

    if (quoted) {
      if (
        char ===
        '"'
      ) {
        if (
          text[
            i + 1
          ] === '"'
        ) {
          field +=
            '"';

          i += 1;
        } else {
          quoted =
            false;
        }
      } else {
        field +=
          char;
      }

      continue;
    }

    if (
      char ===
      '"'
    ) {
      quoted =
        true;

      continue;
    }

    if (
      char ===
      ","
    ) {
      row.push(
        field,
      );

      field =
        "";

      continue;
    }

    if (
      char ===
        "\n" ||
      char ===
        "\r"
    ) {
      if (
        char ===
          "\r" &&
        text[
          i + 1
        ] === "\n"
      ) {
        i += 1;
      }

      row.push(
        field,
      );

      field =
        "";

      if (
        row.some(
          (value) =>
            value.length >
            0,
        )
      ) {
        rows.push(
          row,
        );
      }

      row =
        [];

      continue;
    }

    field +=
      char;
  }

  if (
    field.length >
      0 ||
    row.length >
      0
  ) {
    row.push(
      field,
    );

    rows.push(
      row,
    );
  }

  if (
    rows.length ===
    0
  ) {
    return [];
  }

  const headers =
    rows[0].map(
      (value) =>
        clean(
          value,
        ),
    );

  return rows
    .slice(
      1,
    )
    .map(
      (values) => {
        const record:
          CsvRow = {};

        for (
          let i = 0;
          i <
          headers.length;
          i += 1
        ) {
          record[
            headers[i]
          ] =
            values[i] ??
            "";
        }

        return record;
      },
    );
}

/*
 * CSV field-name compatibility helper.
 *
 * The enrichment output names have evolved while we built
 * the scraper. This lets the importer tolerate a couple of
 * equivalent column names without weakening validation.
 */
function getField(
  row: CsvRow,
  names: string[],
) {
  for (
    const name
    of names
  ) {
    if (
      Object.prototype
        .hasOwnProperty.call(
          row,
          name,
        )
    ) {
      return clean(
        row[
          name
        ],
      );
    }
  }

  return "";
}

function loadCsv(
  filename: string,
) {
  if (
    !fs.existsSync(
      filename,
    )
  ) {
    throw new Error(
      `Approved input file not found: ${filename}`,
    );
  }

  return parseCsv(
    fs.readFileSync(
      filename,
      "utf8",
    ),
  );
}

function parseSummaryRows(
  rows: CsvRow[],
): SummaryRow[] {
  return rows.map(
    (row) => ({
      programId:
        getField(
          row,
          [
            "programId",
          ],
        ),

      collegeName:
        getField(
          row,
          [
            "collegeName",
            "school",
            "name",
          ],
        ),

      status:
        getField(
          row,
          [
            "status",
          ],
        )
          .toUpperCase(),

      season:
        getField(
          row,
          [
            "season",
          ],
        ),

      sourceUrl:
        getField(
          row,
          [
            "selectedRosterUrl",
            "sourceUrl",
            "rosterUrl",
          ],
        ),

      playersParsed:
        integerOrZero(
          getField(
            row,
            [
              "playersParsed",
              "players",
            ],
          ),
        ),

      rosterReadyPlayers:
        integerOrZero(
          getField(
            row,
            [
              "rosterReadyPlayers",
              "rosterReady",
            ],
          ),
        ),

      completePlayers:
        integerOrZero(
          getField(
            row,
            [
              "completePlayers",
              "complete",
              "metricCompletePlayers",
            ],
          ),
        ),

      error:
        getField(
          row,
          [
            "error",
          ],
        ),
    }),
  );
}

function parsePlayerRows(
  rows: CsvRow[],
): ApprovedPlayer[] {
  return rows.map(
    (row) => ({
      programId:
        getField(
          row,
          [
            "programId",
          ],
        ),

      collegeName:
        getField(
          row,
          [
            "collegeName",
            "school",
          ],
        ),

      season:
        getField(
          row,
          [
            "season",
          ],
        ),

      name:
        getField(
          row,
          [
            "name",
            "playerName",
          ],
        ),

      positionRaw:
        nullable(
          getField(
            row,
            [
              "positionRaw",
              "position",
            ],
          ),
        ),

      primaryPosition:
        nullable(
          getField(
            row,
            [
              "primaryPosition",
            ],
          ),
        ),

      classYearRaw:
        nullable(
          getField(
            row,
            [
              "classYearRaw",
              "classYear",
              "class",
            ],
          ),
        ),

      classBucket:
        nullable(
          getField(
            row,
            [
              "classBucket",
            ],
          ),
        ),

      heightRaw:
        nullable(
          getField(
            row,
            [
              "heightRaw",
              "height",
            ],
          ),
        ),

      heightInches:
        numberOrNull(
          getField(
            row,
            [
              "heightInches",
            ],
          ),
        ),

      weightRaw:
        nullable(
          getField(
            row,
            [
              "weightRaw",
              "weight",
            ],
          ),
        ),

      weightLb:
        numberOrNull(
          getField(
            row,
            [
              "weightLb",
              "weightLbs",
            ],
          ),
        ),

      rosterProfileUrl:
        nullable(
          getField(
            row,
            [
              "rosterProfileUrl",
              "profileUrl",
            ],
          ),
        ),

      sourceUrl:
        nullable(
          getField(
            row,
            [
              "sourceRosterUrl",
              "sourceUrl",
              "selectedRosterUrl",
            ],
          ),
        ),
    }),
  );
}

function playerKey(
  player: Pick<
    ApprovedPlayer,
    | "programId"
    | "season"
    | "name"
  >,
) {
  return [
    player.programId,
    player.season,
    player.name
      .trim()
      .toLowerCase(),
  ].join(
    "|",
  );
}

function scopeKey(
  programId: string,
  season: string,
) {
  return `${programId}|${season}`;
}

function splitPositionTokens(
  positionRaw:
    string |
    null,
) {
  return clean(
    positionRaw,
  )
    .toUpperCase()
    .split(
      /[\/,&+\-\s]+/,
    )
    .map(
      (value) =>
        value.trim(),
    )
    .filter(
      Boolean,
    );
}

function isPitcherToken(
  token: string,
) {
  return [
    "P",
    "RHP",
    "LHP",
  ].includes(
    token,
  );
}

function isInfielderToken(
  token: string,
) {
  return [
    "IF",
    "INF",
    "MIF",
    "CIF",
    "1B",
    "2B",
    "3B",
    "SS",
  ].includes(
    token,
  );
}

function isOutfielderToken(
  token: string,
) {
  return token ===
    "OF";
}

function isCatcherToken(
  token: string,
) {
  return token ===
    "C";
}

function buildSnapshot(
  summary:
    SummaryRow,
  players:
    ApprovedPlayer[],
): SnapshotData {
  let freshmen =
    0;

  let sophomores =
    0;

  let juniors =
    0;

  let seniors =
    0;

  let graduateStudents =
    0;

  let pitchers =
    0;

  let catchers =
    0;

  let infielders =
    0;

  let outfielders =
    0;

  let twoWayPlayers =
    0;

  let leftHandedPitchers =
    0;

  let rightHandedPitchers =
    0;

  for (
    const player
    of players
  ) {
    const classBucket =
      clean(
        player.classBucket,
      ).toUpperCase();

    if (
      classBucket ===
      "FRESHMAN"
    ) {
      freshmen += 1;
    } else if (
      classBucket ===
      "SOPHOMORE"
    ) {
      sophomores += 1;
    } else if (
      classBucket ===
      "JUNIOR"
    ) {
      juniors += 1;
    } else if (
      classBucket ===
      "SENIOR"
    ) {
      seniors += 1;
    } else if (
      classBucket ===
      "GRADUATE"
    ) {
      graduateStudents +=
        1;
    }

    const tokens =
      splitPositionTokens(
        player.positionRaw ||
        player.primaryPosition,
      );

    const hasPitcher =
      tokens.some(
        isPitcherToken,
      );

    const hasCatcher =
      tokens.some(
        isCatcherToken,
      );

    const hasInfielder =
      tokens.some(
        isInfielderToken,
      );

    const hasOutfielder =
      tokens.some(
        isOutfielderToken,
      );

    const hasNonPitcher =
      hasCatcher ||
      hasInfielder ||
      hasOutfielder;

    if (
      hasPitcher
    ) {
      pitchers += 1;
    }

    if (
      hasCatcher
    ) {
      catchers += 1;
    }

    if (
      hasInfielder
    ) {
      infielders += 1;
    }

    if (
      hasOutfielder
    ) {
      outfielders += 1;
    }

    if (
      hasPitcher &&
      hasNonPitcher
    ) {
      twoWayPlayers +=
        1;
    }

    if (
      tokens.includes(
        "LHP",
      )
    ) {
      leftHandedPitchers +=
        1;
    }

    if (
      tokens.includes(
        "RHP",
      )
    ) {
      rightHandedPitchers +=
        1;
    }
  }

  return {
    programId:
      summary.programId,

    season:
      summary.season,

    rosterSize:
      players.length,

    freshmen,

    sophomores,

    juniors,

    seniors,

    graduateStudents,

    pitchers,

    catchers,

    infielders,

    outfielders,

    twoWayPlayers,

    leftHandedPitchers,

    rightHandedPitchers,

    sourceUrl:
      nullable(
        summary.sourceUrl,
      ),
  };
}

function sameNullable(
  a: unknown,
  b: unknown,
) {
  const left =
    a === undefined
      ? null
      : a;

  const right =
    b === undefined
      ? null
      : b;

  return left ===
    right;
}

function snapshotMatches(
  existing:
    Record<
      string,
      unknown
    >,
  incoming:
    SnapshotData,
) {
  const fields:
    Array<
      keyof SnapshotData
    > =
      [
        "rosterSize",
        "freshmen",
        "sophomores",
        "juniors",
        "seniors",
        "graduateStudents",
        "pitchers",
        "catchers",
        "infielders",
        "outfielders",
        "twoWayPlayers",
        "leftHandedPitchers",
        "rightHandedPitchers",
        "sourceUrl",
      ];

  return fields.every(
    (field) =>
      sameNullable(
        existing[
          field
        ],
        incoming[
          field
        ],
      ),
  );
}

function playerMatches(
  existing:
    Record<
      string,
      unknown
    >,
  incoming:
    ApprovedPlayer,
) {
  const checks:
    Array<
      [
        string,
        unknown,
      ]
    > =
      [
        [
          "positionRaw",
          incoming.positionRaw,
        ],
        [
          "primaryPosition",
          incoming.primaryPosition,
        ],
        [
          "classYearRaw",
          incoming.classYearRaw,
        ],
        [
          "classBucket",
          incoming.classBucket,
        ],
        [
          "heightRaw",
          incoming.heightRaw,
        ],
        [
          "heightInches",
          incoming.heightInches,
        ],
        [
          "weightRaw",
          incoming.weightRaw,
        ],
        [
          "weightLb",
          incoming.weightLb,
        ],
        [
          "rosterProfileUrl",
          incoming.rosterProfileUrl,
        ],
        [
          "sourceUrl",
          incoming.sourceUrl,
        ],
      ];

  return checks.every(
    (
      [
        field,
        value,
      ],
    ) =>
      sameNullable(
        existing[
          field
        ],
        value,
      ),
  );
}

async function main() {
  console.log(
    "=================================================",
  );

  console.log(
    "D1 BASEBALL ROSTER IMPORT",
  );

  console.log(
    "=================================================",
  );

  console.log(
    APPLY
      ? "Mode: APPLY — DATABASE WRITES ENABLED"
      : "Mode: DRY RUN — NO DATABASE WRITES",
  );

  console.log("");

  const rawSummaryRows =
    loadCsv(
      SUMMARY_FILE,
    );

  const rawPlayerRows =
    loadCsv(
      PLAYER_FILE,
    );

  const summaryRows =
    parseSummaryRows(
      rawSummaryRows,
    );

  const parsedPlayers =
    parsePlayerRows(
      rawPlayerRows,
    );

  console.log(
    `Approved summary rows loaded: ${summaryRows.length}`,
  );

  console.log(
    `Approved player rows loaded:  ${parsedPlayers.length}`,
  );

  console.log("");

  /*
   * ---------------------------------------------------------
   * VALIDATE SUMMARY
   * ---------------------------------------------------------
   */

  if (
    summaryRows.length !==
    308
  ) {
    throw new Error(
      `Expected exactly 308 approved D1 summary rows; found ${summaryRows.length}.`,
    );
  }

  const summaryByProgram =
    new Map<
      string,
      SummaryRow
    >();

  const duplicateSummaryPrograms:
    string[] = [];

  for (
    const row
    of summaryRows
  ) {
    if (
      !row.programId
    ) {
      throw new Error(
        `Summary row missing programId: ${row.collegeName || "(unknown school)"}`,
      );
    }

    if (
      summaryByProgram.has(
        row.programId,
      )
    ) {
      duplicateSummaryPrograms.push(
        row.programId,
      );

      continue;
    }

    summaryByProgram.set(
      row.programId,
      row,
    );
  }

  if (
    duplicateSummaryPrograms.length >
    0
  ) {
    throw new Error(
      `Duplicate summary programId values found: ${duplicateSummaryPrograms.join(", ")}`,
    );
  }

  const successes =
    summaryRows.filter(
      (row) =>
        row.status ===
        "SUCCESS",
    );

  const partials =
    summaryRows.filter(
      (row) =>
        row.status ===
        "PARTIAL",
    );

  const noRoster =
    summaryRows.filter(
      (row) =>
        row.status ===
        "NO_ROSTER",
    );

  const unexpectedStatuses =
    summaryRows.filter(
      (row) =>
        ![
          "SUCCESS",
          "PARTIAL",
          "NO_ROSTER",
        ].includes(
          row.status,
        ),
    );

  console.log(
    `SUCCESS programs:             ${successes.length}`,
  );

  console.log(
    `PARTIAL programs:             ${partials.length}`,
  );

  console.log(
    `NO_ROSTER programs:           ${noRoster.length}`,
  );

  if (
    unexpectedStatuses.length >
    0
  ) {
    console.log(
      `Unexpected status programs:   ${unexpectedStatuses.length}`,
    );
  }

  /*
   * The frozen approved baseline must retain the exact final
   * disposition we approved.
   */
  if (
    successes.length !==
      301 ||
    partials.length !==
      6 ||
    noRoster.length !==
      1
  ) {
    throw new Error(
      `Approved disposition mismatch. Expected 301 SUCCESS / 6 PARTIAL / 1 NO_ROSTER; found ${successes.length} / ${partials.length} / ${noRoster.length}.`,
    );
  }

  for (
    const partial
    of partials
  ) {
    if (
      !ACCEPTED_PARTIAL_PROGRAMS.has(
        partial.collegeName,
      )
    ) {
      throw new Error(
        `Unexpected PARTIAL program in approved baseline: ${partial.collegeName}`,
      );
    }
  }

  for (
    const row
    of noRoster
  ) {
    if (
      !PROTECTED_NO_ROSTER_PROGRAMS.has(
        row.collegeName,
      )
    ) {
      throw new Error(
        `Unexpected NO_ROSTER program in approved baseline: ${row.collegeName}`,
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * VALIDATE PLAYER ROWS
   * ---------------------------------------------------------
   */

  const invalidPlayers:
    string[] = [];

  const duplicatePlayerKeys =
    new Set<string>();

  const seenPlayerKeys =
    new Set<string>();

  const validPlayers:
    ApprovedPlayer[] = [];

  let protectedPlayerRowsSkipped =
    0;

  for (
    const player
    of parsedPlayers
  ) {
    if (
      !player.programId ||
      !player.season ||
      !player.name
    ) {
      invalidPlayers.push(
        `${player.collegeName || player.programId || "(unknown)"} | ${player.name || "(missing name)"}`,
      );

      continue;
    }

    const summary =
      summaryByProgram.get(
        player.programId,
      );

    if (!summary) {
      invalidPlayers.push(
        `${player.collegeName} | ${player.name} | programId not present in approved summary`,
      );

      continue;
    }

    /*
     * Protected NO_ROSTER programs may still have stray
     * partial player rows in the approved scraper CSV.
     *
     * Northwestern is the regression case:
     *
     * - final program disposition: NO_ROSTER
     * - scraper still emitted 7 partial player rows
     *
     * Those rows must never become importable and must never
     * cause existing DB roster data to be deleted/replaced.
     *
     * Skip them cleanly rather than treating the frozen
     * approved baseline as corrupt.
     */
    if (
      summary.status ===
      "NO_ROSTER"
    ) {
      protectedPlayerRowsSkipped +=
        1;

      continue;
    }

    if (
      player.season !==
      summary.season
    ) {
      invalidPlayers.push(
        `${player.collegeName} | ${player.name} | player season ${player.season} != summary season ${summary.season}`,
      );

      continue;
    }

    const key =
      playerKey(
        player,
      );

    if (
      seenPlayerKeys.has(
        key,
      )
    ) {
      duplicatePlayerKeys.add(
        key,
      );

      continue;
    }

    seenPlayerKeys.add(
      key,
    );

    validPlayers.push(
      player,
    );
  }

  console.log("");

  console.log(
    `Valid player rows:            ${validPlayers.length}`,
  );

  console.log(
    `Protected player rows skipped:${protectedPlayerRowsSkipped}`,
  );

  console.log(
    `Invalid player rows:          ${invalidPlayers.length}`,
  );

  console.log(
    `Duplicate player rows:        ${duplicatePlayerKeys.size}`,
  );

  if (
    invalidPlayers.length >
      0
  ) {
    console.log("");

    console.log(
      "INVALID PLAYER ROWS",
    );

    for (
      const value
      of invalidPlayers.slice(
        0,
        30,
      )
    ) {
      console.log(
        `  ${value}`,
      );
    }
  }

  if (
    duplicatePlayerKeys.size >
      0
  ) {
    console.log("");

    console.log(
      "DUPLICATE PLAYER KEYS",
    );

    for (
      const value
      of [
        ...duplicatePlayerKeys,
      ].slice(
        0,
        30,
      )
    ) {
      console.log(
        `  ${value}`,
      );
    }
  }

  /*
   * Do not continue toward apply while source integrity is
   * questionable.
   */
  if (
    invalidPlayers.length >
      0 ||
    duplicatePlayerKeys.size >
      0
  ) {
    throw new Error(
      "Approved player CSV contains invalid or duplicate rows. No database changes performed.",
    );
  }

  /*
   * ---------------------------------------------------------
   * GROUP APPROVED PLAYER ROWS
   * ---------------------------------------------------------
   */

  const playersByScope =
    new Map<
      string,
      ApprovedPlayer[]
    >();

  for (
    const player
    of validPlayers
  ) {
    const key =
      scopeKey(
        player.programId,
        player.season,
      );

    const existing =
      playersByScope.get(
        key,
      ) ?? [];

    existing.push(
      player,
    );

    playersByScope.set(
      key,
      existing,
    );
  }

  const importableSummaries =
    summaryRows.filter(
      (row) =>
        row.status ===
          "SUCCESS" ||
        row.status ===
          "PARTIAL",
    );

  /*
   * ---------------------------------------------------------
   * VERIFY PROGRAM IDs EXIST
   * ---------------------------------------------------------
   */

  const programIds =
    [
      ...new Set(
        summaryRows.map(
          (row) =>
            row.programId,
        ),
      ),
    ];

  const dbPrograms =
    await prisma
      .collegeBaseballProgram
      .findMany({
        where: {
          id: {
            in: programIds,
          },
        },

        select: {
          id: true,
        },
      });

  const existingProgramIds =
    new Set(
      dbPrograms.map(
        (program) =>
          program.id,
      ),
    );

  const missingProgramRows =
    summaryRows.filter(
      (row) =>
        !existingProgramIds.has(
          row.programId,
        ),
    );

  console.log("");

  console.log(
    `Programs resolved in DB:      ${dbPrograms.length}/${summaryRows.length}`,
  );

  console.log(
    `Programs missing from DB:     ${missingProgramRows.length}`,
  );

  if (
    missingProgramRows.length >
    0
  ) {
    console.log("");

    console.log(
      "MISSING PROGRAMS",
    );

    for (
      const row
      of missingProgramRows
    ) {
      console.log(
        `  ${row.collegeName} | ${row.programId}`,
      );
    }

    throw new Error(
      "One or more approved programs do not exist in the database. No database changes performed.",
    );
  }

  /*
   * ---------------------------------------------------------
   * SEASON DISTRIBUTION
   * ---------------------------------------------------------
   */

  const seasonCounts =
    new Map<
      string,
      number
    >();

  for (
    const row
    of importableSummaries
  ) {
    seasonCounts.set(
      row.season,
      (
        seasonCounts.get(
          row.season,
        ) ?? 0
      ) + 1,
    );
  }

  console.log("");

  console.log(
    "APPROVED SEASON DISTRIBUTION",
  );

  for (
    const [
      season,
      count,
    ]
    of [
      ...seasonCounts.entries(),
    ].sort(
      (
        a,
        b,
      ) =>
        a[0].localeCompare(
          b[0],
        ),
    )
  ) {
    console.log(
      `  ${season}: ${count}`,
    );
  }

  /*
   * ---------------------------------------------------------
   * BUILD SNAPSHOTS
   * ---------------------------------------------------------
   */

  const incomingSnapshots:
    SnapshotData[] = [];

  for (
    const summary
    of importableSummaries
  ) {
    const key =
      scopeKey(
        summary.programId,
        summary.season,
      );

    const players =
      playersByScope.get(
        key,
      ) ?? [];

    /*
     * A SUCCESS/PARTIAL summary with zero corresponding player
     * rows is not safe to import.
     */
    if (
      players.length ===
      0
    ) {
      throw new Error(
        `Importable program has zero approved player rows: ${summary.collegeName} (${summary.season})`,
      );
    }

    incomingSnapshots.push(
      buildSnapshot(
        summary,
        players,
      ),
    );
  }

  /*
   * ---------------------------------------------------------
   * READ EXISTING DB STATE
   * ---------------------------------------------------------
   */

  const seasons =
    [
      ...new Set(
        importableSummaries.map(
          (row) =>
            row.season,
        ),
      ),
    ];

  const targetProgramIds =
    importableSummaries.map(
      (row) =>
        row.programId,
    );

  const existingSnapshots =
    await prisma
      .collegeBaseballRosterSnapshot
      .findMany({
        where: {
          programId: {
            in:
              targetProgramIds,
          },

          season: {
            in:
              seasons,
          },
        },
      });

  const approvedScopeSet =
    new Set(
      importableSummaries.map(
        (row) =>
          scopeKey(
            row.programId,
            row.season,
          ),
      ),
    );

  const existingPlayers =
    await prisma
      .collegeBaseballRosterPlayer
      .findMany({
        where: {
          programId: {
            in:
              targetProgramIds,
          },

          season: {
            in:
              seasons,
          },
        },
      });

  /*
   * Keep only exact approved scopes. A school's 2026 data must
   * never be treated as replaceable merely because its 2027
   * approved roster is being imported.
   */
  const scopedExistingSnapshots =
    existingSnapshots.filter(
      (row) =>
        approvedScopeSet.has(
          scopeKey(
            row.programId,
            row.season,
          ),
        ),
    );

  const scopedExistingPlayers =
    existingPlayers.filter(
      (row) =>
        approvedScopeSet.has(
          scopeKey(
            row.programId,
            row.season,
          ),
        ),
    );

  /*
   * ---------------------------------------------------------
   * SNAPSHOT DRY-RUN DIFF
   * ---------------------------------------------------------
   */

  const existingSnapshotByScope =
    new Map(
      scopedExistingSnapshots.map(
        (snapshot) => [
          scopeKey(
            snapshot.programId,
            snapshot.season,
          ),
          snapshot,
        ],
      ),
    );

  let snapshotsWouldCreate =
    0;

  let snapshotsWouldUpdate =
    0;

  let snapshotsUnchanged =
    0;

  for (
    const incoming
    of incomingSnapshots
  ) {
    const existing =
      existingSnapshotByScope.get(
        scopeKey(
          incoming.programId,
          incoming.season,
        ),
      );

    if (!existing) {
      snapshotsWouldCreate +=
        1;

      continue;
    }

    if (
      snapshotMatches(
        existing as unknown as Record<
          string,
          unknown
        >,
        incoming,
      )
    ) {
      snapshotsUnchanged +=
        1;
    } else {
      snapshotsWouldUpdate +=
        1;
    }
  }

  /*
   * ---------------------------------------------------------
   * PLAYER DRY-RUN DIFF
   * ---------------------------------------------------------
   */

  const incomingPlayerByKey =
    new Map(
      validPlayers.map(
        (player) => [
          playerKey(
            player,
          ),
          player,
        ],
      ),
    );

  const existingPlayerByKey =
    new Map(
      scopedExistingPlayers.map(
        (player) => [
          [
            player.programId,
            player.season,
            player.name
              .trim()
              .toLowerCase(),
          ].join(
            "|",
          ),
          player,
        ],
      ),
    );

  let playersNew =
    0;

  let playersChanged =
    0;

  let playersUnchanged =
    0;

  for (
    const [
      key,
      incoming,
    ]
    of incomingPlayerByKey
  ) {
    const existing =
      existingPlayerByKey.get(
        key,
      );

    if (!existing) {
      playersNew +=
        1;

      continue;
    }

    if (
      playerMatches(
        existing as unknown as Record<
          string,
          unknown
        >,
        incoming,
      )
    ) {
      playersUnchanged +=
        1;
    } else {
      playersChanged +=
        1;
    }
  }

  let staleExistingPlayers =
    0;

  for (
    const key
    of existingPlayerByKey.keys()
  ) {
    if (
      !incomingPlayerByKey.has(
        key,
      )
    ) {
      staleExistingPlayers +=
        1;
    }
  }

  const scopesReplacingExistingPlayers =
    new Set(
      scopedExistingPlayers.map(
        (player) =>
          scopeKey(
            player.programId,
            player.season,
          ),
      ),
    ).size;

  /*
   * ---------------------------------------------------------
   * REPORT
   * ---------------------------------------------------------
   */

  console.log("");

  console.log(
    "=================================================",
  );

  console.log(
    "D1 ROSTER IMPORT DRY-RUN SUMMARY",
  );

  console.log(
    "=================================================",
  );

  console.log(
    `Programs in approved baseline: ${summaryRows.length}`,
  );

  console.log(
    `Programs importable:           ${importableSummaries.length}`,
  );

  console.log(
    `Protected NO_ROSTER programs: ${noRoster.length}`,
  );

  console.log("");

  console.log(
    "SNAPSHOTS",
  );

  console.log(
    `  would create:                ${snapshotsWouldCreate}`,
  );

  console.log(
    `  would update:                ${snapshotsWouldUpdate}`,
  );

  console.log(
    `  unchanged:                   ${snapshotsUnchanged}`,
  );

  console.log(
    `  protected/skipped:           ${noRoster.length}`,
  );

  console.log("");

  console.log(
    "PLAYERS",
  );

  console.log(
    `  approved source rows:        ${parsedPlayers.length}`,
  );

  console.log(
    `  valid unique rows:           ${validPlayers.length}`,
  );

  console.log(
    `  protected rows skipped:      ${protectedPlayerRowsSkipped}`,
  );

  console.log(
    `  existing target rows:        ${scopedExistingPlayers.length}`,
  );

  console.log(
    `  new player keys:             ${playersNew}`,
  );

  console.log(
    `  changed player keys:         ${playersChanged}`,
  );

  console.log(
    `  unchanged player keys:       ${playersUnchanged}`,
  );

  console.log(
    `  stale existing rows:         ${staleExistingPlayers}`,
  );

  console.log(
    `  scopes replacing players:    ${scopesReplacingExistingPlayers}`,
  );

  console.log("");

  console.log(
    "SAFETY",
  );

  console.log(
    `  Northwestern protected:      ${PROTECTED_NO_ROSTER_PROGRAMS.has("Northwestern University") ? "YES" : "NO"}`,
  );

  console.log(
    "  zero-player overwrite:       BLOCKED",
  );

  console.log(
    "  cross-season deletion:       BLOCKED",
  );

  console.log(
    `  database writes:             ${APPLY ? "ENABLED" : "0"}`,
  );

  /*
   * ---------------------------------------------------------
   * STOP HERE IN DRY RUN
   * ---------------------------------------------------------
   */

  if (!APPLY) {
    console.log("");

    console.log(
      "DRY RUN COMPLETE — NO DATABASE WRITES",
    );

    return;
  }

  /*
   * ---------------------------------------------------------
   * APPLY
   * ---------------------------------------------------------
   *
   * Each approved program + season is handled independently.
   *
   * We replace only that exact season's player rows.
   * Existing historical seasons remain untouched.
   */

  console.log("");

  console.log(
    "APPLYING APPROVED D1 ROSTERS...",
  );

  let appliedScopes =
    0;

  for (
    const summary
    of importableSummaries
  ) {
    const key =
      scopeKey(
        summary.programId,
        summary.season,
      );

    const players =
      playersByScope.get(
        key,
      ) ?? [];

    if (
      players.length ===
      0
    ) {
      throw new Error(
        `Safety stop: refusing zero-player apply for ${summary.collegeName} ${summary.season}`,
      );
    }

    const snapshot =
      buildSnapshot(
        summary,
        players,
      );

    await prisma.$transaction(
      async (
        tx,
      ) => {
        await tx
          .collegeBaseballRosterSnapshot
          .upsert({
            where: {
              programId_season: {
                programId:
                  summary.programId,

                season:
                  summary.season,
              },
            },

            create: {
              ...snapshot,

              verifiedAt:
                new Date(),
            },

            update: {
              rosterSize:
                snapshot.rosterSize,

              freshmen:
                snapshot.freshmen,

              sophomores:
                snapshot.sophomores,

              juniors:
                snapshot.juniors,

              seniors:
                snapshot.seniors,

              graduateStudents:
                snapshot.graduateStudents,

              pitchers:
                snapshot.pitchers,

              catchers:
                snapshot.catchers,

              infielders:
                snapshot.infielders,

              outfielders:
                snapshot.outfielders,

              twoWayPlayers:
                snapshot.twoWayPlayers,

              leftHandedPitchers:
                snapshot.leftHandedPitchers,

              rightHandedPitchers:
                snapshot.rightHandedPitchers,

              sourceUrl:
                snapshot.sourceUrl,

              verifiedAt:
                new Date(),
            },
          });

        /*
         * Exact-scope replacement.
         *
         * Example:
         * Georgia Tech 2026 gets replaced.
         *
         * Georgia Tech 2025 / 2024 are untouched.
         */
        await tx
          .collegeBaseballRosterPlayer
          .deleteMany({
            where: {
              programId:
                summary.programId,

              season:
                summary.season,
            },
          });

        await tx
          .collegeBaseballRosterPlayer
          .createMany({
            data:
              players.map(
                (
                  player,
                ) => ({
                  programId:
                    player.programId,

                  season:
                    player.season,

                  name:
                    player.name,

                  positionRaw:
                    player.positionRaw,

                  primaryPosition:
                    player.primaryPosition,

                  classYearRaw:
                    player.classYearRaw,

                  classBucket:
                    player.classBucket,

                  heightRaw:
                    player.heightRaw,

                  heightInches:
                    player.heightInches,

                  weightRaw:
                    player.weightRaw,

                  weightLb:
                    player.weightLb,

                  rosterProfileUrl:
                    player.rosterProfileUrl,

                  sourceUrl:
                    player.sourceUrl,

                  verifiedAt:
                    new Date(),
                }),
              ),
          });
      },
    );

    appliedScopes +=
      1;

    console.log(
      `  [${appliedScopes}/${importableSummaries.length}] ${summary.collegeName} — ${summary.season} — ${players.length} players`,
    );
  }

  console.log("");

  console.log(
    "=================================================",
  );

  console.log(
    "D1 ROSTER IMPORT COMPLETE",
  );

  console.log(
    "=================================================",
  );

  console.log(
    `Program-season scopes applied: ${appliedScopes}`,
  );

  console.log(
    `Player rows imported:          ${validPlayers.length}`,
  );

  console.log(
    `Protected programs skipped:    ${noRoster.length}`,
  );
}

main()
  .catch(
    (
      error,
    ) => {
      console.error(
        "",
      );

      console.error(
        "D1 roster import failed:",
      );

      console.error(
        error,
      );

      process.exitCode =
        1;
    },
  )
  .finally(
    async () => {
      await prisma
        .$disconnect();
    },
  );