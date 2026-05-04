// scripts/seed-college.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedCollege = {
  name: string;
  slug: string;
  websiteUrl?: string;
  admissionsUrl?: string;
  academicsUrl?: string;
  majorsUrl?: string;
  applicationUrl?: string;
  financialAidUrl?: string;
  city?: string;
  state: string;
  region?: "NORTHEAST" | "MID_ATLANTIC" | "SOUTHEAST" | "MIDWEST" | "SOUTHWEST" | "WEST" | "PACIFIC";
  control?: "PUBLIC" | "PRIVATE";
  schoolType?: "FOUR_YEAR" | "TWO_YEAR" | "COMMUNITY_COLLEGE" | "JUNIOR_COLLEGE" | "OTHER";
  tuitionInState?: number;
  tuitionOutOfState?: number;
  tuitionInternational?: number;
  tuitionYear?: number;

  baseball?: {
    nickname?: string;
    baseballWebsiteUrl?: string;
    division?: "NCAA_D1" | "NCAA_D2" | "NCAA_D3" | "NAIA" | "NJCAA_D1" | "NJCAA_D2" | "NJCAA_D3" | "OTHER";
    conference?: string;
    rosterUrl?: string;
    questionnaireUrl?: string;
  };
};

const colleges: SeedCollege[] = [
  {
    name: "University of South Carolina",
    slug: "university-of-south-carolina",
    websiteUrl: "https://www.sc.edu",
    admissionsUrl: "https://sc.edu/about/offices_and_divisions/undergraduate_admissions/",
    city: "Columbia",
    state: "SC",
    region: "SOUTHEAST",
    control: "PUBLIC",
    baseball: {
      nickname: "Gamecocks",
      baseballWebsiteUrl: "https://gamecocksonline.com/sports/baseball/",
      division: "NCAA_D1",
      conference: "SEC",
    },
  },
    {
    name: "Clemson University",
    slug: "clemson-university",
    websiteUrl: "https://www.clemson.edu",
    admissionsUrl: "https://www.clemson.edu/admissions/",
    city: "Clemson",
    state: "SC",
    region: "SOUTHEAST",
    control: "PUBLIC",
    schoolType: "FOUR_YEAR",
    baseball: {
      nickname: "Tigers",
      baseballWebsiteUrl: "https://clemsontigers.com/sports/baseball/",
      division: "NCAA_D1",
      conference: "ACC",
    },
  },
  {
    name: "College of Charleston",
    slug: "college-of-charleston",
    websiteUrl: "https://www.charleston.edu",
    admissionsUrl: "https://www.charleston.edu/admission/",
    city: "Charleston",
    state: "SC",
    region: "SOUTHEAST",
    control: "PUBLIC",
    schoolType: "FOUR_YEAR",
    baseball: {
      nickname: "Cougars",
      baseballWebsiteUrl: "https://cofcsports.com/sports/baseball",
      division: "NCAA_D1",
      conference: "CAA",
    },
  },
  {
    name: "Wofford College",
    slug: "wofford-college",
    websiteUrl: "https://www.wofford.edu",
    admissionsUrl: "https://www.wofford.edu/admission",
    city: "Spartanburg",
    state: "SC",
    region: "SOUTHEAST",
    control: "PRIVATE",
    schoolType: "FOUR_YEAR",
    baseball: {
      nickname: "Terriers",
      baseballWebsiteUrl: "https://woffordterriers.com/sports/baseball",
      division: "NCAA_D1",
      conference: "SoCon",
    },
  },
  {
    name: "Winthrop University",
    slug: "winthrop-university",
    websiteUrl: "https://www.winthrop.edu",
    admissionsUrl: "https://www.winthrop.edu/admissions/",
    city: "Rock Hill",
    state: "SC",
    region: "SOUTHEAST",
    control: "PUBLIC",
    schoolType: "FOUR_YEAR",
    baseball: {
      nickname: "Eagles",
      baseballWebsiteUrl: "https://winthropeagles.com/sports/baseball",
      division: "NCAA_D1",
      conference: "Big South",
    },
  },
  {
    name: "University of North Carolina at Chapel Hill",
    slug: "university-of-north-carolina-at-chapel-hill",
    websiteUrl: "https://www.unc.edu",
    admissionsUrl: "https://admissions.unc.edu",
    city: "Chapel Hill",
    state: "NC",
    region: "SOUTHEAST",
    control: "PUBLIC",
    schoolType: "FOUR_YEAR",
    baseball: {
      nickname: "Tar Heels",
      baseballWebsiteUrl: "https://goheels.com/sports/baseball",
      division: "NCAA_D1",
      conference: "ACC",
    },
  },
];

async function main() {
  for (const item of colleges) {
    const college = await prisma.college.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        websiteUrl: item.websiteUrl,
        admissionsUrl: item.admissionsUrl,
        academicsUrl: item.academicsUrl,
        majorsUrl: item.majorsUrl,
        applicationUrl: item.applicationUrl,
        financialAidUrl: item.financialAidUrl,
        city: item.city,
        state: item.state,
        region: item.region,
        control: item.control,
        schoolType: item.schoolType,
        tuitionInState: item.tuitionInState,
        tuitionOutOfState: item.tuitionOutOfState,
        tuitionInternational: item.tuitionInternational,
        tuitionYear: item.tuitionYear,
      },
      create: {
        name: item.name,
        slug: item.slug,
        websiteUrl: item.websiteUrl,
        admissionsUrl: item.admissionsUrl,
        city: item.city,
        state: item.state,
        region: item.region,
        control: item.control,
      },
    });

    if (item.baseball) {
      await prisma.collegeBaseballProgram.upsert({
        where: { collegeId: college.id },
        update: {
          nickname: item.baseball.nickname,
          baseballWebsiteUrl: item.baseball.baseballWebsiteUrl,
          division: item.baseball.division,
          conference: item.baseball.conference,
          rosterUrl: item.baseball.rosterUrl,
          questionnaireUrl: item.baseball.questionnaireUrl,
        },
        create: {
          collegeId: college.id,
          nickname: item.baseball.nickname,
          baseballWebsiteUrl: item.baseball.baseballWebsiteUrl,
          division: item.baseball.division,
          conference: item.baseball.conference,
          rosterUrl: item.baseball.rosterUrl,
          questionnaireUrl: item.baseball.questionnaireUrl,
        },
      });
    }

    console.log(`Seeded: ${item.name}`);
  }
}

main()
  .catch((err) => {
    console.error("SEED_COLLEGES_ERROR", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });