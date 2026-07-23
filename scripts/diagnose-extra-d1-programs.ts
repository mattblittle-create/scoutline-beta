// scripts/diagnose-extra-d1-programs.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXTRA_D1_COLLEGE_IDS = [
  "cmou3xrc4006oqt5s6xbcss6r", // Boise State University
  "cmou7y6to00iiqtoccnzql78p", // California State University Fresno
  "cmou3xres006rqt5sroo5bttq", // Colorado State University
  "cmou87s0o00llqt8obrn2et5p", // East Texas A&M University
  "cmosun0gl005iqtlg3rsb1jga", // Iowa State University
  "cmou6ba6o00aoqticyii4x4fl", // Marquette University
  "cmou7v17l00gxqtfg0hn9bpcu", // North Carolina Central University
  "cmou7zwi600jiqt182wps2oyk", // Saint Francis University
  "cmou7v19400h0qtfgytxc7nrk", // South Carolina State University
  "cmou8ctpc00o0qtlou8fzrbpg", // Southern Utah University
  "cmossgres0013qti43q75sz9x", // Syracuse University
  "cmou57egv0083qtdw0yqps6gp", // Temple University
  "cmosun0fb005fqtlg6yhcnwdm", // University of Colorado Boulder
  "cmou7wkjz00hoqt5slulm7vp1", // University of Northern Iowa
  "cmou74gen00diqtbopd0cv1gz", // University of Texas at El Paso
  "cmoss3uty003rqtao20hszq6b", // University of Wisconsin
  "cmou7y70i00ixqtocvqf5dc9l", // University of Wyoming
  "cmou3xrmc0079qt5sgo4w6bdl", // Utah State University
] as const;

function hasPositiveCount(
  counts: Record<string, number>,
): boolean {
  return Object.values(counts).some(
    (count) => count > 0,
  );
}

async function main(): Promise<void> {
  const colleges = await prisma.college.findMany({
    where: {
      id: {
        in: [...EXTRA_D1_COLLEGE_IDS],
      },
    },

    include: {
      baseballProgram: {
        include: {
          coaches: {
            select: {
              id: true,
              name: true,
              title: true,
              email: true,
            },
          },

          rosterNeeds: {
            select: {
              id: true,
            },
          },

          metricAverages: {
            select: {
              id: true,
            },
          },
        },
      },

      academicAreas: {
        select: {
          id: true,
          name: true,
        },
      },

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

    orderBy: {
      name: "asc",
    },
  });

  const foundCollegeIds = new Set(
    colleges.map((college) => college.id),
  );

  const missingCollegeIds =
    EXTRA_D1_COLLEGE_IDS.filter(
      (collegeId) =>
        !foundCollegeIds.has(collegeId),
    );

  console.log("");
  console.log("=".repeat(110));
  console.log(
    "EXTRA NCAA D1 DATABASE PROGRAM DIAGNOSTIC",
  );
  console.log("=".repeat(110));
  console.log(
    `Expected colleges: ${EXTRA_D1_COLLEGE_IDS.length}`,
  );
  console.log(
    `Found colleges:    ${colleges.length}`,
  );
  console.log(
    `Missing IDs:       ${missingCollegeIds.length}`,
  );

  if (missingCollegeIds.length > 0) {
    console.log("");
    console.log("College IDs not found:");
    console.log(missingCollegeIds);
  }

  const safeToRemove: Array<{
    collegeId: string;
    programId: string;
    name: string;
  }> = [];

  const needsReview: Array<{
    collegeId: string;
    programId: string | null;
    name: string;
    reasons: string[];
  }> = [];

  for (const college of colleges) {
    const program = college.baseballProgram;

    const relationCounts = {
      linkedCollegeUsers:
        college._count.coaches,
      coachInvites:
        college._count.coachInvites,
      coachJoinRequests:
        college._count.coachJoinRequests,
      joinLinks:
        college._count.joinLinks,
      coachNotes:
        college._count.coachNotes,
      coachPlayerRatings:
        college._count.coachPlayerRatings,
      programVerificationSubmissions:
        college._count
          .programVerificationSubmissions,
      profileViewEvents:
        college._count.profileViewEvents,
      recruitingBoardEntries:
        college._count.recruitingBoardEntries,
      recruitingLists:
        college._count.recruitingLists,
      savedByPlayers:
        college._count.savedByPlayers,
      programCoaches:
        program?.coaches.length ?? 0,
      rosterNeeds:
        program?.rosterNeeds.length ?? 0,
      metricAverages:
        program?.metricAverages.length ?? 0,
    };

    const singletonRelations = {
      academicProfile:
        Boolean(college.academicProfile),
      admissionsProfile:
        Boolean(college.admissionsProfile),
      financialProfile:
        Boolean(college.financialProfile),
      campusProfile:
        Boolean(college.campusProfile),
      nilProfile:
        Boolean(college.nilProfile),
    };

    const reviewReasons: string[] = [];

    if (!program) {
      reviewReasons.push(
        "No baseball program record found.",
      );
    }

    if (hasPositiveCount(relationCounts)) {
      reviewReasons.push(
        "Related baseball, recruiting, coach, or user records exist.",
      );
    }

    console.log("");
    console.log(college.name);
    console.log("-".repeat(110));

    console.dir(
      {
        collegeId: college.id,
        programId: program?.id ?? null,
        slug: college.slug,
        city: college.city,
        state: college.state,

        collegeDivision:
          college.division,
        collegeConference:
          college.conference,

        programDivision:
          program?.division ?? null,
        programConference:
          program?.conference ?? null,

        websiteUrl:
          college.websiteUrl,
        baseballWebsiteUrl:
          program?.baseballWebsiteUrl ?? null,
        rosterUrl:
          program?.rosterUrl ?? null,
        scheduleUrl:
          program?.scheduleUrl ?? null,
        questionnaireUrl:
          program?.questionnaireUrl ?? null,

        verificationStatus:
          college.verificationStatus,
        lastVerifiedAt:
          college.lastVerifiedAt,

        academicAreas:
          college.academicAreas.map(
            (area) => area.name,
          ),

        singletonRelations,
        relationCounts,

        coaches:
          program?.coaches.map(
            (coach) => ({
              id: coach.id,
              name: coach.name,
              title: coach.title,
              email: coach.email,
            }),
          ) ?? [],

        classification:
          reviewReasons.length === 0
            ? "SAFE_TO_REMOVE_PROGRAM"
            : "NEEDS_REVIEW",

        reviewReasons,
      },
      {
        depth: null,
        colors: true,
      },
    );

    if (
      reviewReasons.length === 0 &&
      program
    ) {
      safeToRemove.push({
        collegeId: college.id,
        programId: program.id,
        name: college.name,
      });
    } else {
      needsReview.push({
        collegeId: college.id,
        programId: program?.id ?? null,
        name: college.name,
        reasons: reviewReasons,
      });
    }
  }

  console.log("");
  console.log("=".repeat(110));
  console.log("SUMMARY");
  console.log("=".repeat(110));

  console.log("");
  console.log(
    `Safe to remove program: ${safeToRemove.length}`,
  );

  console.table(safeToRemove);

  console.log("");
  console.log(
    `Needs review: ${needsReview.length}`,
  );

  if (needsReview.length > 0) {
    console.dir(needsReview, {
      depth: null,
      colors: true,
    });
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
      "Extra NCAA D1 diagnostic failed.",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });