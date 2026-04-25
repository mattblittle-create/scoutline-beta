import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedCollege = {
  name: string;
  slug: string;
  websiteUrl?: string;
  admissionsUrl?: string;
  city?: string;
  state: string;
  region?: "NORTHEAST" | "MID_ATLANTIC" | "SOUTHEAST" | "MIDWEST" | "SOUTHWEST" | "WEST" | "PACIFIC";
  control?: "PUBLIC" | "PRIVATE";

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
];

async function main() {
  for (const item of colleges) {
    const college = await prisma.college.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        websiteUrl: item.websiteUrl,
        admissionsUrl: item.admissionsUrl,
        city: item.city,
        state: item.state,
        region: item.region,
        control: item.control,
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