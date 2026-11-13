// scripts/remove-invalid-d1-programs.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

const FRESNO_DUPLICATE = {
  collegeId: "cmou7y6to00iiqtoccnzql78p",
  programId: "cmou7y6ud00ikqtoccagchujp",
  name: "California State University Fresno",
} as const;

const CANONICAL_FRESNO = {
  collegeId: "cmou3xrg1006uqt5s90fq7wbv",
  programId: "cmou3xrgo006wqt5sawcj9olu",
  name: "Fresno State",
} as const;

const INVALID_PROGRAMS = [
  {
    collegeId: "cmou3xrc4006oqt5s6xbcss6r",
    programId: "cmou3xrdd006qqt5sc7anpsi2",
    name: "Boise State University",
  },
  {
    collegeId: "cmou3xres006rqt5sroo5bttq",
    programId: "cmou3xrff006tqt5spdnjoc3d",
    name: "Colorado State University",
  },
  {
    collegeId: "cmou87s0o00llqt8obrn2et5p",
    programId: "cmou87s1f00lnqt8og9kmz6ie",
    name: "East Texas A&M University",
  },
  {
    collegeId: "cmosun0gl005iqtlg3rsb1jga",
    programId: "cmosun0h8005kqtlgzn9zgzov",
    name: "Iowa State University",
  },
  {
    collegeId: "cmou6ba6o00aoqticyii4x4fl",
    programId: "cmou6ba7d00aqqticpdxjqz8q",
    name: "Marquette University",
  },
  {
    collegeId: "cmou7v17l00gxqtfg0hn9bpcu",
    programId: "cmou7v18e00gzqtfgii9a1tv8",
    name: "North Carolina Central University",
  },
  {
    collegeId: "cmou7zwi600jiqt182wps2oyk",
    programId: "cmou7zwix00jkqt18iaqsgumz",
    name: "Saint Francis University",
  },
  {
    collegeId: "cmou7v19400h0qtfgytxc7nrk",
    programId: "cmou7v19v00h2qtfg67xwvlf3",
    name: "South Carolina State University",
  },
  {
    collegeId: "cmou8ctpc00o0qtlou8fzrbpg",
    programId: "cmou8ctq200o2qtlol6t2tipq",
    name: "Southern Utah University",
  },
  {
    collegeId: "cmossgres0013qti43q75sz9x",
    programId: "cmossgrfi0015qti4tqm0lti8",
    name: "Syracuse University",
  },
  {
    collegeId: "cmou57egv0083qtdw0yqps6gp",
    programId: "cmou57eix0085qtdwfpxjlw9q",
    name: "Temple University",
  },
  {
    collegeId: "cmosun0fb005fqtlg6yhcnwdm",
    programId: "cmosun0fy005hqtlg6guheyu1",
    name: "University of Colorado Boulder",
  },
  {
    collegeId: "cmou7wkjz00hoqt5slulm7vp1",
    programId: "cmou7wkkq00hqqt5swjrwwqte",
    name: "University of Northern Iowa",
  },
  {
    collegeId: "cmou74gen00diqtbopd0cv1gz",
    programId: "cmou74gfe00dkqtboi4lonlfq",
    name: "University of Texas at El Paso",
  },
  {
    collegeId: "cmoss3uty003rqtao20hszq6b",
    programId: "cmoss3uul003tqtaotddkfhet",
    name: "University of Wisconsin",
  },
  {
    collegeId: "cmou7y70i00ixqtocvqf5dc9l",
    programId: "cmou7y71600izqtoch8lbz79k",
    name: "University of Wyoming",
  },
  {
    collegeId: "cmou3xrmc0079qt5sgo4w6bdl",
    programId: "cmou3xrmy007bqt5sdj6v1ac2",
    name: "Utah State University",
  },
] as const;

type ProgramRelationCounts = {
  coaches: number;
  rosterNeeds: number;
  metricAverages: number;
};

function hasRelatedProgramData(
  counts: ProgramRelationCounts,
): boolean {
  return Object.values(counts).some(
    (count) => count > 0,
  );
}

async function loadProgram(
  collegeId: string,
  programId: string,
) {
  return prisma.collegeBaseballProgram.findFirst({
    where: {
      id: programId,
      collegeId,
    },
    include: {
      college: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          coaches: true,
          rosterNeeds: true,
          metricAverages: true,
        },
      },
    },
  });
}

async function validateInvalidPrograms(): Promise<void> {
  for (const expected of INVALID_PROGRAMS) {
    const program = await loadProgram(
      expected.collegeId,
      expected.programId,
    );

    if (!program) {
      throw new Error(
        `Expected program not found: ${expected.name}`,
      );
    }

    if (program.college.name !== expected.name) {
      throw new Error(
        `College name mismatch for ${expected.name}: found ${program.college.name}`,
      );
    }

    if (program.division !== "NCAA_D1") {
      throw new Error(
        `${expected.name} is no longer marked NCAA_D1. Found: ${program.division}`,
      );
    }

    if (hasRelatedProgramData(program._count)) {
      throw new Error(
        `Refusing to remove ${expected.name}: related program data exists.`,
      );
    }

    console.log({
      action: "REMOVE_BASEBALL_PROGRAM_ONLY",
      collegeId: expected.collegeId,
      programId: expected.programId,
      collegeName: program.college.name,
      collegeSlug: program.college.slug,
      division: program.division,
      conference: program.conference,
      relationCounts: program._count,
    });
  }
}

async function validateFresnoDuplicate(): Promise<void> {
  const canonical = await loadProgram(
    CANONICAL_FRESNO.collegeId,
    CANONICAL_FRESNO.programId,
  );

  if (!canonical) {
    throw new Error(
      "Canonical Fresno State program was not found.",
    );
  }

  if (
    canonical.college.name !==
    CANONICAL_FRESNO.name
  ) {
    throw new Error(
      `Canonical Fresno name mismatch: ${canonical.college.name}`,
    );
  }

  const duplicate =
    await prisma.college.findUnique({
      where: {
        id: FRESNO_DUPLICATE.collegeId,
      },
      include: {
        baseballProgram: {
          include: {
            _count: {
              select: {
                coaches: true,
                rosterNeeds: true,
                metricAverages: true,
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
          select: { id: true },
        },
        admissionsProfile: {
          select: { id: true },
        },
        financialProfile: {
          select: { id: true },
        },
        campusProfile: {
          select: { id: true },
        },
        nilProfile: {
          select: { id: true },
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
    });

  if (!duplicate) {
    throw new Error(
      "Duplicate California State University Fresno college was not found.",
    );
  }

  if (
    duplicate.name !== FRESNO_DUPLICATE.name
  ) {
    throw new Error(
      `Duplicate Fresno name mismatch: ${duplicate.name}`,
    );
  }

  if (
    duplicate.baseballProgram?.id !==
    FRESNO_DUPLICATE.programId
  ) {
    throw new Error(
      "Duplicate Fresno program ID does not match the expected record.",
    );
  }

  const {
    academicAreas,
    ...nonAcademicCounts
  } = {
    academicAreas:
      duplicate.academicAreas.length,
    ...duplicate._count,
  };

  const hasNonAcademicRelations =
    Object.values(nonAcademicCounts).some(
      (count) => count > 0,
    );

  const hasSingletonRelations = Boolean(
    duplicate.academicProfile ||
      duplicate.admissionsProfile ||
      duplicate.financialProfile ||
      duplicate.campusProfile ||
      duplicate.nilProfile,
  );

  const programCounts =
    duplicate.baseballProgram._count;

  if (
    hasNonAcademicRelations ||
    hasSingletonRelations ||
    hasRelatedProgramData(programCounts)
  ) {
    throw new Error(
      "Refusing to remove duplicate Fresno record: related data exists.",
    );
  }

  console.log({
    action:
      "REMOVE_DUPLICATE_COLLEGE_AND_PROGRAM",
    duplicateCollegeId:
      duplicate.id,
    duplicateProgramId:
      duplicate.baseballProgram.id,
    duplicateName:
      duplicate.name,
    academicAreas,
    nonAcademicCounts,
    programCounts,
    canonicalCollegeId:
      canonical.college.id,
    canonicalProgramId:
      canonical.id,
    canonicalName:
      canonical.college.name,
  });
}

async function main(): Promise<void> {
  console.log("");
  console.log("=".repeat(100));
  console.log(
    "INVALID NCAA D1 BASEBALL PROGRAM CLEANUP",
  );
  console.log("=".repeat(100));
  console.log(
    `Mode: ${APPLY ? "APPLY" : "DRY RUN"}`,
  );
  console.log("");

  await validateFresnoDuplicate();
  await validateInvalidPrograms();

  if (!APPLY) {
    console.log("");
    console.log(
      "Dry run passed. No records were changed.",
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const program of INVALID_PROGRAMS) {
      await tx.collegeBaseballProgram.delete({
        where: {
          id: program.programId,
        },
      });

      console.log(
        `Removed invalid baseball program: ${program.name}`,
      );
    }

    await tx.collegeBaseballProgram.delete({
      where: {
        id: FRESNO_DUPLICATE.programId,
      },
    });

    await tx.college.delete({
      where: {
        id: FRESNO_DUPLICATE.collegeId,
      },
    });

    console.log(
      `Removed duplicate college and program: ${FRESNO_DUPLICATE.name}`,
    );
  });

  console.log("");
  console.log(
    "Invalid NCAA D1 baseball program cleanup completed.",
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "Invalid NCAA D1 cleanup failed.",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });