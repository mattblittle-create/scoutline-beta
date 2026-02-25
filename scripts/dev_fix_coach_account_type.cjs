const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // 1) Show coach profiles and whether their user has a collegeId
  const rows = await prisma.coachProfile.findMany({
    include: {
      user: {
        select: { id: true, email: true, collegeId: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("=== CoachProfile rows (before) ===");
  for (const r of rows) {
    console.log({
      coachProfileId: r.id,
      userEmail: r.user?.email,
      userCollegeId: r.user?.collegeId,
      coachAccountType: r.coachAccountType,
      coachBillingStatus: r.coachBillingStatus,
    });
  }

  // 2) Update any coach profiles whose user has a collegeId
  const updated = await prisma.coachProfile.updateMany({
    where: { user: { collegeId: { not: null } } },
    data: { coachAccountType: "COLLEGE_COACH", coachBillingStatus: "NONE" },
  });

  console.log(`✅ Updated to COLLEGE_COACH (where user.collegeId != null): ${updated.count}`);

  // 3) Show after
  const rowsAfter = await prisma.coachProfile.findMany({
    include: {
      user: { select: { email: true, collegeId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("=== CoachProfile rows (after) ===");
  for (const r of rowsAfter) {
    console.log({
      coachProfileId: r.id,
      userEmail: r.user?.email,
      userCollegeId: r.user?.collegeId,
      coachAccountType: r.coachAccountType,
      coachBillingStatus: r.coachBillingStatus,
    });
  }
}

main()
  .catch((e) => {
    console.error("❌ Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
