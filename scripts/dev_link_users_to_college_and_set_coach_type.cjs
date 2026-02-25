const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Use the slug created above
  const college = await prisma.college.findUnique({ where: { slug: "dev-college" } });
  if (!college) throw new Error("College not found. Run dev_create_college.cjs first.");

  const emails = ["matt.b.little@gmail.com", "batterytrainingacademy@gmail.com"];

  const resUsers = await prisma.user.updateMany({
    where: { email: { in: emails } },
    data: { collegeId: college.id },
  });

  console.log(`✅ Linked users to college (${college.name}): ${resUsers.count}`);

  const resCoachProfiles = await prisma.coachProfile.updateMany({
    where: { user: { email: { in: emails } } },
    data: { coachAccountType: "COLLEGE_COACH", coachBillingStatus: "NONE" },
  });

  console.log(`✅ Updated coach profiles to COLLEGE_COACH: ${resCoachProfiles.count}`);

  const check = await prisma.coachProfile.findMany({
    where: { user: { email: { in: emails } } },
    include: { user: { select: { email: true, collegeId: true } } },
  });

  console.log("=== Verification ===");
  for (const row of check) {
    console.log({
      email: row.user.email,
      collegeId: row.user.collegeId,
      coachAccountType: row.coachAccountType,
      coachBillingStatus: row.coachBillingStatus,
    });
  }
}

main()
  .catch((e) => {
    console.error("❌ link users failed:", e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
