// scripts/set-butler-baseball-url.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

const BUTLER_SLUG = "butler-university";

const BASEBALL_URL =
  "https://butlersports.com/sports/baseball";

async function main(): Promise<void> {
  console.log("=".repeat(80));
  console.log("SET BUTLER BASEBALL URL");
  console.log("=".repeat(80));
  console.log(
    `Mode: ${APPLY ? "APPLY" : "DRY RUN"}`,
  );

  const program =
    await prisma.collegeBaseballProgram.findFirst({
      where: {
        college: {
          is: {
            slug: BUTLER_SLUG,
          },
        },
      },
      include: {
        college: true,
      },
    });

  if (!program) {
    throw new Error(
      `No baseball program found for slug: ${BUTLER_SLUG}`,
    );
  }

  console.log("");
  console.log(`College: ${program.college.name}`);
  console.log(`Program ID: ${program.id}`);
  console.log(
    `Current URL: ${program.baseballWebsiteUrl ?? "(NULL)"}`,
  );
  console.log(`Proposed URL: ${BASEBALL_URL}`);

  if (!APPLY) {
    console.log("");
    console.log("No database records were updated.");
    console.log("");
    console.log("To apply:");
    console.log(
      "npx tsx scripts/set-butler-baseball-url.ts --apply",
    );
    return;
  }

  await prisma.collegeBaseballProgram.update({
    where: {
      id: program.id,
    },
    data: {
      baseballWebsiteUrl: BASEBALL_URL,
    },
  });

  const verified =
    await prisma.collegeBaseballProgram.findUnique({
      where: {
        id: program.id,
      },
      select: {
        baseballWebsiteUrl: true,
      },
    });

  if (
    verified?.baseballWebsiteUrl !==
    BASEBALL_URL
  ) {
    throw new Error(
      "Butler baseball URL verification failed.",
    );
  }

  console.log("");
  console.log("Butler baseball URL updated successfully.");
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "Butler baseball URL update failed.",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });