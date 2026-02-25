const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.coachProfile.updateMany({
    where: {
      user: { collegeId: { not: null } },
    },
    data: {
      coachAccountType: "COLLEGE_COACH",
      coachBillingStatus: "NONE",
    },
  });

  console.log(`✅ Updated CoachProfile rows to COLLEGE_COACH: ${res.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
