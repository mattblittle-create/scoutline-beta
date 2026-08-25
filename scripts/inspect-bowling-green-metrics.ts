import { prisma } from "../lib/prisma";

async function main() {
  const college =
    await prisma.college.findFirst({
      where: {
        name: "Bowling Green State University",
      },
      select: {
        baseballProgram: {
          select: {
            id: true,
            metricAverages: {
              where: {
                metricKey: {
                  in: ["heightIn", "weightLb"],
                },
              },
              orderBy: [
                { position: "asc" },
                { metricKey: "asc" },
              ],
            },
          },
        },
      },
    });

  console.table(
    college?.baseballProgram?.metricAverages || []
  );
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
