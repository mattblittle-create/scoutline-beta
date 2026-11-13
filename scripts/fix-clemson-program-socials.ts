// scripts/fix-clemson-program-socials.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.college.update({
    where: {
      slug: "clemson-university",
    },
    data: {
      programXUrl: "https://x.com/ClemsonBaseball",
      programInstagramUrl: "https://www.instagram.com/clemsonbaseball/",
      recruitingQuestionnaireUrl: "https://questionnaires.armssoftware.com/02d2cc79da2c",
    },
  });

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

  console.log("✅ Clemson program socials and questionnaire updated.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });