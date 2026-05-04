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
};

export type BestMetricBenchmarkResult = {
  level: BenchmarkSourceLevel;
  label: string;
  benchmarks: BestMetricBenchmark[];
};

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeDivision(value?: string | null) {
  return String(value || "").trim().toUpperCase();
}

function formatDivisionLabel(value?: string | null) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/_/g, " ");
}

function normalizeConference(value?: string | null) {
  return String(value || "").trim();
}

function mapBenchmarkRows(rows: any[]): BestMetricBenchmark[] {
  return rows.map((row) => ({
    position: row.position,
    metricKey: row.metricKey,
    metricLabel: row.metricLabel,
    averageValue: asNumber(row.averageValue),
    minValue: asNumber(row.minValue),
    maxValue: asNumber(row.maxValue),
    unit: row.unit,
  }));
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
  if (programId) {
    const schoolRows = await prisma.baseballMetricBenchmark.findMany({
      where: {
        scope: "SCHOOL",
        sourceKey: programId,
      },
    });

    if (schoolRows.length > 0) {
      return {
        level: "SCHOOL",
        label: `${collegeName || "School"} program benchmark`,
        benchmarks: mapBenchmarkRows(schoolRows),
      };
    }
  }

  const conferenceKey = normalizeConference(conference);

  if (conferenceKey) {
    const conferenceRows = await prisma.baseballMetricBenchmark.findMany({
      where: {
        scope: "CONFERENCE",
        sourceKey: conferenceKey,
      },
    });

    if (conferenceRows.length > 0) {
      return {
        level: "CONFERENCE",
        label: `${conferenceKey} conference benchmark`,
        benchmarks: mapBenchmarkRows(conferenceRows),
      };
    }
  }

  const divisionKey = normalizeDivision(division);

  if (divisionKey) {
    const divisionRows = await prisma.baseballMetricBenchmark.findMany({
      where: {
        scope: "DIVISION",
        sourceKey: divisionKey,
      },
    });

    if (divisionRows.length > 0) {
      return {
        level: "DIVISION",
        label: `${formatDivisionLabel(divisionKey)} division benchmark`,
        benchmarks: mapBenchmarkRows(divisionRows),
      };
    }
  }

  const globalRows = await prisma.baseballMetricBenchmark.findMany({
    where: {
      scope: "GLOBAL",
      sourceKey: "GLOBAL",
    },
  });

  if (globalRows.length > 0) {
    return {
      level: "GLOBAL",
      label: "Global position benchmark",
      benchmarks: mapBenchmarkRows(globalRows),
    };
  }

  return {
    level: "ESTIMATED",
    label: "Estimated - benchmark data not available yet",
    benchmarks: [],
  };
}