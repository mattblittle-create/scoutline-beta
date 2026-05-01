// prisma/seedBaseballMetricBenchmarks.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Row = {
  scope: "DIVISION" | "GLOBAL";
  sourceKey: string;
  position: string;
  metricKey: string;
  metricLabel: string;
  averageValue: number;
  minValue: number;
  maxValue: number;
  unit: string;
  sampleSize?: number;
  sourceNote?: string;
};

const rows: Row[] = [
  // NCAA D1 - 3B / corner infield baseline
  { scope: "DIVISION", sourceKey: "NCAA_D1", position: "3B", metricKey: "exitVelo", metricLabel: "Exit Velo", averageValue: 95, minValue: 88, maxValue: 102, unit: "mph", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D1", position: "3B", metricKey: "sixtyYdDash", metricLabel: "60 Yard Dash", averageValue: 6.95, minValue: 6.65, maxValue: 7.25, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D1", position: "3B", metricKey: "homeToFirst", metricLabel: "Home to First", averageValue: 4.25, minValue: 4.05, maxValue: 4.45, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D1", position: "3B", metricKey: "infieldThrowVelo", metricLabel: "Infield Throw Velo", averageValue: 85, minValue: 80, maxValue: 92, unit: "mph", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D1", position: "3B", metricKey: "heightIn", metricLabel: "Height", averageValue: 73, minValue: 70, maxValue: 76, unit: "in", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D1", position: "3B", metricKey: "weightLb", metricLabel: "Weight", averageValue: 195, minValue: 180, maxValue: 220, unit: "lb", sourceNote: "ScoutLine division baseline" },

  // NCAA D2 - 3B
  { scope: "DIVISION", sourceKey: "NCAA_D2", position: "3B", metricKey: "exitVelo", metricLabel: "Exit Velo", averageValue: 91, minValue: 84, maxValue: 98, unit: "mph", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D2", position: "3B", metricKey: "sixtyYdDash", metricLabel: "60 Yard Dash", averageValue: 7.15, minValue: 6.85, maxValue: 7.45, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D2", position: "3B", metricKey: "homeToFirst", metricLabel: "Home to First", averageValue: 4.35, minValue: 4.15, maxValue: 4.55, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D2", position: "3B", metricKey: "infieldThrowVelo", metricLabel: "Infield Throw Velo", averageValue: 81, minValue: 76, maxValue: 88, unit: "mph", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D2", position: "3B", metricKey: "heightIn", metricLabel: "Height", averageValue: 72, minValue: 69, maxValue: 75, unit: "in", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D2", position: "3B", metricKey: "weightLb", metricLabel: "Weight", averageValue: 185, minValue: 170, maxValue: 210, unit: "lb", sourceNote: "ScoutLine division baseline" },

  // NCAA D3 - 3B
  { scope: "DIVISION", sourceKey: "NCAA_D3", position: "3B", metricKey: "exitVelo", metricLabel: "Exit Velo", averageValue: 88, minValue: 80, maxValue: 95, unit: "mph", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D3", position: "3B", metricKey: "sixtyYdDash", metricLabel: "60 Yard Dash", averageValue: 7.35, minValue: 7.0, maxValue: 7.65, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D3", position: "3B", metricKey: "homeToFirst", metricLabel: "Home to First", averageValue: 4.45, minValue: 4.25, maxValue: 4.65, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D3", position: "3B", metricKey: "infieldThrowVelo", metricLabel: "Infield Throw Velo", averageValue: 77, minValue: 72, maxValue: 84, unit: "mph", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D3", position: "3B", metricKey: "heightIn", metricLabel: "Height", averageValue: 71, minValue: 68, maxValue: 74, unit: "in", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D3", position: "3B", metricKey: "weightLb", metricLabel: "Weight", averageValue: 175, minValue: 160, maxValue: 200, unit: "lb", sourceNote: "ScoutLine division baseline" },

  // NAIA - 3B
  { scope: "DIVISION", sourceKey: "NAIA", position: "3B", metricKey: "exitVelo", metricLabel: "Exit Velo", averageValue: 89, minValue: 82, maxValue: 96, unit: "mph", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NAIA", position: "3B", metricKey: "sixtyYdDash", metricLabel: "60 Yard Dash", averageValue: 7.25, minValue: 6.95, maxValue: 7.55, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NAIA", position: "3B", metricKey: "homeToFirst", metricLabel: "Home to First", averageValue: 4.4, minValue: 4.2, maxValue: 4.6, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NAIA", position: "3B", metricKey: "infieldThrowVelo", metricLabel: "Infield Throw Velo", averageValue: 79, minValue: 74, maxValue: 86, unit: "mph", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NAIA", position: "3B", metricKey: "heightIn", metricLabel: "Height", averageValue: 71, minValue: 68, maxValue: 75, unit: "in", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NAIA", position: "3B", metricKey: "weightLb", metricLabel: "Weight", averageValue: 180, minValue: 165, maxValue: 205, unit: "lb", sourceNote: "ScoutLine division baseline" },

  // NJCAA D1 - 3B
  { scope: "DIVISION", sourceKey: "NJCAA_D1", position: "3B", metricKey: "exitVelo", metricLabel: "Exit Velo", averageValue: 90, minValue: 83, maxValue: 98, unit: "mph", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NJCAA_D1", position: "3B", metricKey: "sixtyYdDash", metricLabel: "60 Yard Dash", averageValue: 7.2, minValue: 6.9, maxValue: 7.5, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NJCAA_D1", position: "3B", metricKey: "homeToFirst", metricLabel: "Home to First", averageValue: 4.38, minValue: 4.18, maxValue: 4.58, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NJCAA_D1", position: "3B", metricKey: "infieldThrowVelo", metricLabel: "Infield Throw Velo", averageValue: 80, minValue: 75, maxValue: 87, unit: "mph", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NJCAA_D1", position: "3B", metricKey: "heightIn", metricLabel: "Height", averageValue: 71, minValue: 68, maxValue: 75, unit: "in", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NJCAA_D1", position: "3B", metricKey: "weightLb", metricLabel: "Weight", averageValue: 180, minValue: 165, maxValue: 210, unit: "lb", sourceNote: "ScoutLine division baseline" },

  // NCAA D1 - 1B
  { scope: "DIVISION", sourceKey: "NCAA_D1", position: "1B", metricKey: "exitVelo", metricLabel: "Exit Velo", averageValue: 97, minValue: 92, maxValue: 105, unit: "mph", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D1", position: "1B", metricKey: "sixtyYdDash", metricLabel: "60 Yard Dash", averageValue: 7.1, minValue: 6.8, maxValue: 7.5, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D1", position: "1B", metricKey: "homeToFirst", metricLabel: "Home to First", averageValue: 4.35, minValue: 4.15, maxValue: 4.6, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D1", position: "1B", metricKey: "heightIn", metricLabel: "Height", averageValue: 74, minValue: 71, maxValue: 78, unit: "in", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D1", position: "1B", metricKey: "weightLb", metricLabel: "Weight", averageValue: 210, minValue: 190, maxValue: 240, unit: "lb", sourceNote: "ScoutLine division baseline" },

  // NCAA D2 - 1B
  { scope: "DIVISION", sourceKey: "NCAA_D2", position: "1B", metricKey: "exitVelo", metricLabel: "Exit Velo", averageValue: 93, minValue: 88, maxValue: 100, unit: "mph", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D2", position: "1B", metricKey: "sixtyYdDash", metricLabel: "60 Yard Dash", averageValue: 7.3, minValue: 7.0, maxValue: 7.7, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D2", position: "1B", metricKey: "homeToFirst", metricLabel: "Home to First", averageValue: 4.45, minValue: 4.25, maxValue: 4.7, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D2", position: "1B", metricKey: "heightIn", metricLabel: "Height", averageValue: 73, minValue: 70, maxValue: 77, unit: "in", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D2", position: "1B", metricKey: "weightLb", metricLabel: "Weight", averageValue: 200, minValue: 180, maxValue: 230, unit: "lb", sourceNote: "ScoutLine division baseline" },

  // NCAA D3 - 1B
  { scope: "DIVISION", sourceKey: "NCAA_D3", position: "1B", metricKey: "exitVelo", metricLabel: "Exit Velo", averageValue: 89, minValue: 82, maxValue: 96, unit: "mph", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D3", position: "1B", metricKey: "sixtyYdDash", metricLabel: "60 Yard Dash", averageValue: 7.5, minValue: 7.2, maxValue: 7.9, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D3", position: "1B", metricKey: "homeToFirst", metricLabel: "Home to First", averageValue: 4.6, minValue: 4.4, maxValue: 4.9, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D3", position: "1B", metricKey: "heightIn", metricLabel: "Height", averageValue: 72, minValue: 69, maxValue: 76, unit: "in", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NCAA_D3", position: "1B", metricKey: "weightLb", metricLabel: "Weight", averageValue: 190, minValue: 170, maxValue: 220, unit: "lb", sourceNote: "ScoutLine division baseline" },

  // NAIA - 1B
  { scope: "DIVISION", sourceKey: "NAIA", position: "1B", metricKey: "exitVelo", metricLabel: "Exit Velo", averageValue: 91, minValue: 85, maxValue: 98, unit: "mph", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NAIA", position: "1B", metricKey: "sixtyYdDash", metricLabel: "60 Yard Dash", averageValue: 7.35, minValue: 7.05, maxValue: 7.75, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NAIA", position: "1B", metricKey: "homeToFirst", metricLabel: "Home to First", averageValue: 4.5, minValue: 4.3, maxValue: 4.75, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NAIA", position: "1B", metricKey: "heightIn", metricLabel: "Height", averageValue: 73, minValue: 70, maxValue: 77, unit: "in", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NAIA", position: "1B", metricKey: "weightLb", metricLabel: "Weight", averageValue: 195, minValue: 175, maxValue: 225, unit: "lb", sourceNote: "ScoutLine division baseline" },

  // NJCAA D1 - 1B
  { scope: "DIVISION", sourceKey: "NJCAA_D1", position: "1B", metricKey: "exitVelo", metricLabel: "Exit Velo", averageValue: 92, minValue: 86, maxValue: 100, unit: "mph", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NJCAA_D1", position: "1B", metricKey: "sixtyYdDash", metricLabel: "60 Yard Dash", averageValue: 7.3, minValue: 7.0, maxValue: 7.7, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NJCAA_D1", position: "1B", metricKey: "homeToFirst", metricLabel: "Home to First", averageValue: 4.45, minValue: 4.25, maxValue: 4.7, unit: "sec", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NJCAA_D1", position: "1B", metricKey: "heightIn", metricLabel: "Height", averageValue: 73, minValue: 70, maxValue: 77, unit: "in", sourceNote: "ScoutLine division baseline" },
  { scope: "DIVISION", sourceKey: "NJCAA_D1", position: "1B", metricKey: "weightLb", metricLabel: "Weight", averageValue: 200, minValue: 180, maxValue: 230, unit: "lb", sourceNote: "ScoutLine division baseline" },
];

async function main() {
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
      update: row,
      create: row,
    });
  }

  console.log(`Seeded ${rows.length} baseball metric benchmark rows.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });