// scripts/fix-clemson-questionnaire.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.collegeBaseballProgram.updateMany({
    where: {
      college: {
        slug: "clemson-university",
      },
    },
    data: {
      questionnaireUrl: "https://questionnaires.armssoftware.com/02d2cc79da2c",
      generalContactUrl: "https://clemsontigers.com/baseball-recruits",
    },
  });

  console.log("✅ Clemson recruiting questionnaire updated.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });