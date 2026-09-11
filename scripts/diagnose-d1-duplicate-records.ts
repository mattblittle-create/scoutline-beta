// scripts/diagnose-d1-duplicate-records.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TARGET_COLLEGE_IDS = [
  "cmou8540400kuqtiws5720no0", // Naval Academy
  "cmou7y6sb00ifqtoc8y5sldt8", // United States Naval Academy
  "cmou72rm100clqtt8q8b00o3c", // UNC Wilmington
  "cmorirv0y000rqtm0oi05g3yi", // University of North Carolina Wilmington
];

async function main(): Promise<void> {
  const colleges = await prisma.college.findMany({
    where: {
      id: {
        in: TARGET_COLLEGE_IDS,
      },
    },
    include: {
      baseballProgram: {
        include: {
          coaches: true,
          rosterNeeds: true,
          metricAverages: true,
        },
      },

      savedByPlayers: {
        select: {
          id: true,
        },
      },

      coaches: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },

      coachNotes: {
        select: {
          id: true,
        },
      },

      coachPlayerRatings: {
        select: {
          id: true,
        },
      },

      recruitingBoardEntries: {
        select: {
          id: true,
        },
      },

      recruitingLists: {
        select: {
          id: true,
        },
      },

      programVerificationSubmissions: {
        select: {
          id: true,
        },
      },

      profileViewEvents: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  console.log("");
  console.log("=".repeat(100));
  console.log("D1 DUPLICATE COLLEGE RECORD DIAGNOSTIC");
  console.log("=".repeat(100));

  for (const college of colleges) {
    const program = college.baseballProgram;

    console.log("");
    console.log(college.name);
    console.log("-".repeat(100));

    console.log({
      collegeId: college.id,
      slug: college.slug,
      city: college.city,
      state: college.state,

      collegeVerificationStatus:
        college.verificationStatus,
      collegeLastVerifiedAt:
        college.lastVerifiedAt,

      legacyDivision: college.division,
      legacyConference: college.conference,

      collegeWebsiteUrl:
        college.websiteUrl,
      legacyProgramWebsiteUrl:
        college.programWebsiteUrl,
      legacyQuestionnaireUrl:
        college.recruitingQuestionnaireUrl,

      programId: program?.id ?? null,
      programDivision:
        program?.division ?? null,
      programConference:
        program?.conference ?? null,
      baseballWebsiteUrl:
        program?.baseballWebsiteUrl ?? null,
      rosterUrl:
        program?.rosterUrl ?? null,
      scheduleUrl:
        program?.scheduleUrl ?? null,
      campsUrl:
        program?.campsUrl ?? null,
      questionnaireUrl:
        program?.questionnaireUrl ?? null,

      programCoachRecords:
        program?.coaches.length ?? 0,
      rosterNeedRecords:
        program?.rosterNeeds.length ?? 0,
      metricAverageRecords:
        program?.metricAverages.length ?? 0,

      linkedCollegeUsers:
        college.coaches.length,
      savedByPlayerRecords:
        college.savedByPlayers.length,
      coachNoteRecords:
        college.coachNotes.length,
      coachPlayerRatingRecords:
        college.coachPlayerRatings.length,
      recruitingBoardEntries:
        college.recruitingBoardEntries.length,
      recruitingListRecords:
        college.recruitingLists.length,
      verificationSubmissions:
        college.programVerificationSubmissions.length,
      profileViewEvents:
        college.profileViewEvents.length,
    });

    if (college.coaches.length > 0) {
      console.log("");
      console.log("Linked college users:");

      for (const coach of college.coaches) {
        console.log({
          userId: coach.id,
          email: coach.email,
          role: coach.role,
        });
      }
    }

    if (
      program &&
      program.coaches.length > 0
    ) {
      console.log("");
      console.log("Program coach records:");

      for (const coach of program.coaches) {
        console.log(coach);
      }
    }
  }

  console.log("");
  console.log(
    "No ScoutLine database records were created, updated, or deleted.",
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "Duplicate D1 record diagnostic failed.",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });