const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { collegeId: { not: null } },
        {
          teamMemberships: {
            some: {
              role: { in: ["COACH", "TEAM_ADMIN", "RECRUITING_COACH"] },
            },
          },
        },
      ],
    },
    include: { coachProfile: true },
  });

  let created = 0;

  for (const u of users) {
    if (u.coachProfile) continue;

    await prisma.coachProfile.create({
      data: {
        userId: u.id,
        coachAccountType: u.collegeId ? "COLLEGE_COACH" : "OTHER",
        coachBillingStatus: "NONE",
      },
    });

    created++;
  }

  console.log(`✅ Backfill complete. Created CoachProfile rows: ${created}`);
}

main()
  .catch((e) => {
    console.error("❌ Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
