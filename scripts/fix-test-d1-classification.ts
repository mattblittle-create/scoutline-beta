// scripts/fix-test-d1-classification.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TARGET_COLLEGE_NAME = "TEST";

function clean(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function normalizeDivision(
  value: string | null | undefined,
): string {
  return clean(value)
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/^DIVISION_?/, "D")
    .replace(/^NCAA_DIVISION_?/, "NCAA_D")
    .replace(/^NCAA_1$/, "NCAA_D1")
    .replace(/^D_?1$/, "D1");
}

function legacyDivisionLooksD1(
  value: string | null | undefined,
): boolean {
  const normalized = normalizeDivision(value);

  return [
    "NCAA_D1",
    "NCAA_DI",
    "D1",
    "DI",
    "NCAA1",
  ].includes(normalized);
}

function printSection(title: string): void {
  console.log("");
  console.log("=".repeat(90));
  console.log(title);
  console.log("=".repeat(90));
}

async function main(): Promise<void> {
  const shouldApply = process.argv.includes("--apply");

  printSection("TEST D1 CLASSIFICATION CLEANUP");

  console.log(
    `Mode: ${shouldApply ? "APPLY" : "DRY RUN"}`,
  );

  /*
   * Locate the exact TEST college record.
   *
   * We intentionally do not update every college whose legacy division
   * looks like D1. This script is narrowly scoped to the known TEST record.
   */
  const matchingColleges = await prisma.college.findMany({
    where: {
      name: {
        equals: TARGET_COLLEGE_NAME,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      state: true,
      division: true,
      conference: true,
      baseballProgram: {
        select: {
          id: true,
          division: true,
          conference: true,
          baseballWebsiteUrl: true,
          coaches: {
            select: {
              id: true,
              name: true,
              title: true,
              isHeadCoach: true,
            },
          },
        },
      },
    },
  });

  printSection("RECORD LOOKUP");

  console.log(
    `Records named TEST: ${matchingColleges.length}`,
  );

  if (matchingColleges.length !== 1) {
    throw new Error(
      `Expected exactly one college named ${TARGET_COLLEGE_NAME}, but found ${matchingColleges.length}. No changes were made.`,
    );
  }

  const college = matchingColleges[0];
  const program = college.baseballProgram;

  console.log(`College ID:          ${college.id}`);
  console.log(`College name:        ${college.name}`);
  console.log(`College slug:        ${college.slug}`);
  console.log(
    `College location:    ${clean(college.city)}, ${clean(
      college.state,
    )}`,
  );
  console.log(
    `Legacy division:     ${clean(college.division) || "(NULL)"}`,
  );
  console.log(
    `Legacy conference:   ${clean(college.conference) || "(NULL)"}`,
  );
  console.log(
    `Program ID:          ${clean(program?.id) || "(NONE)"}`,
  );
  console.log(
    `Program division:    ${
      clean(program?.division) || "(NULL)"
    }`,
  );
  console.log(
    `Program conference:  ${
      clean(program?.conference) || "(NULL)"
    }`,
  );
  console.log(
    `Baseball website:    ${
      clean(program?.baseballWebsiteUrl) || "(NONE)"
    }`,
  );
  console.log(
    `Coach count:         ${program?.coaches.length ?? 0}`,
  );

  printSection("SAFETY VALIDATION");

  const validations = {
    exactName:
      clean(college.name).toUpperCase() ===
      TARGET_COLLEGE_NAME,
    legacyDivisionIsD1: legacyDivisionLooksD1(
      college.division,
    ),
    hasBaseballProgram: program !== null,
    programDivisionIsNull:
      program?.division === null,
    hasNoCoaches:
      (program?.coaches.length ?? 0) === 0,
  };

  console.log(
    `Exact TEST name:              ${
      validations.exactName ? "PASS" : "FAIL"
    }`,
  );
  console.log(
    `Legacy division looks D1:     ${
      validations.legacyDivisionIsD1
        ? "PASS"
        : "FAIL"
    }`,
  );
  console.log(
    `Has baseball program:         ${
      validations.hasBaseballProgram
        ? "PASS"
        : "FAIL"
    }`,
  );
  console.log(
    `Program division is null:     ${
      validations.programDivisionIsNull
        ? "PASS"
        : "FAIL"
    }`,
  );
  console.log(
    `Program has zero coaches:     ${
      validations.hasNoCoaches ? "PASS" : "FAIL"
    }`,
  );

  if (!validations.exactName) {
    throw new Error(
      "The located record does not have the exact name TEST.",
    );
  }

  if (!validations.legacyDivisionIsD1) {
    throw new Error(
      "The TEST record's legacy College.division field is not currently classified as D1.",
    );
  }

  if (!validations.hasBaseballProgram) {
    throw new Error(
      "The TEST college does not have a baseball program. The current database state differs from the audit.",
    );
  }

  if (!validations.programDivisionIsNull) {
    throw new Error(
      `Expected the TEST baseball program division to be null, but found ${program?.division}.`,
    );
  }

  if (!validations.hasNoCoaches) {
    console.log("");
    console.log("Coaches currently attached to TEST:");

    for (const coach of program?.coaches ?? []) {
      const coachName = clean(coach.name);

      console.log(
        `- ${coachName || "(Unnamed coach)"} | ${
          clean(coach.title) || "(No title)"
        } | Head coach: ${
          coach.isHeadCoach ? "Yes" : "No"
        }`,
      );
    }

    throw new Error(
      "The TEST program has coach records attached. Refusing to change its classification until those records are reviewed.",
    );
  }

  printSection("PROPOSED CHANGE");

  console.log(
    `College.division: ${college.division} -> NULL`,
  );
  console.log("");
  console.log(
    "No CollegeBaseballProgram fields will be changed.",
  );
  console.log(
    "No college, program, coach, or related records will be deleted.",
  );

  if (!shouldApply) {
    printSection("DRY RUN COMPLETE");

    console.log(
      "The TEST record passed all safety validations.",
    );
    console.log("");
    console.log(
      "No database records were created, updated, or deleted.",
    );
    console.log("");
    console.log("To apply the correction, run:");
    console.log(
      "npx tsx scripts/fix-test-d1-classification.ts --apply",
    );

    return;
  }

  printSection("APPLYING CORRECTION");

  const result = await prisma.$transaction(
    async (transaction) => {
      /*
       * updateMany allows us to include the original division in the
       * WHERE clause. If the record changes between validation and update,
       * the update count will be zero and the transaction will fail.
       */
      const updateResult =
        await transaction.college.updateMany({
          where: {
            id: college.id,
            division: college.division,
            name: {
              equals: TARGET_COLLEGE_NAME,
              mode: "insensitive",
            },
          },
          data: {
            division: null,
          },
        });

      if (updateResult.count !== 1) {
        throw new Error(
          `Expected to update exactly one TEST college record, but Prisma updated ${updateResult.count}. The transaction will be rolled back.`,
        );
      }

      const verification =
        await transaction.college.findUnique({
          where: {
            id: college.id,
          },
          select: {
            id: true,
            name: true,
            division: true,
            baseballProgram: {
              select: {
                id: true,
                division: true,
                coaches: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        });

      if (!verification) {
        throw new Error(
          "The TEST college could not be found during post-update verification. The transaction will be rolled back.",
        );
      }

      if (verification.division !== null) {
        throw new Error(
          "Post-update verification found that College.division is not null. The transaction will be rolled back.",
        );
      }

      if (
        verification.baseballProgram?.division !== null
      ) {
        throw new Error(
          "The TEST baseball program division changed unexpectedly. The transaction will be rolled back.",
        );
      }

      if (
        (verification.baseballProgram?.coaches.length ??
          0) !== 0
      ) {
        throw new Error(
          "The TEST baseball program acquired coach records during the update. The transaction will be rolled back.",
        );
      }

      return verification;
    },
  );

  printSection("CORRECTION COMPLETE");

  console.log(`College ID:       ${result.id}`);
  console.log(`College name:     ${result.name}`);
  console.log(
    `College division: ${
      result.division ?? "(NULL)"
    }`,
  );
  console.log(
    `Program division: ${
      result.baseballProgram?.division ?? "(NULL)"
    }`,
  );
  console.log("");
  console.log(
    "The TEST record no longer contributes to the legacy D1 inventory.",
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "TEST D1 classification cleanup failed.",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });