// scripts/check-college-enrichment.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slugs = ["clemson-university"];

  for (const slug of slugs) {
    const college = await prisma.college.findUnique({
      where: { slug },
      include: {
        academicProfile: true,
        nilProfile: {
          include: {
            collectives: {
              include: {
                sportAllocations: true,
              },
            },
          },
        },
        baseballProgram: {
          include: {
            coaches: true,
          },
        },
      },
    });

    console.dir(college, { depth: null });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });