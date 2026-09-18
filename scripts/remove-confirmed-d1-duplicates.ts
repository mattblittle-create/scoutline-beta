// scripts/remove-confirmed-d1-duplicates.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY_CHANGES = process.argv.includes("--apply");

const DUPLICATES = [
  {
    canonicalCollegeId: "cmou8540400kuqtiws5720no0",
    duplicateCollegeId: "cmou7y6sb00ifqtoc8y5sldt8",
    expectedCanonicalName: "Naval Academy",
    expectedDuplicateName:
      "United States Naval Academy",
  },
  {
    canonicalCollegeId: "cmou72rm100clqtt8q8b00o3c",
    duplicateCollegeId: "cmorirv0y000rqtm0oi05g3yi",
    expectedCanonicalName: "UNC Wilmington",
    expectedDuplicateName:
      "University of North Carolina Wilmington",
  },
] as const;

function hasUnexpectedRelations(
  counts: Record<string, number>,
): boolean {
  return Object.values(counts).some(
    (count) => count > 0,
  );
}

async function main(): Promise<void> {
  console.log("");
  console.log("=".repeat(100));
  console.log(
    "CONFIRMED NCAA D1 DUPLICATE CLEANUP",
  );
  console.log("=".repeat(100));
  console.log(
    `Mode: ${APPLY_CHANGES ? "APPLY" : "DRY RUN"}`,
  );

  for (const pair of DUPLICATES) {
    const canonical =
      await prisma.college.findUnique({
        where: {
          id: pair.canonicalCollegeId,
        },
        include: {
          baseballProgram: true,
        },
      });

    const duplicate =
      await prisma.college.findUnique({
        where: {
          id: pair.duplicateCollegeId,
        },
        include: {
          baseballProgram: true,

          academicProfile: {
            select: {
              id: true,
            },
          },
          admissionsProfile: {
            select: {
              id: true,
            },
          },
          financialProfile: {
            select: {
              id: true,
            },
          },
          campusProfile: {
            select: {
              id: true,
            },
          },
          nilProfile: {
            select: {
              id: true,
            },
          },

          _count: {
            select: {
              academicAreas: true,
              coachInvites: true,
              coachJoinRequests: true,
              joinLinks: true,
              coachNotes: true,
              coachPlayerRatings: true,
              programVerificationSubmissions: true,
              profileViewEvents: true,
              recruitingBoardEntries: true,
              recruitingLists: true,
              savedByPlayers: true,
              coaches: true,
            },
          },
        },
      });

    if (!canonical) {
      throw new Error(
        `Canonical college not found: ${pair.canonicalCollegeId}`,
      );
    }

    if (!duplicate) {
      throw new Error(
        `Duplicate college not found: ${pair.duplicateCollegeId}`,
      );
    }

    if (
      canonical.name !==
      pair.expectedCanonicalName
    ) {
      throw new Error(
        `Canonical name mismatch. Expected "${pair.expectedCanonicalName}", found "${canonical.name}".`,
      );
    }

    if (
      duplicate.name !==
      pair.expectedDuplicateName
    ) {
      throw new Error(
        `Duplicate name mismatch. Expected "${pair.expectedDuplicateName}", found "${duplicate.name}".`,
      );
    }

    if (!canonical.baseballProgram) {
      throw new Error(
        `Canonical baseball program missing for ${canonical.name}.`,
      );
    }

    if (!duplicate.baseballProgram) {
      throw new Error(
        `Duplicate baseball program missing for ${duplicate.name}.`,
      );
    }

    const singletonRelations = {
      academicProfile:
        duplicate.academicProfile?.id ?? null,
      admissionsProfile:
        duplicate.admissionsProfile?.id ?? null,
      financialProfile:
        duplicate.financialProfile?.id ?? null,
      campusProfile:
        duplicate.campusProfile?.id ?? null,
      nilProfile:
        duplicate.nilProfile?.id ?? null,
    };

    const hasSingletonRelations =
      Object.values(singletonRelations).some(
        (id) => id !== null,
      );

    console.log("");
    console.log(
      `${duplicate.name} → ${canonical.name}`,
    );
    console.log("-".repeat(100));
    console.log({
      canonicalCollegeId: canonical.id,
      canonicalProgramId:
        canonical.baseballProgram.id,
      canonicalConference:
        canonical.baseballProgram.conference,

      duplicateCollegeId: duplicate.id,
      duplicateProgramId:
        duplicate.baseballProgram.id,
      duplicateConference:
        duplicate.baseballProgram.conference,

      duplicateRelationCounts:
        duplicate._count,
      duplicateSingletonRelations:
        singletonRelations,
    });

const {
  academicAreas,
  ...otherRelationCounts
} = duplicate._count;

if (
  hasUnexpectedRelations(
    otherRelationCounts,
  ) ||
  hasSingletonRelations
) {
  throw new Error(
    `Refusing to delete ${duplicate.name}: non-academic related records still exist.`,
  );
}

console.log(
  `Duplicate academic areas: ${academicAreas}`,
);

    if (!APPLY_CHANGES) {
      console.log(
        "Dry run passed. No records deleted.",
      );
      continue;
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.collegeBaseballProgram.delete({
          where: {
            id: duplicate.baseballProgram!.id,
          },
        });

        await tx.college.delete({
          where: {
            id: duplicate.id,
          },
        });
      },
    );

    console.log(
      `Deleted duplicate college and baseball program for ${duplicate.name}.`,
    );
  }

  console.log("");
  console.log(
    APPLY_CHANGES
      ? "Duplicate cleanup completed."
      : "Dry run completed. No ScoutLine database records were changed.",
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "Duplicate cleanup failed.",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });