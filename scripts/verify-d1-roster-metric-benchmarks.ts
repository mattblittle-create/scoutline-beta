import { prisma } from "../lib/prisma";

async function main() {
  const schoolCount =
    await prisma.collegeBaseballMetricAverage.count({
      where: {
        metricKey: {
          in: ["heightIn", "weightLb"],
        },
        program: {
          division: "NCAA_D1",
        },
      },
    });

  const aggregateCount =
    await prisma.baseballMetricBenchmark.count({
      where: {
        metricKey: {
          in: ["heightIn", "weightLb"],
        },
        OR: [
          {
            scope: "CONFERENCE",
          },
          {
            scope: "DIVISION",
            sourceKey: "NCAA_D1",
          },
        ],
      },
    });

  console.log({
    schoolCount,
    aggregateCount,
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
