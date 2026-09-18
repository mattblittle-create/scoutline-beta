// scripts/generate-d1-roster-metric-benchmarks.ts

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/*
 * ============================================================
 * D1 ROSTER-DERIVED METRIC BENCHMARK GENERATOR
 * ============================================================
 *
 * Purpose:
 *
 * Use approved/imported CollegeBaseballRosterSnapshot +
 * CollegeBaseballRosterPlayer data to calculate observed:
 *
 *   - SCHOOL height / weight averages
 *   - CONFERENCE height / weight benchmarks
 *   - NCAA_D1 height / weight benchmarks
 *
 * SCHOOL rows are written to:
 *
 *   CollegeBaseballMetricAverage
 *
 * CONFERENCE / DIVISION rows are written to:
 *
 *   BaseballMetricBenchmark
 *
 * Default mode is DRY RUN.
 *
 * Apply:
 *
 *   npx tsx scripts/generate-d1-roster-metric-benchmarks.ts --apply
 *
 * This script intentionally DOES NOT alter estimated performance
 * metrics such as:
 *
 *   exitVelo
 *   sixtyYdDash
 *   homeToFirst
 *   infieldThrowVelo
 *   outfieldThrowVelo
 *   catcherThrowVelo
 *   popTime
 *   avgFbVelo
 *   avgChVelo
 *   avgBbVelo
 *
 * It only replaces / creates observed heightIn and weightLb rows.
 */

const APPLY =
  process.argv.includes("--apply");

const DIVISION =
  "NCAA_D1";

/*
 * Minimum sample sizes.
 *
 * We do not want to publish an "average" based on one player.
 */
const MIN_SCHOOL_SAMPLE =
  3;

const MIN_CONFERENCE_SAMPLE =
  10;

const MIN_DIVISION_SAMPLE =
  25;

/*
 * Defensive sanity ranges.
 *
 * These are not recruiting benchmarks.
 * They simply reject obviously malformed roster data.
 */
const MIN_HEIGHT_IN =
  60;

const MAX_HEIGHT_IN =
  84;

const MIN_WEIGHT_LB =
  120;

const MAX_WEIGHT_LB =
  320;

const METRIC_DEFINITIONS = {
  heightIn: {
    metricKey: "heightIn",
    metricLabel: "Height",
    unit: "in",
  },

  weightLb: {
    metricKey: "weightLb",
    metricLabel: "Weight",
    unit: "lb",
  },
} as const;

type MetricKey =
  keyof typeof METRIC_DEFINITIONS;

type SnapshotRow = {
  id: string;
  programId: string;
  season: string;
  sourceUrl: string | null;
  verifiedAt: Date | null;

  program: {
    id: string;
    conference: string | null;
    division: string | null;

    college: {
      id: string;
      name: string;
      slug: string;
    };
  };
};

type PlayerRow = {
  programId: string;
  season: string;

  name: string;

  positionRaw: string | null;
  primaryPosition: string | null;

  heightInches: number | null;
  weightLb: number | null;
};

type MetricObservation = {
  programId: string;

  collegeName: string;
  collegeSlug: string;

  conference: string;
  division: string;

  season: string;

  sourceUrl: string | null;
  verifiedAt: Date | null;

  position: string;

  metricKey: MetricKey;

  value: number;
};

type AggregateAccumulator = {
  values: number[];

  sourceUrls: Set<string>;

  verifiedDates: Date[];
};

type GeneratedMetricRow = {
  level:
    | "SCHOOL"
    | "CONFERENCE"
    | "DIVISION";

  sourceKey: string;

  programId: string | null;

  collegeName: string | null;

  conference: string | null;

  division: string | null;

  season: string | null;

  position: string;

  metricKey: MetricKey;

  metricLabel: string;

  averageValue: number;

  minValue: number;

  maxValue: number;

  unit: string;

  sampleSize: number;

  sourceUrl: string | null;

  verifiedAt: Date | null;

  sourceNote: string | null;
};

type ExistingSchoolMetric = {
  id: string;

  programId: string;

  position: string;

  metricKey: string;

  metricLabel: string | null;

  averageValue: any;
  minValue: any;
  maxValue: any;

  unit: string | null;

  sampleSize: number | null;

  sourceUrl: string | null;

  lastVerifiedAt: Date | null;
};

type ExistingAggregateMetric = {
  id: string;

  scope: string;

  sourceKey: string;

  position: string;

  metricKey: string;

  metricLabel: string | null;

  averageValue: any;
  minValue: any;
  maxValue: any;

  unit: string | null;

  sampleSize: number | null;

  sourceUrl: string | null;
  sourceNote: string | null;

  verifiedAt: Date | null;
};

/*
 * ------------------------------------------------------------
 * GENERAL HELPERS
 * ------------------------------------------------------------
 */

function cleanText(
  value: unknown
): string {
  return String(
    value ?? ""
  )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePositionText(
  value: unknown
): string {
  return cleanText(value)
    .toUpperCase()
    .replace(/\./g, "");
}

function roundMetric(
  value: number,
  metricKey: MetricKey
): number {
  if (
    metricKey ===
    "heightIn"
  ) {
    return Number(
      value.toFixed(1)
    );
  }

  if (
    metricKey ===
    "weightLb"
  ) {
    return Number(
      value.toFixed(1)
    );
  }

  return Number(
    value.toFixed(2)
  );
}

function asNumber(
  value: unknown
): number | null {
  if (
    value == null ||
    value === ""
  ) {
    return null;
  }

  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : null;
}

function formatDivisionLabel(
  value?: string | null
): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/_/g, " ");
}

function buildSourceNote({
  scope,
  division,
  conference,
  position,
}: {
  scope: "SCHOOL" | "CONFERENCE" | "DIVISION" | "GLOBAL";
  division?: string | null;
  conference?: string | null;
  position: string;
}) {
  if (
    scope === "CONFERENCE" &&
    conference
  ) {
    return `General metric(s) based on ${conference} ${position} averages.`;
  }

  if (
    scope === "DIVISION" &&
    division
  ) {
    return `General metric(s) based on ${formatDivisionLabel(division)} ${position} averages.`;
  }

  if (
    scope === "GLOBAL"
  ) {
    return `General metric(s) based on ${position} averages.`;
  }

  return null;
}

function dateTimestamp() {
  return new Date()
    .toISOString()
    .replace(
      /[:.]/g,
      "-"
    );
}

function csvEscape(
  value: unknown
) {
  const raw =
    String(
      value ?? ""
    );

  if (
    raw.includes(",") ||
    raw.includes('"') ||
    raw.includes("\n")
  ) {
    return `"${raw.replace(
      /"/g,
      '""'
    )}"`;
  }

  return raw;
}

function writeCsv(
  filePath: string,
  rows: Array<
    Array<unknown>
  >
) {
  fs.mkdirSync(
    path.dirname(
      filePath
    ),
    {
      recursive: true,
    }
  );

  fs.writeFileSync(
    filePath,
    rows
      .map(
        (row) =>
          row
            .map(
              csvEscape
            )
            .join(",")
      )
      .join("\n"),
    "utf8"
  );
}

function latestDate(
  dates: Date[]
): Date | null {
  if (
    dates.length === 0
  ) {
    return null;
  }

  return dates.reduce(
    (
      latest,
      current
    ) =>
      current.getTime() >
      latest.getTime()
        ? current
        : latest
  );
}

/*
 * ------------------------------------------------------------
 * POSITION NORMALIZATION
 * ------------------------------------------------------------
 *
 * Keep this intentionally aligned with the roster intelligence
 * rules we established.
 *
 * Important:
 *
 * - 3B/1B or 1B/3B => CIF
 * - SS/2B or 2B/SS => MIF
 *
 * Other legitimate multi-position combinations may contribute
 * to multiple positions:
 *
 * - RHP/1B => RHP + 1B
 * - C/1B   => C + 1B
 *
 * We do NOT convert generic INF to specific 3B/SS/2B/1B.
 * We do NOT convert generic OF to LF/CF/RF.
 */

function normalizeSinglePosition(
  value: unknown
): string {
  const raw =
    normalizePositionText(
      value
    );

  if (!raw) {
    return "";
  }

  /*
   * Pitchers.
   */
  if (
    /\bRHP\b/.test(raw) ||
    raw.includes(
      "RIGHT-HANDED PITCHER"
    ) ||
    raw.includes(
      "RIGHT HANDED PITCHER"
    )
  ) {
    return "RHP";
  }

  if (
    /\bLHP\b/.test(raw) ||
    raw.includes(
      "LEFT-HANDED PITCHER"
    ) ||
    raw.includes(
      "LEFT HANDED PITCHER"
    )
  ) {
    return "LHP";
  }

  /*
   * Catcher.
   *
   * Also support repeated school-feed formats such as:
   *
   *   C C
   *   C IF
   */
  if (
    /\bC\b/.test(raw) ||
    /\bCATCHER\b/.test(raw)
  ) {
    return "C";
  }

  /*
   * Exact infield positions.
   */
  if (
    /\b1B\b/.test(raw) ||
    raw.includes(
      "FIRST BASE"
    )
  ) {
    return "1B";
  }

  if (
    /\b2B\b/.test(raw) ||
    raw.includes(
      "SECOND BASE"
    )
  ) {
    return "2B";
  }

  if (
    /\bSS\b/.test(raw) ||
    raw.includes(
      "SHORTSTOP"
    )
  ) {
    return "SS";
  }

  if (
    /\b3B\b/.test(raw) ||
    raw.includes(
      "THIRD BASE"
    )
  ) {
    return "3B";
  }

  /*
   * Grouped infield.
   */
  if (
    /\bMIF\b/.test(raw) ||
    raw.includes(
      "MIDDLE INFIELD"
    )
  ) {
    return "MIF";
  }

  if (
    /\bCIF\b/.test(raw) ||
    raw.includes(
      "CORNER INFIELD"
    )
  ) {
    return "CIF";
  }

  if (
    /\bINF\b/.test(raw) ||
    /\bIF\b/.test(raw) ||
    raw.includes(
      "INFIELDER"
    ) ||
    raw.includes(
      "INFIELD"
    )
  ) {
    return "INF";
  }

  /*
   * Exact outfield.
   */
  if (
    /\bLF\b/.test(raw) ||
    raw.includes(
      "LEFT FIELD"
    )
  ) {
    return "LF";
  }

  if (
    /\bCF\b/.test(raw) ||
    raw.includes(
      "CENTER FIELD"
    )
  ) {
    return "CF";
  }

  if (
    /\bRF\b/.test(raw) ||
    raw.includes(
      "RIGHT FIELD"
    )
  ) {
    return "RF";
  }

  if (
    /\bOF\b/.test(raw) ||
    raw.includes(
      "OUTFIELD"
    )
  ) {
    return "OF";
  }

  /*
   * Utility.
   */
  if (
    /\bUTL\b/.test(raw) ||
    /\bUTIL\b/.test(raw) ||
    /\bUT\b/.test(raw) ||
    raw.includes(
      "UTILITY"
    )
  ) {
    return "UTL";
  }

  /*
   * Generic pitcher contains no handedness.
   *
   * Do not infer RHP/LHP.
   *
   * School feeds may repeat the descriptive label and
   * abbreviation:
   *
   *   Pitcher P
   *   P P
   *   Pitcher Pitcher
   */
  if (
    raw === "P" ||
    raw === "PITCHER" ||
    /\bPITCHER\b/.test(raw) ||
    /(^|\s)P(\s|$)/.test(raw)
  ) {
    return "P";
  }

  return "";
}

function normalizeRosterPositions(
  positionRaw: string | null,
  primaryPosition: string | null
): string[] {
  const raw =
    normalizePositionText(
      positionRaw ||
      primaryPosition
    );

  if (!raw) {
    return [];
  }

  /*
   * Detect true ScoutLine combination groups first.
   */
  const has1B =
    /\b1B\b/.test(raw);

  const has2B =
    /\b2B\b/.test(raw);

  const has3B =
    /\b3B\b/.test(raw);

  const hasSS =
    /\bSS\b/.test(raw);

  if (
    has1B &&
    has3B
  ) {
    /*
     * Preserve pitcher status if this is something such as
     * RHP/3B/1B.
     */
    const positions =
      ["CIF"];

    if (
      /\bRHP\b/.test(raw) ||
      raw.includes(
        "RIGHT-HANDED PITCHER"
      )
    ) {
      positions.push(
        "RHP"
      );
    }

    if (
      /\bLHP\b/.test(raw) ||
      raw.includes(
        "LEFT-HANDED PITCHER"
      )
    ) {
      positions.push(
        "LHP"
      );
    }

    return Array.from(
      new Set(
        positions
      )
    );
  }

  if (
    has2B &&
    hasSS
  ) {
    const positions =
      ["MIF"];

    if (
      /\bRHP\b/.test(raw) ||
      raw.includes(
        "RIGHT-HANDED PITCHER"
      )
    ) {
      positions.push(
        "RHP"
      );
    }

    if (
      /\bLHP\b/.test(raw) ||
      raw.includes(
        "LEFT-HANDED PITCHER"
      )
    ) {
      positions.push(
        "LHP"
      );
    }

    return Array.from(
      new Set(
        positions
      )
    );
  }

  /*
   * Normal multi-position records.
   *
   * School feeds sometimes publish compact repeated-space
   * formats such as:
   *
   *   C IF
   *   UT UT
   *
   * Slash/comma/ampersand/plus remain the primary separators.
   */
  const pieces =
    raw
      .split(
        /[\/,&+]/
      )
      .map(
        (piece) =>
          normalizeSinglePosition(
            piece
          )
      )
      .filter(Boolean);

  if (
    pieces.length
  ) {
    return Array.from(
      new Set(
        pieces
      )
    );
  }

  const single =
    normalizeSinglePosition(
      raw
    );

  if (single) {
    return [
      single,
    ];
  }

  /*
   * Last fallback:
   * imported primaryPosition may already be normalized.
   */
  const primary =
    normalizeSinglePosition(
      primaryPosition
    );

  return primary
    ? [primary]
    : [];
}

/*
 * ------------------------------------------------------------
 * OBSERVATION VALIDATION
 * ------------------------------------------------------------
 */

function validHeight(
  value: number | null
): value is number {
  return (
    value != null &&
    Number.isFinite(
      value
    ) &&
    value >=
      MIN_HEIGHT_IN &&
    value <=
      MAX_HEIGHT_IN
  );
}

function validWeight(
  value: number | null
): value is number {
  return (
    value != null &&
    Number.isFinite(
      value
    ) &&
    value >=
      MIN_WEIGHT_LB &&
    value <=
      MAX_WEIGHT_LB
  );
}

/*
 * ------------------------------------------------------------
 * AGGREGATION
 * ------------------------------------------------------------
 */

function addAggregateValue(
  map: Map<
    string,
    AggregateAccumulator
  >,
  key: string,
  value: number,
  sourceUrl: string | null,
  verifiedAt: Date | null
) {
  let entry =
    map.get(
      key
    );

  if (!entry) {
    entry = {
      values: [],
      sourceUrls:
        new Set<string>(),
      verifiedDates: [],
    };

    map.set(
      key,
      entry
    );
  }

  entry.values.push(
    value
  );

  if (sourceUrl) {
    entry.sourceUrls.add(
      sourceUrl
    );
  }

  if (verifiedAt) {
    entry.verifiedDates.push(
      verifiedAt
    );
  }
}

function aggregateStats(
  values: number[],
  metricKey: MetricKey
) {
  const sorted =
    [...values].sort(
      (
        a,
        b
      ) =>
        a - b
    );

  const sum =
    sorted.reduce(
      (
        total,
        value
      ) =>
        total +
        value,
      0
    );

  return {
    averageValue:
      roundMetric(
        sum /
          sorted.length,
        metricKey
      ),

    minValue:
      roundMetric(
        sorted[0],
        metricKey
      ),

    maxValue:
      roundMetric(
        sorted[
          sorted.length -
            1
        ],
        metricKey
      ),

    sampleSize:
      sorted.length,
  };
}

/*
 * ------------------------------------------------------------
 * DATABASE COMPARISON
 * ------------------------------------------------------------
 */

function numericEqual(
  left: unknown,
  right: unknown
) {
  const a =
    asNumber(left);

  const b =
    asNumber(right);

  if (
    a == null &&
    b == null
  ) {
    return true;
  }

  if (
    a == null ||
    b == null
  ) {
    return false;
  }

  return (
    Math.abs(
      a - b
    ) <
    0.0001
  );
}

function datesEqual(
  left: Date | null,
  right: Date | null
) {
  if (
    left == null &&
    right == null
  ) {
    return true;
  }

  if (
    left == null ||
    right == null
  ) {
    return false;
  }

  return (
    left.getTime() ===
    right.getTime()
  );
}

function schoolRowChanged(
  existing: ExistingSchoolMetric,
  row: GeneratedMetricRow
) {
  return !(
    existing.metricLabel ===
      row.metricLabel &&
    numericEqual(
      existing.averageValue,
      row.averageValue
    ) &&
    numericEqual(
      existing.minValue,
      row.minValue
    ) &&
    numericEqual(
      existing.maxValue,
      row.maxValue
    ) &&
    existing.unit ===
      row.unit &&
    existing.sampleSize ===
      row.sampleSize &&
    (
      existing.sourceUrl ||
      null
    ) ===
      (
        row.sourceUrl ||
        null
      ) &&
    datesEqual(
      existing.lastVerifiedAt,
      row.verifiedAt
    )
  );
}

function benchmarkRowChanged(
  existing: ExistingAggregateMetric,
  row: GeneratedMetricRow
) {
  return !(
    existing.metricLabel ===
      row.metricLabel &&
    numericEqual(
      existing.averageValue,
      row.averageValue
    ) &&
    numericEqual(
      existing.minValue,
      row.minValue
    ) &&
    numericEqual(
      existing.maxValue,
      row.maxValue
    ) &&
    existing.unit ===
      row.unit &&
    existing.sampleSize ===
      row.sampleSize &&
    (
      existing.sourceUrl ||
      null
    ) ===
      (
        row.sourceUrl ||
        null
      ) &&
    existing.sourceNote ===
      row.sourceNote &&
    datesEqual(
      existing.verifiedAt,
      row.verifiedAt
    )
  );
}

/*
 * ------------------------------------------------------------
 * MAIN
 * ------------------------------------------------------------
 */

async function main() {
  console.log(
    "================================================="
  );

  console.log(
    "D1 ROSTER METRIC BENCHMARK GENERATOR"
  );

  console.log(
    "================================================="
  );

  console.log(
    `Mode: ${
      APPLY
        ? "APPLY — DATABASE WRITES ENABLED"
        : "DRY RUN — NO DATABASE WRITES"
    }`
  );

  console.log("");

  /*
   * ----------------------------------------------------------
   * LOAD D1 ROSTER SNAPSHOTS
   * ----------------------------------------------------------
   *
   * We deliberately use the latest imported snapshot currently
   * stored for each program.
   */

  const snapshotsRaw =
    await prisma.collegeBaseballRosterSnapshot.findMany({
      where: {
        program: {
          division:
            DIVISION as any,
        },
      },

      include: {
        program: {
          select: {
            id: true,
            conference: true,
            division: true,

            college: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },

      orderBy: [
        {
          programId:
            "asc",
        },
        {
          season:
            "desc",
        },
      ],
    });

  const latestSnapshotByProgram =
    new Map<
      string,
      SnapshotRow
    >();

  for (
    const snapshot
    of snapshotsRaw as SnapshotRow[]
  ) {
    if (
      !latestSnapshotByProgram.has(
        snapshot.programId
      )
    ) {
      latestSnapshotByProgram.set(
        snapshot.programId,
        snapshot
      );
    }
  }

  const snapshots =
    Array.from(
      latestSnapshotByProgram.values()
    );

  console.log(
    `Latest D1 program snapshots:      ${snapshots.length}`
  );

  /*
   * Load player rows only for latest program-season scopes.
   */
  const rosterPlayers =
    snapshots.length
      ? await prisma.collegeBaseballRosterPlayer.findMany({
          where: {
            OR:
              snapshots.map(
                (
                  snapshot
                ) => ({
                  programId:
                    snapshot.programId,

                  season:
                    snapshot.season,
                })
              ),
          },

          select: {
            programId:
              true,

            season:
              true,

            name:
              true,

            positionRaw:
              true,

            primaryPosition:
              true,

            heightInches:
              true,

            weightLb:
              true,
          },
        })
      : [];

  console.log(
    `Roster player rows loaded:        ${rosterPlayers.length}`
  );

  console.log("");

  /*
   * ----------------------------------------------------------
   * BUILD SNAPSHOT LOOKUP
   * ----------------------------------------------------------
   */

  const snapshotByScope =
    new Map<
      string,
      SnapshotRow
    >();

  for (
    const snapshot
    of snapshots
  ) {
    snapshotByScope.set(
      `${snapshot.programId}|${snapshot.season}`,
      snapshot
    );
  }

  /*
   * ----------------------------------------------------------
   * CREATE RAW OBSERVATIONS
   * ----------------------------------------------------------
   */

  const observations:
    MetricObservation[] =
    [];

let playersWithoutPosition =
    0;

  const unusablePositionCounts =
    new Map<
      string,
      {
        positionRaw: string;
        primaryPosition: string;
        count: number;
        examples: string[];
      }
    >();

  let invalidHeightRows =
    0;

  let invalidWeightRows =
    0;

  let validHeightObservations =
    0;

  let validWeightObservations =
    0;

  for (
    const player
    of rosterPlayers as PlayerRow[]
  ) {
    const snapshot =
      snapshotByScope.get(
        `${player.programId}|${player.season}`
      );

    if (!snapshot) {
      continue;
    }

    const positions =
      normalizeRosterPositions(
        player.positionRaw,
        player.primaryPosition
      );

if (
      positions.length ===
      0
    ) {
      playersWithoutPosition +=
        1;

      const rawPosition =
        cleanText(
          player.positionRaw
        );

      const primaryPosition =
        cleanText(
          player.primaryPosition
        );

      const key =
        `${rawPosition || "(blank)"}|${primaryPosition || "(blank)"}`;

      const existing =
        unusablePositionCounts.get(
          key
        );

      if (existing) {
        existing.count +=
          1;

        if (
          existing.examples.length <
          5
        ) {
          existing.examples.push(
            player.name
          );
        }
      } else {
        unusablePositionCounts.set(
          key,
          {
            positionRaw:
              rawPosition ||
              "(blank)",

            primaryPosition:
              primaryPosition ||
              "(blank)",

            count:
              1,

            examples: [
              player.name,
            ],
          }
        );
      }

      continue;
    }

    const conference =
      cleanText(
        snapshot.program.conference
      );

    const division =
      cleanText(
        snapshot.program.division
      ).toUpperCase();

    if (
      validHeight(
        player.heightInches
      )
    ) {
      for (
        const position
        of positions
      ) {
        observations.push({
          programId:
            snapshot.programId,

          collegeName:
            snapshot.program.college.name,

          collegeSlug:
            snapshot.program.college.slug,

          conference,

          division,

          season:
            snapshot.season,

          sourceUrl:
            snapshot.sourceUrl,

          verifiedAt:
            snapshot.verifiedAt,

          position,

          metricKey:
            "heightIn",

          value:
            player.heightInches,
        });

        validHeightObservations +=
          1;
      }
    } else if (
      player.heightInches !=
      null
    ) {
      invalidHeightRows +=
        1;
    }

    if (
      validWeight(
        player.weightLb
      )
    ) {
      for (
        const position
        of positions
      ) {
        observations.push({
          programId:
            snapshot.programId,

          collegeName:
            snapshot.program.college.name,

          collegeSlug:
            snapshot.program.college.slug,

          conference,

          division,

          season:
            snapshot.season,

          sourceUrl:
            snapshot.sourceUrl,

          verifiedAt:
            snapshot.verifiedAt,

          position,

          metricKey:
            "weightLb",

          value:
            player.weightLb,
        });

        validWeightObservations +=
          1;
      }
    } else if (
      player.weightLb !=
      null
    ) {
      invalidWeightRows +=
        1;
    }
  }

  console.log(
    `Metric observations generated:    ${observations.length}`
  );

  console.log(
    `Height observations:              ${validHeightObservations}`
  );

  console.log(
    `Weight observations:              ${validWeightObservations}`
  );

  console.log(
    `Players without usable position:  ${playersWithoutPosition}`
  );

  if (
    unusablePositionCounts.size >
    0
  ) {
    console.log("");

    console.log(
      "UNUSABLE POSITION QA"
    );

    console.log(
      "-------------------------------------------------"
    );

    const sortedUnusablePositions =
      Array.from(
        unusablePositionCounts.values()
      ).sort(
        (
          a,
          b
        ) =>
          b.count -
          a.count ||
          a.positionRaw.localeCompare(
            b.positionRaw
          )
      );

    for (
      const item
      of sortedUnusablePositions
    ) {
      console.log(
        `  ${String(item.count).padStart(4)} | raw="${item.positionRaw}" | primary="${item.primaryPosition}" | examples=${item.examples.join(", ")}`
      );
    }

    console.log(
      "-------------------------------------------------"
    );

    console.log(
      `Unique unusable position combinations: ${sortedUnusablePositions.length}`
    );
  }
  
  console.log(
    `Invalid height values skipped:    ${invalidHeightRows}`
  );

  console.log(
    `Invalid weight values skipped:    ${invalidWeightRows}`
  );

  console.log("");

  /*
   * ----------------------------------------------------------
   * BUILD SCHOOL AGGREGATES
   * ----------------------------------------------------------
   */

  const schoolAggregate =
    new Map<
      string,
      AggregateAccumulator
    >();

  const schoolMeta =
    new Map<
      string,
      MetricObservation
    >();

  for (
    const observation
    of observations
  ) {
    const key =
      [
        observation.programId,
        observation.position,
        observation.metricKey,
      ].join("|");

    addAggregateValue(
      schoolAggregate,
      key,
      observation.value,
      observation.sourceUrl,
      observation.verifiedAt
    );

    if (
      !schoolMeta.has(
        key
      )
    ) {
      schoolMeta.set(
        key,
        observation
      );
    }
  }

  const schoolRows:
    GeneratedMetricRow[] =
    [];

  let lowSampleSchoolRows =
    0;

  for (
    const [
      key,
      aggregate,
    ]
    of schoolAggregate.entries()
  ) {
    if (
      aggregate.values.length <
      MIN_SCHOOL_SAMPLE
    ) {
      lowSampleSchoolRows +=
        1;

      continue;
    }

    const meta =
      schoolMeta.get(
        key
      );

    if (!meta) {
      continue;
    }

    const stats =
      aggregateStats(
        aggregate.values,
        meta.metricKey
      );

    const definition =
      METRIC_DEFINITIONS[
        meta.metricKey
      ];

    schoolRows.push({
      level:
        "SCHOOL",

      sourceKey:
        meta.programId,

      programId:
        meta.programId,

      collegeName:
        meta.collegeName,

      conference:
        meta.conference ||
        null,

      division:
        meta.division ||
        null,

      season:
        meta.season,

      position:
        meta.position,

      metricKey:
        meta.metricKey,

      metricLabel:
        definition.metricLabel,

      averageValue:
        stats.averageValue,

      minValue:
        stats.minValue,

      maxValue:
        stats.maxValue,

      unit:
        definition.unit,

      sampleSize:
        stats.sampleSize,

      sourceUrl:
        meta.sourceUrl,

      verifiedAt:
        latestDate(
          aggregate.verifiedDates
        ),

      sourceNote:
        null,
    });
  }

  /*
   * ----------------------------------------------------------
   * BUILD CONFERENCE AGGREGATES
   * ----------------------------------------------------------
   */

  const conferenceAggregate =
    new Map<
      string,
      AggregateAccumulator
    >();

  for (
    const observation
    of observations
  ) {
    if (
      !observation.conference
    ) {
      continue;
    }

    const key =
      [
        observation.conference,
        observation.position,
        observation.metricKey,
      ].join("|");

    addAggregateValue(
      conferenceAggregate,
      key,
      observation.value,
      observation.sourceUrl,
      observation.verifiedAt
    );
  }

  const conferenceRows:
    GeneratedMetricRow[] =
    [];

  let lowSampleConferenceRows =
    0;

  for (
    const [
      key,
      aggregate,
    ]
    of conferenceAggregate.entries()
  ) {
    if (
      aggregate.values.length <
      MIN_CONFERENCE_SAMPLE
    ) {
      lowSampleConferenceRows +=
        1;

      continue;
    }

    const [
      conference,
      position,
      metricKeyRaw,
    ] =
      key.split("|");

    const metricKey =
      metricKeyRaw as MetricKey;

    const stats =
      aggregateStats(
        aggregate.values,
        metricKey
      );

    const definition =
      METRIC_DEFINITIONS[
        metricKey
      ];

    conferenceRows.push({
      level:
        "CONFERENCE",

      sourceKey:
        conference,

      programId:
        null,

      collegeName:
        null,

      conference,

      division:
        DIVISION,

      season:
        null,

      position,

      metricKey,

      metricLabel:
        definition.metricLabel,

      averageValue:
        stats.averageValue,

      minValue:
        stats.minValue,

      maxValue:
        stats.maxValue,

      unit:
        definition.unit,

      sampleSize:
        stats.sampleSize,

      sourceUrl:
        null,

      verifiedAt:
        latestDate(
          aggregate.verifiedDates
        ),

      sourceNote:
        buildSourceNote({
          scope:
            "CONFERENCE",
          division:
            DIVISION,
          conference,
          position,
        }),
    });
  }

  /*
   * ----------------------------------------------------------
   * BUILD NCAA D1 AGGREGATES
   * ----------------------------------------------------------
   */

  const divisionAggregate =
    new Map<
      string,
      AggregateAccumulator
    >();

  for (
    const observation
    of observations
  ) {
    const key =
      [
        observation.position,
        observation.metricKey,
      ].join("|");

    addAggregateValue(
      divisionAggregate,
      key,
      observation.value,
      observation.sourceUrl,
      observation.verifiedAt
    );
  }

  const divisionRows:
    GeneratedMetricRow[] =
    [];

  let lowSampleDivisionRows =
    0;

  for (
    const [
      key,
      aggregate,
    ]
    of divisionAggregate.entries()
  ) {
    if (
      aggregate.values.length <
      MIN_DIVISION_SAMPLE
    ) {
      lowSampleDivisionRows +=
        1;

      continue;
    }

    const [
      position,
      metricKeyRaw,
    ] =
      key.split("|");

    const metricKey =
      metricKeyRaw as MetricKey;

    const stats =
      aggregateStats(
        aggregate.values,
        metricKey
      );

    const definition =
      METRIC_DEFINITIONS[
        metricKey
      ];

    divisionRows.push({
      level:
        "DIVISION",

      sourceKey:
        DIVISION,

      programId:
        null,

      collegeName:
        null,

      conference:
        null,

      division:
        DIVISION,

      season:
        null,

      position,

      metricKey,

      metricLabel:
        definition.metricLabel,

      averageValue:
        stats.averageValue,

      minValue:
        stats.minValue,

      maxValue:
        stats.maxValue,

      unit:
        definition.unit,

      sampleSize:
        stats.sampleSize,

      sourceUrl:
        null,

      verifiedAt:
        latestDate(
          aggregate.verifiedDates
        ),

      sourceNote:
        buildSourceNote({
          scope:
            "DIVISION",
          division:
            DIVISION,
          conference:
            null,
          position,
        }),
    });
  }

  /*
   * Stable ordering for QA and generated CSVs.
   */
  schoolRows.sort(
    (
      a,
      b
    ) =>
      String(
        a.collegeName
      ).localeCompare(
        String(
          b.collegeName
        )
      ) ||
      a.position.localeCompare(
        b.position
      ) ||
      a.metricKey.localeCompare(
        b.metricKey
      )
  );

  conferenceRows.sort(
    (
      a,
      b
    ) =>
      String(
        a.conference
      ).localeCompare(
        String(
          b.conference
        )
      ) ||
      a.position.localeCompare(
        b.position
      ) ||
      a.metricKey.localeCompare(
        b.metricKey
      )
  );

  divisionRows.sort(
    (
      a,
      b
    ) =>
      a.position.localeCompare(
        b.position
      ) ||
      a.metricKey.localeCompare(
        b.metricKey
      )
  );

  console.log(
    "GENERATED ROWS"
  );

  console.log(
    `  SCHOOL:                      ${schoolRows.length}`
  );

  console.log(
    `  CONFERENCE:                  ${conferenceRows.length}`
  );

  console.log(
    `  DIVISION:                    ${divisionRows.length}`
  );

  console.log("");

  console.log(
    "LOW SAMPLE ROWS SKIPPED"
  );

  console.log(
    `  SCHOOL (< ${MIN_SCHOOL_SAMPLE}):               ${lowSampleSchoolRows}`
  );

  console.log(
    `  CONFERENCE (< ${MIN_CONFERENCE_SAMPLE}):           ${lowSampleConferenceRows}`
  );

  console.log(
    `  DIVISION (< ${MIN_DIVISION_SAMPLE}):             ${lowSampleDivisionRows}`
  );

  console.log("");

  /*
   * ----------------------------------------------------------
   * EXISTING SCHOOL METRICS
   * ----------------------------------------------------------
   */

  const programIds =
    snapshots.map(
      (
        snapshot
      ) =>
        snapshot.programId
    );

  const existingSchoolRows =
    programIds.length
      ? await prisma.collegeBaseballMetricAverage.findMany({
          where: {
            programId: {
              in:
                programIds,
            },

            metricKey: {
              in: [
                "heightIn",
                "weightLb",
              ],
            },
          },
        })
      : [];

  const existingSchoolByKey =
    new Map<
      string,
      ExistingSchoolMetric
    >();

  for (
    const row
    of existingSchoolRows as ExistingSchoolMetric[]
  ) {
    existingSchoolByKey.set(
      [
        row.programId,
        row.position,
        row.metricKey,
      ].join("|"),
      row
    );
  }

  let schoolCreate =
    0;

  let schoolUpdate =
    0;

  let schoolUnchanged =
    0;

  for (
    const row
    of schoolRows
  ) {
    const key =
      [
        row.programId,
        row.position,
        row.metricKey,
      ].join("|");

    const existing =
      existingSchoolByKey.get(
        key
      );

    if (!existing) {
      schoolCreate +=
        1;
    } else if (
      schoolRowChanged(
        existing,
        row
      )
    ) {
      schoolUpdate +=
        1;
    } else {
      schoolUnchanged +=
        1;
    }
  }

  /*
   * ----------------------------------------------------------
   * EXISTING CONFERENCE / DIVISION BENCHMARKS
   * ----------------------------------------------------------
   */

  const conferenceKeys =
    Array.from(
      new Set(
        conferenceRows.map(
          (
            row
          ) =>
            row.sourceKey
        )
      )
    );

  const existingBenchmarkRows =
    await prisma.baseballMetricBenchmark.findMany({
      where: {
        metricKey: {
          in: [
            "heightIn",
            "weightLb",
          ],
        },

        OR: [
          {
            scope:
              "DIVISION",

            sourceKey:
              DIVISION,
          },

          ...(conferenceKeys.length
            ? [
                {
                  scope:
                    "CONFERENCE" as const,

                  sourceKey: {
                    in:
                      conferenceKeys,
                  },
                },
              ]
            : []),
        ],
      },
    });

  const existingBenchmarkByKey =
    new Map<
      string,
      ExistingAggregateMetric
    >();

  for (
    const row
    of existingBenchmarkRows as ExistingAggregateMetric[]
  ) {
    existingBenchmarkByKey.set(
      [
        row.scope,
        row.sourceKey,
        row.position,
        row.metricKey,
      ].join("|"),
      row
    );
  }

  let aggregateCreate =
    0;

  let aggregateUpdate =
    0;

  let aggregateUnchanged =
    0;

  const aggregateRows =
    [
      ...conferenceRows,
      ...divisionRows,
    ];

  for (
    const row
    of aggregateRows
  ) {
    const scope =
      row.level ===
      "CONFERENCE"
        ? "CONFERENCE"
        : "DIVISION";

    const key =
      [
        scope,
        row.sourceKey,
        row.position,
        row.metricKey,
      ].join("|");

    const existing =
      existingBenchmarkByKey.get(
        key
      );

    if (!existing) {
      aggregateCreate +=
        1;
    } else if (
      benchmarkRowChanged(
        existing,
        row
      )
    ) {
      aggregateUpdate +=
        1;
    } else {
      aggregateUnchanged +=
        1;
    }
  }

  /*
   * ----------------------------------------------------------
   * OUTPUT QA CSV
   * ----------------------------------------------------------
   */

  const generatedDir =
    path.join(
      process.cwd(),
      "data",
      "enrichment",
      "generated"
    );

  const stamp =
    dateTimestamp();

  const csvPath =
    path.join(
      generatedDir,
      `d1-roster-metric-benchmarks.${stamp}.csv`
    );

  const csvRows:
    Array<
      Array<unknown>
    > = [
      [
        "level",
        "sourceKey",
        "programId",
        "collegeName",
        "conference",
        "division",
        "season",
        "position",
        "metricKey",
        "metricLabel",
        "averageValue",
        "minValue",
        "maxValue",
        "unit",
        "sampleSize",
        "sourceUrl",
        "verifiedAt",
        "sourceNote",
      ],
    ];

  for (
    const row
    of [
      ...schoolRows,
      ...conferenceRows,
      ...divisionRows,
    ]
  ) {
    csvRows.push([
      row.level,
      row.sourceKey,
      row.programId,
      row.collegeName,
      row.conference,
      row.division,
      row.season,
      row.position,
      row.metricKey,
      row.metricLabel,
      row.averageValue,
      row.minValue,
      row.maxValue,
      row.unit,
      row.sampleSize,
      row.sourceUrl,
      row.verifiedAt
        ? row.verifiedAt.toISOString()
        : "",
      row.sourceNote,
    ]);
  }

  writeCsv(
    csvPath,
    csvRows
  );

  /*
   * ----------------------------------------------------------
   * SUMMARY
   * ----------------------------------------------------------
   */

  console.log(
    "================================================="
  );

  console.log(
    "D1 ROSTER METRIC BENCHMARK DRY-RUN SUMMARY"
  );

  console.log(
    "================================================="
  );

  console.log(
    `Programs evaluated:               ${snapshots.length}`
  );

  console.log(
    `Roster player rows:               ${rosterPlayers.length}`
  );

  console.log("");

  console.log(
    "SCHOOL METRICS"
  );

  console.log(
    `  generated:                     ${schoolRows.length}`
  );

  console.log(
    `  would create:                  ${schoolCreate}`
  );

  console.log(
    `  would update:                  ${schoolUpdate}`
  );

  console.log(
    `  unchanged:                     ${schoolUnchanged}`
  );

  console.log("");

  console.log(
    "CONFERENCE + DIVISION BENCHMARKS"
  );

  console.log(
    `  generated:                     ${aggregateRows.length}`
  );

  console.log(
    `  would create:                  ${aggregateCreate}`
  );

  console.log(
    `  would update:                  ${aggregateUpdate}`
  );

  console.log(
    `  unchanged:                     ${aggregateUnchanged}`
  );

  console.log("");

  console.log(
    "SAFETY"
  );

  console.log(
    "  performance metric rows:       UNCHANGED"
  );

  console.log(
    "  height/weight only:            YES"
  );

  console.log(
    `  database writes:               ${
      APPLY
        ? "ENABLED"
        : "0"
    }`
  );

  console.log("");

  console.log(
    `QA CSV: ${csvPath}`
  );

  /*
   * ----------------------------------------------------------
   * DRY RUN EXIT
   * ----------------------------------------------------------
   */

  if (!APPLY) {
    console.log("");

    console.log(
      "DRY RUN COMPLETE — NO DATABASE WRITES"
    );

    return;
  }

  /*
   * ----------------------------------------------------------
   * APPLY SCHOOL METRICS
   * ----------------------------------------------------------
   */

  console.log("");

  console.log(
    "APPLYING SCHOOL HEIGHT / WEIGHT METRICS..."
  );

  let appliedSchoolRows =
    0;

  for (
    let index = 0;
    index <
    schoolRows.length;
    index += 1
  ) {
    const row =
      schoolRows[
        index
      ];

    if (
      !row.programId
    ) {
      continue;
    }

    const key =
      [
        row.programId,
        row.position,
        row.metricKey,
      ].join("|");

    const existing =
      existingSchoolByKey.get(
        key
      );

    if (existing) {
await prisma.collegeBaseballMetricAverage.update({
        where: {
          id:
            existing.id,
        },

        data: {
          metricLabel:
            row.metricLabel,

          averageValue:
            row.averageValue,

          minValue:
            row.minValue,

          maxValue:
            row.maxValue,

          unit:
            row.unit,

          sampleSize:
            row.sampleSize,

          sourceUrl:
            row.sourceUrl,

          lastVerifiedAt:
            row.verifiedAt,
        },
      });
    } else {
await prisma.collegeBaseballMetricAverage.create({
        data: {
          programId:
            row.programId,

          position:
            row.position,

          metricKey:
            row.metricKey,

          metricLabel:
            row.metricLabel,

          averageValue:
            row.averageValue,

          minValue:
            row.minValue,

          maxValue:
            row.maxValue,

          unit:
            row.unit,

          sampleSize:
            row.sampleSize,

          sourceUrl:
            row.sourceUrl,

          lastVerifiedAt:
            row.verifiedAt,
        },
      });
    }

    appliedSchoolRows +=
      1;

    if (
      appliedSchoolRows <=
        10 ||
      appliedSchoolRows %
        100 ===
        0 ||
      appliedSchoolRows ===
        schoolRows.length
    ) {
      console.log(
        `  [${appliedSchoolRows}/${schoolRows.length}] ${row.collegeName} — ${row.position} — ${row.metricKey} — n=${row.sampleSize}`
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * APPLY CONFERENCE / DIVISION BENCHMARKS
   * ----------------------------------------------------------
   */

  console.log("");

  console.log(
    "APPLYING CONFERENCE / DIVISION HEIGHT / WEIGHT BENCHMARKS..."
  );

  let appliedAggregateRows =
    0;

  for (
    const row
    of aggregateRows
  ) {
    const scope =
      row.level ===
      "CONFERENCE"
        ? "CONFERENCE"
        : "DIVISION";

    const key =
      [
        scope,
        row.sourceKey,
        row.position,
        row.metricKey,
      ].join("|");

    const existing =
      existingBenchmarkByKey.get(
        key
      );

    if (existing) {
      await prisma.baseballMetricBenchmark.update({
        where: {
          id:
            existing.id,
        },

        data: {
          metricLabel:
            row.metricLabel,

          averageValue:
            row.averageValue,

          minValue:
            row.minValue,

          maxValue:
            row.maxValue,

          unit:
            row.unit,

          sampleSize:
            row.sampleSize,

          sourceUrl:
            row.sourceUrl,

          sourceNote:
            row.sourceNote,

          verifiedAt:
            row.verifiedAt,
        },
      });
    } else {
      await prisma.baseballMetricBenchmark.create({
        data: {
          scope:
            scope as any,

          sourceKey:
            row.sourceKey,

          position:
            row.position,

          metricKey:
            row.metricKey,

          metricLabel:
            row.metricLabel,

          averageValue:
            row.averageValue,

          minValue:
            row.minValue,

          maxValue:
            row.maxValue,

          unit:
            row.unit,

          sampleSize:
            row.sampleSize,

          sourceUrl:
            row.sourceUrl,

          sourceNote:
            row.sourceNote,

          verifiedAt:
            row.verifiedAt,
        },
      });
    }

    appliedAggregateRows +=
      1;

    if (
      appliedAggregateRows <=
        10 ||
      appliedAggregateRows %
        100 ===
        0 ||
      appliedAggregateRows ===
        aggregateRows.length
    ) {
      console.log(
        `  [${appliedAggregateRows}/${aggregateRows.length}] ${scope} ${row.sourceKey} — ${row.position} — ${row.metricKey} — n=${row.sampleSize}`
      );
    }
  }

  console.log("");

  console.log(
    "================================================="
  );

  console.log(
    "D1 ROSTER METRIC BENCHMARK APPLY COMPLETE"
  );

  console.log(
    "================================================="
  );

  console.log(
    `School metric rows applied:       ${appliedSchoolRows}`
  );

  console.log(
    `Aggregate benchmark rows applied: ${appliedAggregateRows}`
  );

  console.log("");

  console.log(
    "Only observed heightIn / weightLb metrics were changed."
  );
}

main()
  .catch(
    (
      error
    ) => {
      console.error("");

      console.error(
        "D1 roster metric benchmark generation failed:"
      );

      console.error(
        error
      );

      process.exitCode =
        1;
    }
  )
  .finally(
    async () => {
      await prisma.$disconnect();
    }
  );