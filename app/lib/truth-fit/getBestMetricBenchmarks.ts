// app/lib/truth-fit/getBestMetricBenchmarks.ts

import { prisma } from "@/lib/prisma";

export type BenchmarkSourceLevel =
  | "SCHOOL"
  | "CONFERENCE"
  | "DIVISION"
  | "GLOBAL"
  | "ESTIMATED";

export type BestMetricBenchmark = {
  position: string;
  metricKey: string;
  metricLabel?: string | null;
  averageValue?: number | null;
  minValue?: number | null;
  maxValue?: number | null;
  unit?: string | null;

  sourceLevel?: BenchmarkSourceLevel;
  sourceLabel?: string | null;
  sourceConfidence?: "HIGH" | "MEDIUM" | "LOW";
};

export type BestMetricBenchmarkResult = {
  level: BenchmarkSourceLevel;
  label: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  benchmarks: BestMetricBenchmark[];
};

type BenchmarkRow = {
  position: string;
  metricKey: string;
  metricLabel?: string | null;
  averageValue?: unknown;
  minValue?: unknown;
  maxValue?: unknown;
  unit?: string | null;

  sourceLevel?: BenchmarkSourceLevel;
  sourceLabel?: string | null;
  sourceConfidence?: "HIGH" | "MEDIUM" | "LOW";
};

function asNumber(value: unknown): number | null {
  if (value == null) return null;

  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : null;
}

function normalizeDivision(
  value?: string | null
) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function formatDivisionLabel(
  value?: string | null
) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/_/g, " ");
}

function normalizeConference(
  value?: string | null
) {
  return String(value || "")
    .trim();
}

function normalizePosition(
  value?: string | null
) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normalizeMetricKey(
  value?: string | null
) {
  return String(value || "")
    .trim();
}

function confidenceForLevel(
  level: BenchmarkSourceLevel
): "HIGH" | "MEDIUM" | "LOW" {
  if (level === "SCHOOL") {
    return "HIGH";
  }

  if (level === "CONFERENCE") {
    return "MEDIUM";
  }

  return "LOW";
}

function mapBenchmarkRow(
  row: BenchmarkRow
): BestMetricBenchmark {
  return {
    position:
      normalizePosition(
        row.position
      ),

    metricKey:
      normalizeMetricKey(
        row.metricKey
      ),

    metricLabel:
      row.metricLabel ?? null,

    averageValue:
      asNumber(
        row.averageValue
      ),

    minValue:
      asNumber(
        row.minValue
      ),

    maxValue:
      asNumber(
        row.maxValue
      ),

unit:
  row.unit ?? null,

sourceLevel:
  row.sourceLevel,

sourceLabel:
  row.sourceLabel ?? null,

sourceConfidence:
  row.sourceConfidence,
  };
}

/*
 * ------------------------------------------------------------
 * POSITION FAMILY FALLBACK
 * ------------------------------------------------------------
 *
 * Official roster feeds often provide grouped positions rather
 * than exact defensive positions.
 *
 * Examples:
 *
 *   INF can support:
 *     1B / 2B / SS / 3B / MIF / CIF
 *
 *   CIF can support:
 *     1B / 3B
 *
 *   MIF can support:
 *     2B / SS
 *
 *   OF can support:
 *     LF / CF / RF
 *
 *   P can support:
 *     RHP / LHP
 *
 * These are fallbacks only.
 *
 * An exact-position benchmark from the same source level always
 * wins over a grouped-position fallback.
 */
function fallbackTargetPositions(
  sourcePosition?: string | null
): string[] {
  const position =
    normalizePosition(
      sourcePosition
    );

  switch (position) {
    case "INF":
      return [
        "1B",
        "2B",
        "SS",
        "3B",
        "MIF",
        "CIF",
      ];

    case "CIF":
      return [
        "1B",
        "3B",
      ];

    case "MIF":
      return [
        "2B",
        "SS",
      ];

    case "OF":
      return [
        "LF",
        "CF",
        "RF",
      ];

    case "P":
      return [
        "RHP",
        "LHP",
      ];

    default:
      return [];
  }
}

function fallbackConfidence(
  level?: BenchmarkSourceLevel
): "HIGH" | "MEDIUM" | "LOW" {
  /*
   * The underlying data may be highly trustworthy, but using
   * a grouped position introduces some positional uncertainty.
   */
  if (level === "SCHOOL") {
    return "MEDIUM";
  }

  return "LOW";
}

function benchmarkIdentity(
  row: {
    position?: string | null;
    metricKey?: string | null;
  }
) {
  return [
    normalizePosition(
      row.position
    ),

    normalizeMetricKey(
      row.metricKey
    ),
  ].join("::");
}

/*
 * Merge benchmark scopes one metric at a time.
 *
 * Rows passed earlier have higher priority.
 *
 * Priority:
 *
 * SCHOOL
 *   ↓
 * CONFERENCE
 *   ↓
 * DIVISION
 *   ↓
 * GLOBAL
 *
 * Example:
 *
 * SCHOOL:
 *   3B heightIn
 *   3B weightLb
 *
 * DIVISION:
 *   3B exitVelo
 *   3B sixtyYdDash
 *   3B infieldThrowVelo
 *
 * Result:
 *   SCHOOL height / weight
 *   DIVISION performance metrics
 *
 * A higher-priority scope therefore overrides only the
 * specific position + metric combinations it actually has.
 */
function mergeBenchmarkRows(
  ...groups: BenchmarkRow[][]
): BestMetricBenchmark[] {
  const merged =
    new Map<
      string,
      BestMetricBenchmark
    >();

  /*
   * Each group represents one source level.
   *
   * Groups arrive in priority order:
   *
   * SCHOOL
   * CONFERENCE
   * DIVISION
   * GLOBAL
   *
   * Within each source level:
   *
   * 1. exact position rows are added first
   * 2. positional-family fallbacks fill remaining gaps
   *
   * This means:
   *
   * SCHOOL exact 3B
   *   beats
   * SCHOOL INF -> 3B fallback
   *
   * But:
   *
   * SCHOOL INF -> 3B fallback
   *   beats
   * CONFERENCE / DIVISION 3B
   *
   * because school-specific observed data is still the
   * higher-priority source.
   */
  for (
    const group
    of groups
  ) {
    /*
     * --------------------------------------------------------
     * PASS 1 — EXACT POSITION ROWS
     * --------------------------------------------------------
     */
    for (
      const rawRow
      of group
    ) {
      const row =
        mapBenchmarkRow(
          rawRow
        );

      if (
        !row.position ||
        !row.metricKey
      ) {
        continue;
      }

      const key =
        benchmarkIdentity(
          row
        );

      /*
       * First row wins because higher-priority source groups
       * were processed earlier.
       */
      if (
        merged.has(
          key
        )
      ) {
        continue;
      }

      merged.set(
        key,
        row
      );
    }

    /*
     * --------------------------------------------------------
     * PASS 2 — POSITION FAMILY FALLBACKS
     * --------------------------------------------------------
     *
     * These only fill a position + metric combination that
     * does not already exist.
     */
    for (
      const rawRow
      of group
    ) {
      const sourceRow =
        mapBenchmarkRow(
          rawRow
        );

      if (
        !sourceRow.position ||
        !sourceRow.metricKey
      ) {
        continue;
      }

      const fallbackPositions =
        fallbackTargetPositions(
          sourceRow.position
        );

      for (
        const targetPosition
        of fallbackPositions
      ) {
        const fallbackRow:
          BestMetricBenchmark = {
          ...sourceRow,

          position:
            targetPosition,

          sourceLabel:
            sourceRow.sourceLabel
              ? `${sourceRow.sourceLabel} (${sourceRow.position} positional fallback)`
              : `${sourceRow.position} positional fallback`,

          sourceConfidence:
            fallbackConfidence(
              sourceRow.sourceLevel
            ),
        };

        const key =
          benchmarkIdentity(
            fallbackRow
          );

        /*
         * Never overwrite:
         *
         * - an exact row from this source level
         * - a row from a higher-priority source level
         */
        if (
          merged.has(
            key
          )
        ) {
          continue;
        }

        merged.set(
          key,
          fallbackRow
        );
      }
    }
  }

  return Array.from(
    merged.values()
  ).sort(
    (
      a,
      b
    ) => {
      const positionCompare =
        a.position.localeCompare(
          b.position
        );

      if (
        positionCompare !== 0
      ) {
        return positionCompare;
      }

      return a.metricKey.localeCompare(
        b.metricKey
      );
    }
  );
}

export async function getBestMetricBenchmarks({
  programId,
  collegeName,
  conference,
  division,
}: {
  programId?: string | null;
  collegeName?: string | null;
  conference?: string | null;
  division?: string | null;
}): Promise<BestMetricBenchmarkResult> {
  const conferenceKey =
    normalizeConference(
      conference
    );

  const divisionKey =
    normalizeDivision(
      division
    );

  /*
   * Load every available scope instead of returning as soon
   * as one scope contains rows.
   *
   * This allows fallback to happen per position + metric.
   */
  const [
    schoolRows,
    conferenceRows,
    divisionRows,
    globalRows,
  ] =
    await Promise.all([
programId
  ? prisma.collegeBaseballMetricAverage.findMany({
      where: {
        programId,
      },

      select: {
        position: true,
        metricKey: true,
        metricLabel: true,
        averageValue: true,
        minValue: true,
        maxValue: true,
        unit: true,
      },
    })
  : Promise.resolve([]),

      conferenceKey
        ? prisma.baseballMetricBenchmark.findMany({
            where: {
              scope:
                "CONFERENCE",

              sourceKey:
                conferenceKey,
            },
          })
        : Promise.resolve([]),

      divisionKey
        ? prisma.baseballMetricBenchmark.findMany({
            where: {
              scope:
                "DIVISION",

              sourceKey:
                divisionKey,
            },
          })
        : Promise.resolve([]),

      prisma.baseballMetricBenchmark.findMany({
        where: {
          scope:
            "GLOBAL",

          sourceKey:
            "GLOBAL",
        },
      }),
    ]);

const schoolBenchmarkRows: BenchmarkRow[] =
  schoolRows.map((row) => ({
    ...row,

    sourceLevel:
      "SCHOOL",

    sourceLabel:
      `${collegeName || "School"} program benchmark`,

    sourceConfidence:
      "HIGH",
  }));

const conferenceBenchmarkRows: BenchmarkRow[] =
  conferenceRows.map((row) => ({
    ...row,

    sourceLevel:
      "CONFERENCE",

    sourceLabel:
      `${conferenceKey} conference benchmark`,

    sourceConfidence:
      "MEDIUM",
  }));

const divisionBenchmarkRows: BenchmarkRow[] =
  divisionRows.map((row) => ({
    ...row,

    sourceLevel:
      "DIVISION",

    sourceLabel:
      `${formatDivisionLabel(
        divisionKey
      )} division benchmark`,

    sourceConfidence:
      "LOW",
  }));

const globalBenchmarkRows: BenchmarkRow[] =
  globalRows.map((row) => ({
    ...row,

    sourceLevel:
      "GLOBAL",

    sourceLabel:
      "Global position benchmark",

    sourceConfidence:
      "LOW",
  }));

const benchmarks =
  mergeBenchmarkRows(
    schoolBenchmarkRows,
    conferenceBenchmarkRows,
    divisionBenchmarkRows,
    globalBenchmarkRows
  );

  if (
    benchmarks.length === 0
  ) {
    return {
      level:
        "ESTIMATED",

      label:
        "Estimated - benchmark data not available yet",

      confidence:
        confidenceForLevel(
          "ESTIMATED"
        ),

      benchmarks:
        [],
    };
  }

  /*
   * Keep the existing result contract intact.
   *
   * The overall source level represents the highest-priority
   * benchmark scope contributing data to the result.
   *
   * Individual position + metric combinations may still use
   * lower-level fallback data.
   */
  if (
    schoolRows.length > 0
  ) {
    return {
      level:
        "SCHOOL",

      label:
        `${collegeName || "School"} program benchmark with conference / division fallback`,

      confidence:
        confidenceForLevel(
          "SCHOOL"
        ),

      benchmarks,
    };
  }

  if (
    conferenceRows.length > 0
  ) {
    return {
      level:
        "CONFERENCE",

      label:
        `${conferenceKey} conference benchmark with division fallback`,

      confidence:
        confidenceForLevel(
          "CONFERENCE"
        ),

      benchmarks,
    };
  }

  if (
    divisionRows.length > 0
  ) {
    return {
      level:
        "DIVISION",

      label:
        `${formatDivisionLabel(
          divisionKey
        )} division benchmark`,

      confidence:
        confidenceForLevel(
          "DIVISION"
        ),

      benchmarks,
    };
  }

  return {
    level:
      "GLOBAL",

    label:
      "Global position benchmark",

    confidence:
      confidenceForLevel(
        "GLOBAL"
      ),

    benchmarks,
  };
}