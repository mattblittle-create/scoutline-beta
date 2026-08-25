// scripts/remove-non-baseball-programs.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NON_BASEBALL_COLLEGE_SLUGS = [
  "depaul-university",
  "providence-college",
];

async function main() {
  const programs =
    await prisma.collegeBaseballProgram.findMany({
      where: {
        college: {
          slug: {
            in: NON_BASEBALL_COLLEGE_SLUGS,
          },
        },
      },
      include: {
        college: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

  if (programs.length === 0) {
    console.log(
      "No DePaul or Providence baseball-program records found.",
    );

    return;
  }

  console.log("Removing baseball-program records:");

  for (const program of programs) {
    console.log(
      `  ${program.college.name} (${program.college.slug})`,
    );
  }

  const result =
    await prisma.collegeBaseballProgram.deleteMany({
      where: {
        college: {
          slug: {
            in: NON_BASEBALL_COLLEGE_SLUGS,
          },
        },
      },
    });

  console.log(
    `Deleted ${result.count} CollegeBaseballProgram record(s).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });