// scripts/set-tennessee-tech-baseball-url.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

const COLLEGE_NAME =
  "Tennessee Technological University";

const CORRECT_BASEBALL_URL =
  "https://www.ttusports.com/sports/bsb";

async function main() {
  console.log(
    "=".repeat(80),
  );
  console.log(
    "SET TENNESSEE TECH BASEBALL URL",
  );
  console.log(
    "=".repeat(80),
  );
  console.log(
    `Mode: ${APPLY ? "APPLY" : "DRY RUN"}`,
  );
  console.log("");

  const college =
    await prisma.college.findFirst({
      where: {
        name: COLLEGE_NAME,
      },
      select: {
        id: true,
        name: true,
        baseballProgram: {
          select: {
            id: true,
            baseballWebsiteUrl: true,
          },
        },
      },
    });

  if (!college) {
    throw new Error(
      `${COLLEGE_NAME} was not found.`,
    );
  }

  if (!college.baseballProgram) {
    throw new Error(
      `${COLLEGE_NAME} does not have a baseball program record.`,
    );
  }

  console.log(
    `College: ${college.name}`,
  );
  console.log(
    `Program ID: ${college.baseballProgram.id}`,
  );
  console.log(
    `Current URL: ${
      college.baseballProgram
        .baseballWebsiteUrl ?? "(NULL)"
    }`,
  );
  console.log(
    `Proposed URL: ${CORRECT_BASEBALL_URL}`,
  );
  console.log("");

  if (!APPLY) {
    console.log(
      "No database records were updated.",
    );
    console.log("");
    console.log("To apply:");
    console.log(
      "npx tsx scripts/set-tennessee-tech-baseball-url.ts --apply",
    );

    return;
  }

  await prisma.collegeBaseballProgram.update({
    where: {
      id: college.baseballProgram.id,
    },
    data: {
      baseballWebsiteUrl:
        CORRECT_BASEBALL_URL,
    },
  });

  const verified =
    await prisma.collegeBaseballProgram.findUnique({
      where: {
        id: college.baseballProgram.id,
      },
      select: {
        baseballWebsiteUrl: true,
      },
    });

  if (
    verified?.baseballWebsiteUrl !==
    CORRECT_BASEBALL_URL
  ) {
    throw new Error(
      "Tennessee Tech URL update could not be verified.",
    );
  }

  console.log(
    "Tennessee Tech baseball URL updated successfully.",
  );
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      error instanceof Error
        ? error.message
        : String(error),
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });