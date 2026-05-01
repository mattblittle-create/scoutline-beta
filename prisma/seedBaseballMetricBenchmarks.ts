// prisma/seedBaseballMetricBenchmarks.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Scope = "DIVISION" | "GLOBAL";

type Row = {
  scope: Scope;
  sourceKey: string;
  position: string;
  metricKey: string;
  metricLabel: string;
  averageValue: number;
  minValue: number;
  maxValue: number;
  unit: string;
  sourceNote?: string;
};

type MetricTemplate = {
  key: string;
  label: string;
  avg: number;
  min: number;
  max: number;
  unit: "mph" | "sec" | "in" | "lb";
  lowerIsBetter?: boolean;
};

const DIVISIONS = [
  { key: "NCAA_D1", veloAdj: 0, secAdj: 0, sizeAdj: 0 },
  { key: "NCAA_D2", veloAdj: -4, secAdj: 0.2, sizeAdj: -1 },
  { key: "NCAA_D3", veloAdj: -7, secAdj: 0.38, sizeAdj: -2 },
  { key: "NAIA", veloAdj: -6, secAdj: 0.3, sizeAdj: -1.5 },
  { key: "NJCAA_D1", veloAdj: -5, secAdj: 0.25, sizeAdj: -1.5 },
  { key: "NJCAA_D2", veloAdj: -8, secAdj: 0.42, sizeAdj: -2.5 },
  { key: "NJCAA_D3", veloAdj: -10, secAdj: 0.55, sizeAdj: -3 },
] as const;

const POSITION_TEMPLATES: Record<string, MetricTemplate[]> = {
  "1B": [
    { key: "exitVelo", label: "Exit Velo", avg: 97, min: 90, max: 105, unit: "mph" },
    { key: "sixtyYdDash", label: "60 Yard Dash", avg: 7.1, min: 6.8, max: 7.5, unit: "sec", lowerIsBetter: true },
    { key: "homeToFirst", label: "Home to First", avg: 4.35, min: 4.15, max: 4.6, unit: "sec", lowerIsBetter: true },
    { key: "heightIn", label: "Height", avg: 74, min: 71, max: 78, unit: "in" },
    { key: "weightLb", label: "Weight", avg: 210, min: 190, max: 240, unit: "lb" },
  ],

  "2B": [
    { key: "exitVelo", label: "Exit Velo", avg: 91, min: 84, max: 98, unit: "mph" },
    { key: "sixtyYdDash", label: "60 Yard Dash", avg: 6.85, min: 6.55, max: 7.15, unit: "sec", lowerIsBetter: true },
    { key: "homeToFirst", label: "Home to First", avg: 4.18, min: 3.98, max: 4.38, unit: "sec", lowerIsBetter: true },
    { key: "infieldThrowVelo", label: "Infield Throw Velo", avg: 82, min: 77, max: 88, unit: "mph" },
    { key: "heightIn", label: "Height", avg: 70, min: 67, max: 73, unit: "in" },
    { key: "weightLb", label: "Weight", avg: 175, min: 160, max: 195, unit: "lb" },
  ],

  "SS": [
    { key: "exitVelo", label: "Exit Velo", avg: 93, min: 86, max: 100, unit: "mph" },
    { key: "sixtyYdDash", label: "60 Yard Dash", avg: 6.75, min: 6.45, max: 7.05, unit: "sec", lowerIsBetter: true },
    { key: "homeToFirst", label: "Home to First", avg: 4.12, min: 3.92, max: 4.32, unit: "sec", lowerIsBetter: true },
    { key: "infieldThrowVelo", label: "Infield Throw Velo", avg: 86, min: 81, max: 92, unit: "mph" },
    { key: "heightIn", label: "Height", avg: 72, min: 69, max: 75, unit: "in" },
    { key: "weightLb", label: "Weight", avg: 185, min: 170, max: 205, unit: "lb" },
  ],

  "3B": [
    { key: "exitVelo", label: "Exit Velo", avg: 95, min: 88, max: 102, unit: "mph" },
    { key: "sixtyYdDash", label: "60 Yard Dash", avg: 6.95, min: 6.65, max: 7.25, unit: "sec", lowerIsBetter: true },
    { key: "homeToFirst", label: "Home to First", avg: 4.25, min: 4.05, max: 4.45, unit: "sec", lowerIsBetter: true },
    { key: "infieldThrowVelo", label: "Infield Throw Velo", avg: 85, min: 80, max: 92, unit: "mph" },
    { key: "heightIn", label: "Height", avg: 73, min: 70, max: 76, unit: "in" },
    { key: "weightLb", label: "Weight", avg: 195, min: 180, max: 220, unit: "lb" },
  ],

  "C": [
    { key: "exitVelo", label: "Exit Velo", avg: 94, min: 87, max: 101, unit: "mph" },
    { key: "sixtyYdDash", label: "60 Yard Dash", avg: 7.15, min: 6.85, max: 7.55, unit: "sec", lowerIsBetter: true },
    { key: "homeToFirst", label: "Home to First", avg: 4.35, min: 4.15, max: 4.6, unit: "sec", lowerIsBetter: true },
    { key: "popTime", label: "Pop Time", avg: 1.95, min: 1.82, max: 2.1, unit: "sec", lowerIsBetter: true },
    { key: "catcherThrowVelo", label: "Catcher Throw Velo", avg: 79, min: 74, max: 84, unit: "mph" },
    { key: "heightIn", label: "Height", avg: 72, min: 69, max: 75, unit: "in" },
    { key: "weightLb", label: "Weight", avg: 195, min: 180, max: 220, unit: "lb" },
  ],

  "OF": [
    { key: "exitVelo", label: "Exit Velo", avg: 94, min: 87, max: 101, unit: "mph" },
    { key: "sixtyYdDash", label: "60 Yard Dash", avg: 6.75, min: 6.45, max: 7.1, unit: "sec", lowerIsBetter: true },
    { key: "homeToFirst", label: "Home to First", avg: 4.1, min: 3.9, max: 4.35, unit: "sec", lowerIsBetter: true },
    { key: "outfieldThrowVelo", label: "Outfield Throw Velo", avg: 88, min: 83, max: 94, unit: "mph" },
    { key: "heightIn", label: "Height", avg: 72, min: 69, max: 76, unit: "in" },
    { key: "weightLb", label: "Weight", avg: 185, min: 170, max: 210, unit: "lb" },
  ],

  "P": [
    { key: "avgFbVelo", label: "Average FB Velo", avg: 88, min: 84, max: 94, unit: "mph" },
    { key: "avgChVelo", label: "Average CH Velo", avg: 78, min: 72, max: 84, unit: "mph" },
    { key: "avgBbVelo", label: "Average Breaking Ball Velo", avg: 76, min: 70, max: 82, unit: "mph" },
    { key: "heightIn", label: "Height", avg: 74, min: 71, max: 78, unit: "in" },
    { key: "weightLb", label: "Weight", avg: 195, min: 175, max: 225, unit: "lb" },
  ],
};

const POSITION_ALIASES: Record<string, string> = {
  LF: "OF",
  CF: "OF",
  RF: "OF",
  MIF: "SS",
  CIF: "3B",
  Utility: "OF",
};

function round(value: number, unit: string) {
  if (unit === "sec") return Number(value.toFixed(2));
  return Math.round(value);
}

function adjustedMetric(template: MetricTemplate, division: (typeof DIVISIONS)[number]) {
  if (template.unit === "sec") {
    return {
      averageValue: round(template.avg + division.secAdj, template.unit),
      minValue: round(template.min + division.secAdj, template.unit),
      maxValue: round(template.max + division.secAdj, template.unit),
    };
  }

  if (template.unit === "mph") {
    return {
      averageValue: round(template.avg + division.veloAdj, template.unit),
      minValue: round(template.min + division.veloAdj, template.unit),
      maxValue: round(template.max + division.veloAdj, template.unit),
    };
  }

  if (template.unit === "in") {
    return {
      averageValue: round(template.avg + division.sizeAdj, template.unit),
      minValue: round(template.min + division.sizeAdj, template.unit),
      maxValue: round(template.max + division.sizeAdj, template.unit),
    };
  }

  if (template.unit === "lb") {
    const lbAdj = division.sizeAdj * 8;
    return {
      averageValue: round(template.avg + lbAdj, template.unit),
      minValue: round(template.min + lbAdj, template.unit),
      maxValue: round(template.max + lbAdj, template.unit),
    };
  }

  return {
    averageValue: template.avg,
    minValue: template.min,
    maxValue: template.max,
  };
}

function buildRows(): Row[] {
  const rows: Row[] = [];

  for (const division of DIVISIONS) {
    for (const [position, templates] of Object.entries(POSITION_TEMPLATES)) {
      for (const template of templates) {
        const adjusted = adjustedMetric(template, division);

        rows.push({
          scope: "DIVISION",
          sourceKey: division.key,
          position,
          metricKey: template.key,
          metricLabel: template.label,
          unit: template.unit,
          ...adjusted,
          sourceNote: "ScoutLine division baseline - estimated recruiting benchmark",
        });
      }
    }

    for (const [alias, basePosition] of Object.entries(POSITION_ALIASES)) {
      const templates = POSITION_TEMPLATES[basePosition] || [];

      for (const template of templates) {
        const adjusted = adjustedMetric(template, division);

        rows.push({
          scope: "DIVISION",
          sourceKey: division.key,
          position: alias,
          metricKey: template.key,
          metricLabel: template.label,
          unit: template.unit,
          ...adjusted,
          sourceNote: `ScoutLine division baseline - ${alias} uses ${basePosition} benchmark profile`,
        });
      }
    }
  }

  return rows;
}

async function main() {
  const rows = buildRows();

  for (const row of rows) {
    await prisma.baseballMetricBenchmark.upsert({
      where: {
        scope_sourceKey_position_metricKey: {
          scope: row.scope,
          sourceKey: row.sourceKey,
          position: row.position,
          metricKey: row.metricKey,
        },
      },
      update: {
        metricLabel: row.metricLabel,
        averageValue: row.averageValue,
        minValue: row.minValue,
        maxValue: row.maxValue,
        unit: row.unit,
        sourceNote: row.sourceNote,
      },
      create: row,
    });
  }

  console.log(`Seeded ${rows.length} baseball metric benchmark rows.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });