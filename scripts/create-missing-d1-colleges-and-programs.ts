// scripts/create-missing-d1-colleges-and-programs.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

type MissingD1School = {
  ncaaSchool: string;
  name: string;
  slug: string;
  city: string;
  state: string;
};

const MISSING_D1_SCHOOLS: MissingD1School[] = [
  {
    ncaaSchool: "UC Santa Barbara",
    name: "University of California, Santa Barbara",
    slug: "university-of-california-santa-barbara",
    city: "Santa Barbara",
    state: "CA",
  },
  {
    ncaaSchool: "Cal Poly",
    name: "California Polytechnic State University",
    slug: "california-polytechnic-state-university",
    city: "San Luis Obispo",
    state: "CA",
  },
  {
    ncaaSchool: "UC San Diego",
    name: "University of California, San Diego",
    slug: "university-of-california-san-diego",
    city: "La Jolla",
    state: "CA",
  },
  {
    ncaaSchool: "Sacramento St.",
    name: "California State University, Sacramento",
    slug: "california-state-university-sacramento",
    city: "Sacramento",
    state: "CA",
  },
  {
    ncaaSchool: "SIUE",
    name: "Southern Illinois University Edwardsville",
    slug: "southern-illinois-university-edwardsville",
    city: "Edwardsville",
    state: "IL",
  },
  {
    ncaaSchool: "Cal St. Fullerton",
    name: "California State University, Fullerton",
    slug: "california-state-university-fullerton",
    city: "Fullerton",
    state: "CA",
  },
  {
    ncaaSchool: "Binghamton",
    name: "Binghamton University",
    slug: "binghamton-university",
    city: "Vestal",
    state: "NY",
  },
  {
    ncaaSchool: "UC Irvine",
    name: "University of California, Irvine",
    slug: "university-of-california-irvine",
    city: "Irvine",
    state: "CA",
  },
  {
    ncaaSchool: "Hawaii",
    name: "University of Hawaii at Manoa",
    slug: "university-of-hawaii-at-manoa",
    city: "Honolulu",
    state: "HI",
  },
  {
    ncaaSchool: "Hofstra",
    name: "Hofstra University",
    slug: "hofstra-university",
    city: "Hempstead",
    state: "NY",
  },
  {
    ncaaSchool: "Maine",
    name: "University of Maine",
    slug: "university-of-maine",
    city: "Orono",
    state: "ME",
  },
  {
    ncaaSchool: "UC Davis",
    name: "University of California, Davis",
    slug: "university-of-california-davis",
    city: "Davis",
    state: "CA",
  },
  {
    ncaaSchool: "Lipscomb",
    name: "Lipscomb University",
    slug: "lipscomb-university",
    city: "Nashville",
    state: "TN",
  },
  {
    ncaaSchool: "Oral Roberts",
    name: "Oral Roberts University",
    slug: "oral-roberts-university",
    city: "Tulsa",
    state: "OK",
  },
  {
    ncaaSchool: "Lindenwood",
    name: "Lindenwood University",
    slug: "lindenwood-university",
    city: "St. Charles",
    state: "MO",
  },
  {
    ncaaSchool: "Bryant",
    name: "Bryant University",
    slug: "bryant-university",
    city: "Smithfield",
    state: "RI",
  },
  {
    ncaaSchool: "CSUN",
    name: "California State University, Northridge",
    slug: "california-state-university-northridge",
    city: "Northridge",
    state: "CA",
  },
  {
    ncaaSchool: "UMBC",
    name: "University of Maryland, Baltimore County",
    slug: "university-of-maryland-baltimore-county",
    city: "Baltimore",
    state: "MD",
  },
  {
    ncaaSchool: "UMass Lowell",
    name: "University of Massachusetts Lowell",
    slug: "university-of-massachusetts-lowell",
    city: "Lowell",
    state: "MA",
  },
  {
    ncaaSchool: "CSU Bakersfield",
    name: "California State University, Bakersfield",
    slug: "california-state-university-bakersfield",
    city: "Bakersfield",
    state: "CA",
  },
  {
    ncaaSchool: "South Dakota St.",
    name: "South Dakota State University",
    slug: "south-dakota-state-university",
    city: "Brookings",
    state: "SD",
  },
  {
    ncaaSchool: "Delaware",
    name: "University of Delaware",
    slug: "university-of-delaware",
    city: "Newark",
    state: "DE",
  },
  {
    ncaaSchool: "Long Beach St.",
    name: "California State University, Long Beach",
    slug: "california-state-university-long-beach",
    city: "Long Beach",
    state: "CA",
  },
  {
    ncaaSchool: "Omaha",
    name: "University of Nebraska Omaha",
    slug: "university-of-nebraska-omaha",
    city: "Omaha",
    state: "NE",
  },
  {
    ncaaSchool: "Iona",
    name: "Iona University",
    slug: "iona-university",
    city: "New Rochelle",
    state: "NY",
  },
  {
    ncaaSchool: "La Salle",
    name: "La Salle University",
    slug: "la-salle-university",
    city: "Philadelphia",
    state: "PA",
  },
  {
    ncaaSchool: "UC Riverside",
    name: "University of California, Riverside",
    slug: "university-of-california-riverside",
    city: "Riverside",
    state: "CA",
  },
  {
    ncaaSchool: "UAlbany",
    name: "University at Albany, SUNY",
    slug: "university-at-albany-suny",
    city: "Albany",
    state: "NY",
  },
  {
    ncaaSchool: "North Dakota St.",
    name: "North Dakota State University",
    slug: "north-dakota-state-university",
    city: "Fargo",
    state: "ND",
  },
  {
    ncaaSchool: "St. Bonaventure",
    name: "St. Bonaventure University",
    slug: "st-bonaventure-university",
    city: "St. Bonaventure",
    state: "NY",
  },
  {
    ncaaSchool: "NJIT",
    name: "New Jersey Institute of Technology",
    slug: "new-jersey-institute-of-technology",
    city: "Newark",
    state: "NJ",
  },
  {
    ncaaSchool: "St. Thomas (MN)",
    name: "University of St. Thomas",
    slug: "university-of-st-thomas-minnesota",
    city: "St. Paul",
    state: "MN",
  },
  {
    ncaaSchool: "Northern Colo.",
    name: "University of Northern Colorado",
    slug: "university-of-northern-colorado",
    city: "Greeley",
    state: "CO",
  },
  {
    ncaaSchool: "Mercyhurst",
    name: "Mercyhurst University",
    slug: "mercyhurst-university",
    city: "Erie",
    state: "PA",
  },
  {
    ncaaSchool: "New Haven",
    name: "University of New Haven",
    slug: "university-of-new-haven",
    city: "West Haven",
    state: "CT",
  },
  {
    ncaaSchool: "Coppin St.",
    name: "Coppin State University",
    slug: "coppin-state-university",
    city: "Baltimore",
    state: "MD",
  },
];

function normalizeSchoolName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function validateInventory(): Promise<void> {
  if (MISSING_D1_SCHOOLS.length !== 36) {
    throw new Error(
      `Expected 36 missing schools, found ${MISSING_D1_SCHOOLS.length}.`,
    );
  }

  const duplicateNcaaNames = MISSING_D1_SCHOOLS.filter(
    (school, index, schools) =>
      schools.findIndex(
        (candidate) =>
          candidate.ncaaSchool === school.ncaaSchool,
      ) !== index,
  );

  if (duplicateNcaaNames.length > 0) {
    throw new Error(
      `Duplicate NCAA names in seed data: ${duplicateNcaaNames
        .map((school) => school.ncaaSchool)
        .join(", ")}`,
    );
  }

  const duplicateSlugs = MISSING_D1_SCHOOLS.filter(
    (school, index, schools) =>
      schools.findIndex(
        (candidate) => candidate.slug === school.slug,
      ) !== index,
  );

  if (duplicateSlugs.length > 0) {
    throw new Error(
      `Duplicate slugs in seed data: ${duplicateSlugs
        .map((school) => school.slug)
        .join(", ")}`,
    );
  }
}

async function inspectExistingRecords(): Promise<void> {
  const existingColleges = await prisma.college.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      state: true,
      baseballProgram: {
        select: {
          id: true,
          division: true,
        },
      },
    },
  });

  const collisions: Array<{
    seedSchool: MissingD1School;
    existingCollegeId: string;
    existingName: string;
    existingSlug: string;
    existingProgramId: string | null;
    existingProgramDivision: string | null;
    reason: string;
  }> = [];

  for (const school of MISSING_D1_SCHOOLS) {
    const normalizedSeedName = normalizeSchoolName(
      school.name,
    );

    for (const college of existingColleges) {
      const sameSlug = college.slug === school.slug;
      const sameNormalizedName =
        normalizeSchoolName(college.name) ===
        normalizedSeedName;

      if (!sameSlug && !sameNormalizedName) {
        continue;
      }

      collisions.push({
        seedSchool: school,
        existingCollegeId: college.id,
        existingName: college.name,
        existingSlug: college.slug,
        existingProgramId:
          college.baseballProgram?.id ?? null,
        existingProgramDivision:
          college.baseballProgram?.division ?? null,
        reason: sameSlug
          ? "SLUG_COLLISION"
          : "NORMALIZED_NAME_COLLISION",
      });
    }
  }

  if (collisions.length > 0) {
    console.log("");
    console.log("COLLISIONS");
    console.log("-".repeat(100));

    for (const collision of collisions) {
      console.dir(collision, {
        depth: null,
        colors: true,
      });
    }

    throw new Error(
      `Refusing to continue: ${collisions.length} existing college collision(s) found.`,
    );
  }
}

async function main(): Promise<void> {
  console.log("");
  console.log("=".repeat(100));
  console.log(
    "CREATE MISSING NCAA D1 COLLEGES AND BASEBALL PROGRAMS",
  );
  console.log("=".repeat(100));
  console.log(
    `Mode: ${APPLY ? "APPLY" : "DRY RUN"}`,
  );
  console.log("");

  await validateInventory();
  await inspectExistingRecords();

  for (const school of MISSING_D1_SCHOOLS) {
    console.log({
      action: "CREATE_COLLEGE_AND_PROGRAM",
      ncaaSchool: school.ncaaSchool,
      collegeName: school.name,
      collegeSlug: school.slug,
      city: school.city,
      state: school.state,
      collegeDivision: "NCAA_D1",
      programDivision: "NCAA_D1",
    });
  }

  if (!APPLY) {
    console.log("");
    console.log(
      `Dry run passed. ${MISSING_D1_SCHOOLS.length} colleges and programs are ready to be created.`,
    );
    console.log(
      "No ScoutLine database records were created, updated, or deleted.",
    );
    return;
  }

  const createdRecords =
    await prisma.$transaction(async (tx) => {
      const results: Array<{
        collegeId: string;
        collegeName: string;
        collegeSlug: string;
        programId: string;
      }> = [];

      for (const school of MISSING_D1_SCHOOLS) {
        const college = await tx.college.create({
          data: {
            name: school.name,
            slug: school.slug,
            city: school.city,
            state: school.state,

            /**
             * This is the legacy string division field on College.
             * The canonical typed division lives on
             * CollegeBaseballProgram.
             */
            division: "NCAA_D1",

            baseballProgram: {
              create: {
                division: "NCAA_D1",
              },
            },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            baseballProgram: {
              select: {
                id: true,
              },
            },
          },
        });

        if (!college.baseballProgram) {
          throw new Error(
            `Baseball program was not created for ${school.name}.`,
          );
        }

        results.push({
          collegeId: college.id,
          collegeName: college.name,
          collegeSlug: college.slug,
          programId: college.baseballProgram.id,
        });

        console.log(
          `Created: ${college.name} (${college.baseballProgram.id})`,
        );
      }

      return results;
    });

  console.log("");
  console.log(
    `Created colleges: ${createdRecords.length}`,
  );
  console.log(
    `Created baseball programs: ${createdRecords.length}`,
  );
  console.log("");
  console.log(
    "Missing NCAA D1 inventory creation completed.",
  );
}

main()
  .catch((error: unknown) => {
    console.error("");
    console.error(
      "Missing NCAA D1 creation failed.",
    );

    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });