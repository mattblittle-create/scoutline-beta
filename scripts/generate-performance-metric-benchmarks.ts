// scripts/generate-performance-metric-benchmarks.ts

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/*
 * ============================================================
 * PERFORMANCE METRIC BENCHMARK GENERATOR
 * ============================================================
 *
 * Purpose:
 *
 * Refine division-level ScoutLine performance benchmarks using
 * published college-baseball recruiting guidelines.
 *
 * This script intentionally DOES NOT alter:
 *
 *   heightIn
 *   weightLb
 *
 * Those are now roster-derived observed metrics.
 *
 * This script also intentionally DOES NOT alter unsupported
 * estimated performance metrics such as:
 *
 *   exitVelo
 *   homeToFirst
 *   avgChVelo
 *   avgBbVelo
 *   catcherThrowVelo
 *
 * until we have sufficiently defensible benchmark guidance for
 * them.
 *
 * Default mode:
 *
 *   DRY RUN
 *
 * Apply:
 *
 *   npx tsx scripts/generate-performance-metric-benchmarks.ts --apply
 */

const APPLY =
  process.argv.includes("--apply");

const SOURCE_URL =
  "https://www.ncsasports.org/baseball/recruiting-guidelines";

/*
 * User-facing source notes stay generic.
 *
 * Third-party sourcing remains available internally through
 * sourceUrl for audit / verification purposes.
 */
function formatDivisionLabel(
  value: string
) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/_/g, " ");
}

function buildSourceNote({
  division,
  position,
}: {
  division: string;
  position: string;
}) {
  return `General metric(s) based on ${formatDivisionLabel(
    division
  )} ${position} averages.`;
}

type MetricKey =
  | "avgFbVelo"
  | "popTime"
  | "sixtyYdDash"
  | "infieldThrowVelo"
  | "outfieldThrowVelo";

type GeneratedRow = {
  scope: "DIVISION";

  sourceKey: string;

  position: string;

  metricKey: MetricKey;

  metricLabel: string;

  averageValue: number;

  minValue: number | null;

  maxValue: number | null;

  unit: "mph" | "sec";

  sourceUrl: string;

  sourceNote: string;

  verifiedAt: Date;
};

type ExistingRow = {
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

  sourceUrl: string | null;

  sourceNote: string | null;

  verifiedAt: Date | null;
};

const VERIFIED_AT =
  new Date();

/*
 * ------------------------------------------------------------
 * BENCHMARK DEFINITIONS
 * ------------------------------------------------------------
 *
 * Important:
 *
 * These values are recruiting guideline benchmarks, not claims
 * that they are statistically observed collegiate averages.
 *
 * averageValue:
 *
 *   Used by ScoutLine as the central comparison target.
 *
 * minValue / maxValue:
 *
 *   Represent a published guideline range where the source
 *   provides one.
 *
 * For "X or below" metrics, averageValue is set to the published
 * threshold because lower is better.
 *
 * For "X+" metrics, averageValue is set to the published
 * threshold because higher is better.
 */

/*
 * Pitcher velocity.
 *
 * Published guidance:
 *
 * NCAA D1:
 *   84 MPH consistently; up to 95+
 *
 * NCAA D2:
 *   82–90+
 *
 * NCAA D3 / NAIA:
 *   77–82
 *
 * Junior College:
 *   80 MPH consistently
 *
 * RHP / LHP use the same general division benchmark because the
 * published guideline does not provide separate numeric
 * thresholds by handedness.
 */
const PITCHER_ROWS = [
  {
    divisions: [
      "NCAA_D1",
    ],
    averageValue: 84,
    minValue: 84,
    maxValue: 95,
  },

  {
    divisions: [
      "NCAA_D2",
    ],
    averageValue: 86,
    minValue: 82,
    maxValue: 90,
  },

  {
    divisions: [
      "NCAA_D3",
      "NAIA",
    ],
    averageValue: 79.5,
    minValue: 77,
    maxValue: 82,
  },

  /*
   * NCSA publishes one general Junior College guideline rather
   * than separate NJCAA division values.
   *
   * ScoutLine therefore uses that same JUCO baseline as the
   * initial fallback for NJCAA D1 / D2 / D3.
   */
  {
    divisions: [
      "NJCAA_D1",
      "NJCAA_D2",
      "NJCAA_D3",
    ],
    averageValue: 80,
    minValue: 80,
    maxValue: null,
  },
] as const;

/*
 * Catcher pop time.
 */
const CATCHER_ROWS = [
  {
    divisions: [
      "NCAA_D1",
    ],
    averageValue: 1.95,
    minValue: null,
    maxValue: 1.95,
  },

  {
    divisions: [
      "NCAA_D2",
    ],
    averageValue: 2.0,
    minValue: null,
    maxValue: 2.0,
  },

  {
    divisions: [
      "NCAA_D3",
      "NAIA",
    ],
    averageValue: 2.05,
    minValue: 2.0,
    maxValue: 2.1,
  },

  {
    divisions: [
      "NJCAA_D1",
      "NJCAA_D2",
      "NJCAA_D3",
    ],
    averageValue: 2.1,
    minValue: null,
    maxValue: 2.1,
  },
] as const;

/*
 * Middle infield.
 *
 * NCAA D1:
 *   60: 6.5–6.8
 *   IF velocity: 85–95
 *
 * NCAA D2:
 *   60: 6.9 or below
 *   IF velocity: low 80s and above
 *
 * NCAA D3 / NAIA:
 *   60: 7.0 or below
 *   IF velocity: 78+
 *
 * Junior College:
 *   60: 7.1 or below
 *   IF velocity: upper 70s
 */
const MIDDLE_INFIELD_ROWS = [
  {
    divisions: [
      "NCAA_D1",
    ],

    sixty: {
      averageValue: 6.65,
      minValue: 6.5,
      maxValue: 6.8,
    },

    arm: {
      averageValue: 90,
      minValue: 85,
      maxValue: 95,
    },
  },

  {
    divisions: [
      "NCAA_D2",
    ],

    sixty: {
      averageValue: 6.9,
      minValue: null,
      maxValue: 6.9,
    },

    /*
     * "Low 80s and above" is represented conservatively with
     * 82 MPH as the benchmark threshold.
     */
    arm: {
      averageValue: 82,
      minValue: 82,
      maxValue: null,
    },
  },

  {
    divisions: [
      "NCAA_D3",
      "NAIA",
    ],

    sixty: {
      averageValue: 7.0,
      minValue: null,
      maxValue: 7.0,
    },

    arm: {
      averageValue: 78,
      minValue: 78,
      maxValue: null,
    },
  },

  {
    divisions: [
      "NJCAA_D1",
      "NJCAA_D2",
      "NJCAA_D3",
    ],

    sixty: {
      averageValue: 7.1,
      minValue: null,
      maxValue: 7.1,
    },

    /*
     * Published guidance says upper 70s.
     *
     * Use 78 MPH as a conservative numerical threshold.
     */
    arm: {
      averageValue: 78,
      minValue: 78,
      maxValue: null,
    },
  },
] as const;

/*
 * Third base.
 *
 * NCAA D1:
 *   IF velocity 85–95
 *
 * NCAA D2:
 *   at least 80 MPH
 *
 * NCSA does not provide a numerical 3B arm benchmark for
 * D3/NAIA or JUCO on this page, so we do not manufacture one.
 */
const THIRD_BASE_ROWS = [
  {
    divisions: [
      "NCAA_D1",
    ],

    averageValue: 90,
    minValue: 85,
    maxValue: 95,
  },

  {
    divisions: [
      "NCAA_D2",
    ],

    averageValue: 80,
    minValue: 80,
    maxValue: null,
  },
] as const;

/*
 * Center field.
 *
 * NCAA D1:
 *   60 below 6.7
 *   OF velocity 87–95+
 *
 * NCAA D2:
 *   60 below 6.9
 *
 * NCAA D3 / NAIA:
 *   60 6.9 or below
 *   OF velocity 80+
 *
 * JUCO:
 *   60 7.0 or below
 *   OF velocity 78+
 */
const CENTER_FIELD_ROWS = [
  {
    divisions: [
      "NCAA_D1",
    ],

    sixty: {
      averageValue: 6.7,
      minValue: null,
      maxValue: 6.7,
    },

    arm: {
      averageValue: 91,
      minValue: 87,
      maxValue: 95,
    },
  },

  {
    divisions: [
      "NCAA_D2",
    ],

    sixty: {
      averageValue: 6.9,
      minValue: null,
      maxValue: 6.9,
    },

    arm:
      null,
  },

  {
    divisions: [
      "NCAA_D3",
      "NAIA",
    ],

    sixty: {
      averageValue: 6.9,
      minValue: null,
      maxValue: 6.9,
    },

    arm: {
      averageValue: 80,
      minValue: 80,
      maxValue: null,
    },
  },

  {
    divisions: [
      "NJCAA_D1",
      "NJCAA_D2",
      "NJCAA_D3",
    ],

    sixty: {
      averageValue: 7.0,
      minValue: null,
      maxValue: 7.0,
    },

    arm: {
      averageValue: 78,
      minValue: 78,
      maxValue: null,
    },
  },
] as const;

/*
 * Corner outfield.
 *
 * LF / RF use the same published corner-outfield profile.
 *
 * NCAA D1:
 *   60 below 6.8
 *   OF velocity 87+
 *
 * NCAA D2:
 *   60 below 7.0
 *   OF velocity low 80s minimum
 *
 * NCAA D3 / NAIA:
 *   60 6.9 or below
 *   OF velocity 80+
 *
 * JUCO:
 *   60 7.0 or below
 *   OF velocity 78+
 */
const CORNER_OUTFIELD_ROWS = [
  {
    divisions: [
      "NCAA_D1",
    ],

    sixty: {
      averageValue: 6.8,
      minValue: null,
      maxValue: 6.8,
    },

    arm: {
      averageValue: 87,
      minValue: 87,
      maxValue: null,
    },
  },

  {
    divisions: [
      "NCAA_D2",
    ],

    sixty: {
      averageValue: 7.0,
      minValue: null,
      maxValue: 7.0,
    },

    arm: {
      averageValue: 82,
      minValue: 82,
      maxValue: null,
    },
  },

  {
    divisions: [
      "NCAA_D3",
      "NAIA",
    ],

    sixty: {
      averageValue: 6.9,
      minValue: null,
      maxValue: 6.9,
    },

    arm: {
      averageValue: 80,
      minValue: 80,
      maxValue: null,
    },
  },

  {
    divisions: [
      "NJCAA_D1",
      "NJCAA_D2",
      "NJCAA_D3",
    ],

    sixty: {
      averageValue: 7.0,
      minValue: null,
      maxValue: 7.0,
    },

    arm: {
      averageValue: 78,
      minValue: 78,
      maxValue: null,
    },
  },
] as const;

/*
 * ------------------------------------------------------------
 * GENERAL HELPERS
 * ------------------------------------------------------------
 */

function numericEqual(
  left: unknown,
  right: unknown
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

  const a =
    Number(left);

  const b =
    Number(right);

  if (
    !Number.isFinite(a) ||
    !Number.isFinite(b)
  ) {
    return false;
  }

  return Math.abs(
    a - b
  ) < 0.0001;
}

function cleanText(
  value: unknown
) {
  return String(
    value ?? ""
  )
    .replace(/\s+/g, " ")
    .trim();
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

function rowKey(
  row: {
    scope: string;
    sourceKey: string;
    position: string;
    metricKey: string;
  }
) {
  return [
    row.scope,
    row.sourceKey,
    row.position,
    row.metricKey,
  ].join("|");
}

function generatedRow({
  division,
  position,
  metricKey,
  metricLabel,
  averageValue,
  minValue,
  maxValue,
  unit,
}: {
  division: string;

  position: string;

  metricKey: MetricKey;

  metricLabel: string;

  averageValue: number;

  minValue: number | null;

  maxValue: number | null;

  unit: "mph" | "sec";
}): GeneratedRow {
  return {
    scope:
      "DIVISION",

    sourceKey:
      division,

    position,

    metricKey,

    metricLabel,

    averageValue,

    minValue,

    maxValue,

    unit,

    sourceUrl:
      SOURCE_URL,

    sourceNote:
      buildSourceNote({
        division,
        position,
      }),

    verifiedAt:
      VERIFIED_AT,
  };
}

/*
 * ------------------------------------------------------------
 * BUILD GENERATED ROWS
 * ------------------------------------------------------------
 */

function buildRows(): GeneratedRow[] {
  const rows:
    GeneratedRow[] =
    [];

  /*
   * Pitchers.
   */
  for (
    const guideline
    of PITCHER_ROWS
  ) {
    for (
      const division
      of guideline.divisions
    ) {
      for (
        const position
        of [
          "P",
          "RHP",
          "LHP",
        ]
      ) {
        rows.push(
          generatedRow({
            division,
            position,

            metricKey:
              "avgFbVelo",

            metricLabel:
              "Average Fastball Velocity",

            averageValue:
              guideline.averageValue,

            minValue:
              guideline.minValue,

            maxValue:
              guideline.maxValue,

            unit:
              "mph",
          })
        );
      }
    }
  }

  /*
   * Catchers.
   */
  for (
    const guideline
    of CATCHER_ROWS
  ) {
    for (
      const division
      of guideline.divisions
    ) {
      rows.push(
        generatedRow({
          division,

          position:
            "C",

          metricKey:
            "popTime",

          metricLabel:
            "Pop Time",

          averageValue:
            guideline.averageValue,

          minValue:
            guideline.minValue,

          maxValue:
            guideline.maxValue,

          unit:
            "sec",
        })
      );
    }
  }

  /*
   * Middle infield.
   *
   * Use the published middle-infield profile for:
   *
   *   MIF
   *   SS
   *   2B
   *
   * This is a positional-group fallback rather than a claim
   * that NCSA publishes separate SS and 2B values.
   */
  for (
    const guideline
    of MIDDLE_INFIELD_ROWS
  ) {
    for (
      const division
      of guideline.divisions
    ) {
      for (
        const position
        of [
          "MIF",
          "SS",
          "2B",
        ]
      ) {
        rows.push(
          generatedRow({
            division,
            position,

            metricKey:
              "sixtyYdDash",

            metricLabel:
              "60 Yard Dash",

            averageValue:
              guideline.sixty.averageValue,

            minValue:
              guideline.sixty.minValue,

            maxValue:
              guideline.sixty.maxValue,

            unit:
              "sec",
          })
        );

        rows.push(
          generatedRow({
            division,
            position,

            metricKey:
              "infieldThrowVelo",

            metricLabel:
              "Infield Throw Velocity",

            averageValue:
              guideline.arm.averageValue,

            minValue:
              guideline.arm.minValue,

            maxValue:
              guideline.arm.maxValue,

            unit:
              "mph",
          })
        );
      }
    }
  }

  /*
   * Third base / corner infield.
   *
   * CIF uses the available 3B arm benchmark as its general
   * corner-infield fallback.
   */
  for (
    const guideline
    of THIRD_BASE_ROWS
  ) {
    for (
      const division
      of guideline.divisions
    ) {
      for (
        const position
        of [
          "3B",
          "CIF",
        ]
      ) {
        rows.push(
          generatedRow({
            division,
            position,

            metricKey:
              "infieldThrowVelo",

            metricLabel:
              "Infield Throw Velocity",

            averageValue:
              guideline.averageValue,

            minValue:
              guideline.minValue,

            maxValue:
              guideline.maxValue,

            unit:
              "mph",
          })
        );
      }
    }
  }

  /*
   * Center field.
   */
  for (
    const guideline
    of CENTER_FIELD_ROWS
  ) {
    for (
      const division
      of guideline.divisions
    ) {
      rows.push(
        generatedRow({
          division,

          position:
            "CF",

          metricKey:
            "sixtyYdDash",

          metricLabel:
            "60 Yard Dash",

          averageValue:
            guideline.sixty.averageValue,

          minValue:
            guideline.sixty.minValue,

          maxValue:
            guideline.sixty.maxValue,

          unit:
            "sec",
        })
      );

      if (
        guideline.arm
      ) {
        rows.push(
          generatedRow({
            division,

            position:
              "CF",

            metricKey:
              "outfieldThrowVelo",

            metricLabel:
              "Outfield Throw Velocity",

            averageValue:
              guideline.arm.averageValue,

            minValue:
              guideline.arm.minValue,

            maxValue:
              guideline.arm.maxValue,

            unit:
              "mph",
          })
        );
      }
    }
  }

  /*
   * Corner outfield.
   */
  for (
    const guideline
    of CORNER_OUTFIELD_ROWS
  ) {
    for (
      const division
      of guideline.divisions
    ) {
      for (
        const position
        of [
          "LF",
          "RF",
        ]
      ) {
        rows.push(
          generatedRow({
            division,
            position,

            metricKey:
              "sixtyYdDash",

            metricLabel:
              "60 Yard Dash",

            averageValue:
              guideline.sixty.averageValue,

            minValue:
              guideline.sixty.minValue,

            maxValue:
              guideline.sixty.maxValue,

            unit:
              "sec",
          })
        );

        rows.push(
          generatedRow({
            division,
            position,

            metricKey:
              "outfieldThrowVelo",

            metricLabel:
              "Outfield Throw Velocity",

            averageValue:
              guideline.arm.averageValue,

            minValue:
              guideline.arm.minValue,

            maxValue:
              guideline.arm.maxValue,

            unit:
              "mph",
          })
        );
      }
    }
  }

  /*
   * Generic OF fallback.
   *
   * Use corner-outfield guidelines rather than CF because a
   * generic OF roster designation should not inherit the more
   * demanding center-field speed profile.
   */
  for (
    const guideline
    of CORNER_OUTFIELD_ROWS
  ) {
    for (
      const division
      of guideline.divisions
    ) {
      rows.push(
        generatedRow({
          division,

          position:
            "OF",

          metricKey:
            "sixtyYdDash",

          metricLabel:
            "60 Yard Dash",

          averageValue:
            guideline.sixty.averageValue,

          minValue:
            guideline.sixty.minValue,

          maxValue:
            guideline.sixty.maxValue,

          unit:
            "sec",
        })
      );

      rows.push(
        generatedRow({
          division,

          position:
            "OF",

          metricKey:
            "outfieldThrowVelo",

          metricLabel:
            "Outfield Throw Velocity",

          averageValue:
            guideline.arm.averageValue,

          minValue:
            guideline.arm.minValue,

          maxValue:
            guideline.arm.maxValue,

          unit:
            "mph",
        })
      );
    }
  }

  return rows.sort(
    (
      a,
      b
    ) =>
      a.sourceKey.localeCompare(
        b.sourceKey
      ) ||
      a.position.localeCompare(
        b.position
      ) ||
      a.metricKey.localeCompare(
        b.metricKey
      )
  );
}

/*
 * ------------------------------------------------------------
 * DATABASE COMPARISON
 * ------------------------------------------------------------
 */

function existingRowChanged(
  existing: ExistingRow,
  row: GeneratedRow
) {
  /*
   * verifiedAt is intentionally NOT part of idempotency.
   *
   * Otherwise every run would appear changed simply because
   * VERIFIED_AT is the current script-run timestamp.
   *
   * The timestamp is updated only when a row is actually
   * created or changed.
   */
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

    (
      existing.sourceUrl ||
      null
    ) ===
      (
        row.sourceUrl ||
        null
      ) &&

    existing.sourceNote ===
      row.sourceNote
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
    "PERFORMANCE METRIC BENCHMARK GENERATOR"
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

  const rows =
    buildRows();

  const generatedKeys =
    new Set(
      rows.map(
        rowKey
      )
    );

  const existingRows =
    await prisma.baseballMetricBenchmark.findMany({
      where: {
        scope:
          "DIVISION",

        metricKey: {
          in: [
            "avgFbVelo",
            "popTime",
            "sixtyYdDash",
            "infieldThrowVelo",
            "outfieldThrowVelo",
          ],
        },
      },
    });

  const existingByKey =
    new Map<
      string,
      ExistingRow
    >();

  for (
    const row
    of existingRows as ExistingRow[]
  ) {
    existingByKey.set(
      rowKey(
        row
      ),
      row
    );
  }

  let createCount =
    0;

  let updateCount =
    0;

  let unchangedCount =
    0;

  for (
    const row
    of rows
  ) {
    const existing =
      existingByKey.get(
        rowKey(
          row
        )
      );

    if (
      !existing
    ) {
      createCount +=
        1;
    } else if (
      existingRowChanged(
        existing,
        row
      )
    ) {
      updateCount +=
        1;
    } else {
      unchangedCount +=
        1;
    }
  }

  /*
   * Identify old performance rows outside this generator's
   * supported benchmark set.
   *
   * These are reported but intentionally not deleted or changed.
   */
  const unsupportedExisting =
    await prisma.baseballMetricBenchmark.findMany({
      where: {
        scope:
          "DIVISION",

        metricKey: {
          in: [
            "exitVelo",
            "homeToFirst",
            "avgChVelo",
            "avgBbVelo",
            "catcherThrowVelo",
          ],
        },
      },

      select: {
        sourceKey:
          true,

        position:
          true,

        metricKey:
          true,
      },
    });

  /*
   * Any existing DIVISION row inside the performance metric
   * families managed by this generator, but not present in the
   * newly generated benchmark matrix, is considered legacy.
   *
   * Examples include:
   *
   * - old estimated 1B / 3B / C 60-yard rows
   * - unsupported lower-division 3B arm estimates
   * - stale UTILITY / Utility alias rows
   * - other position/metric combinations created by the old
   *   adjustment-based seed
   *
   * These rows are safe to retire because this generator is now
   * authoritative for:
   *
   *   avgFbVelo
   *   popTime
   *   sixtyYdDash
   *   infieldThrowVelo
   *   outfieldThrowVelo
   *
   * Unsupported metric families remain completely untouched.
   */
  const retireRows =
    existingRows.filter(
      (
        row
      ) =>
        !generatedKeys.has(
          rowKey(
            row as ExistingRow
          )
        )
    );

  const retireCount =
    retireRows.length;

  console.log(
    "GENERATED PERFORMANCE ROWS"
  );

  console.log(
    `  generated:                     ${rows.length}`
  );

  console.log(
    `  would create:                  ${createCount}`
  );

  console.log(
    `  would update:                  ${updateCount}`
  );

  console.log(
    `  unchanged:                     ${unchangedCount}`
  );

  console.log("");

  console.log(
    "LEGACY / PRESERVED ROWS"
  );

  console.log(
    `  unsupported metrics preserved: ${unsupportedExisting.length}`
  );

  console.log(
    `  would retire:                  ${retireCount}`
  );

  console.log("");

  console.log(
    "SAFETY"
  );

  console.log(
    "  SCHOOL benchmarks:             UNCHANGED"
  );

  console.log(
    "  CONFERENCE benchmarks:         UNCHANGED"
  );

  console.log(
    "  heightIn / weightLb:           UNCHANGED"
  );

  console.log(
    "  unsupported performance rows:  UNCHANGED"
  );

  console.log(
    `  legacy managed rows:           ${
      retireCount > 0
        ? `${retireCount} TO RETIRE`
        : "NONE"
    }`
  );

  console.log(
    `  database writes:               ${
      APPLY
        ? "ENABLED"
        : "0"
    }`
  );

  /*
   * ----------------------------------------------------------
   * QA CSV
   * ----------------------------------------------------------
   */

  const generatedDir =
    path.join(
      process.cwd(),
      "data",
      "enrichment",
      "generated"
    );

  const csvPath =
    path.join(
      generatedDir,
      `performance-metric-benchmarks.${dateTimestamp()}.csv`
    );

  const csvRows:
    Array<
      Array<unknown>
    > = [
      [
        "scope",
        "sourceKey",
        "position",
        "metricKey",
        "metricLabel",
        "averageValue",
        "minValue",
        "maxValue",
        "unit",
        "sourceUrl",
        "sourceNote",
        "action",
      ],
    ];

  for (
    const row
    of rows
  ) {
    const existing =
      existingByKey.get(
        rowKey(
          row
        )
      );

    const action =
      !existing
        ? "CREATE"
        : existingRowChanged(
            existing,
            row
          )
        ? "UPDATE"
        : "UNCHANGED";

    csvRows.push([
      row.scope,
      row.sourceKey,
      row.position,
      row.metricKey,
      row.metricLabel,
      row.averageValue,
      row.minValue ?? "",
      row.maxValue ?? "",
      row.unit,
      row.sourceUrl,
      row.sourceNote,
      action,
    ]);
  }

  /*
   * Add legacy rows that would be retired so the QA CSV contains
   * the complete proposed database change set.
   */
  for (
    const row
    of retireRows as ExistingRow[]
  ) {
    csvRows.push([
      row.scope,
      row.sourceKey,
      row.position,
      row.metricKey,
      row.metricLabel || "",
      row.averageValue ?? "",
      row.minValue ?? "",
      row.maxValue ?? "",
      row.unit || "",
      row.sourceUrl || "",
      row.sourceNote || "",
      "RETIRE",
    ]);
  }

  writeCsv(
    csvPath,
    csvRows
  );

  console.log("");

  console.log(
    `QA CSV: ${csvPath}`
  );

  if (
    !APPLY
  ) {
    console.log("");

    console.log(
      "DRY RUN COMPLETE — NO DATABASE WRITES"
    );

    return;
  }

  /*
   * ----------------------------------------------------------
   * APPLY
   * ----------------------------------------------------------
   */

  console.log("");

  console.log(
    "APPLYING PERFORMANCE BENCHMARKS..."
  );

  let applied =
    0;

  for (
    const row
    of rows
  ) {
    const key =
      rowKey(
        row
      );

    const existing =
      existingByKey.get(
        key
      );

    if (
      existing &&
      !existingRowChanged(
        existing,
        row
      )
    ) {
      continue;
    }

    if (
      existing
    ) {
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
            row.scope as any,

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

          sourceUrl:
            row.sourceUrl,

          sourceNote:
            row.sourceNote,

          verifiedAt:
            row.verifiedAt,
        },
      });
    }

    applied +=
      1;

    console.log(
      `  [${applied}] ${row.sourceKey} — ${row.position} — ${row.metricKey}`
    );
  }

  /*
   * ----------------------------------------------------------
   * RETIRE LEGACY MANAGED PERFORMANCE ROWS
   * ----------------------------------------------------------
   *
   * Only DIVISION rows from the five performance metric families
   * managed by this generator can appear here.
   *
   * Height / weight, school benchmarks, conference benchmarks,
   * and unsupported performance metric families are excluded.
   */

  console.log("");

  console.log(
    "RETIRING LEGACY PERFORMANCE BENCHMARKS..."
  );

  let retired =
    0;

  for (
    const row
    of retireRows as ExistingRow[]
  ) {
    await prisma.baseballMetricBenchmark.delete({
      where: {
        id:
          row.id,
      },
    });

    retired +=
      1;

    if (
      retired <= 10 ||
      retired % 25 === 0 ||
      retired === retireRows.length
    ) {
      console.log(
        `  [${retired}/${retireRows.length}] ${row.sourceKey} — ${row.position} — ${row.metricKey}`
      );
    }
  }

  console.log("");

  console.log(
    "================================================="
  );

  console.log(
    "PERFORMANCE METRIC BENCHMARK APPLY COMPLETE"
  );

  console.log(
    "================================================="
  );

  console.log(
    `Rows created / updated:          ${applied}`
  );

  console.log(
    `Legacy rows retired:             ${retired}`
  );

  console.log("");

  console.log(
    "Observed roster height/weight metrics were not changed."
  );

  console.log(
    "Unsupported performance metric families were not changed."
  );
}

main()
  .catch(
    (
      error
    ) => {
      console.error("");

      console.error(
        "Performance benchmark generation failed:"
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