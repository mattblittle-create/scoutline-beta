import { prisma } from "../lib/prisma";

async function main() {
  const supportedKeys = [
    "avgFbVelo",
    "popTime",
    "sixtyYdDash",
    "infieldThrowVelo",
    "outfieldThrowVelo",
  ];

  const rows = await prisma.baseballMetricBenchmark.findMany({
    where: {
      scope: "DIVISION",
      metricKey: {
        in: supportedKeys,
      },
    },
    select: {
      sourceKey: true,
      position: true,
      metricKey: true,
      averageValue: true,
      minValue: true,
      maxValue: true,
      unit: true,
    },
    orderBy: [
      { sourceKey: "asc" },
      { position: "asc" },
      { metricKey: "asc" },
    ],
  });

  const generated = new Set<string>();

  const generatedCsv =
    process.argv[2];

  if (!generatedCsv) {
    throw new Error("Pass QA CSV path.");
  }

  const fs = await import("fs");

  const text =
    fs.readFileSync(
      generatedCsv,
      "utf8"
    );

  const lines =
    text
      .split(/\r?\n/)
      .slice(1)
      .filter(Boolean);

  for (const line of lines) {
    const cols =
      line.split(",");

    const scope =
      cols[0];

    const sourceKey =
      cols[1];

    const position =
      cols[2];

    const metricKey =
      cols[3];

    generated.add(
      `${scope}|${sourceKey}|${position}|${metricKey}`
    );
  }

  console.table(
    rows.filter(
      (row) =>
        !generated.has(
          `DIVISION|${row.sourceKey}|${row.position}|${row.metricKey}`
        )
    )
  );
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
