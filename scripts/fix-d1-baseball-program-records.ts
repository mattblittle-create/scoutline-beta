// scripts/fix-d1-baseball-program-records.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const removed =
    await prisma.collegeBaseballProgram.deleteMany({
      where: {
        college: {
          slug: {
            in: [
              "depaul-university",
              "providence-college",
            ],
          },
        },
      },
    });

  console.log(
    `Removed ${removed.count} invalid baseball-program record(s).`,
  );

  const westGeorgia =
    await prisma.collegeBaseballProgram.updateMany({
      where: {
        college: {
          slug: "university-of-west-georgia",
        },
      },
      data: {
        baseballWebsiteUrl:
          "https://uwgathletics.com/sports/baseball",
      },
    });

  console.log(
    `Updated ${westGeorgia.count} West Georgia baseball-program record(s).`,
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