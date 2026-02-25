const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Change these to whatever college you want for dev testing.
  const name = "Dev College";
  const slug = "dev-college";

  const college = await prisma.college.upsert({
    where: { slug },
    update: {
      name,
      division: "NCAA D1",
      conference: "DEV",
      city: "Charlotte",
      state: "NC",
    },
    create: {
      name,
      slug,
      division: "NCAA D1",
      conference: "DEV",
      city: "Charlotte",
      state: "NC",
    },
  });

  console.log("✅ College ready:", college);
}

main()
  .catch((e) => {
    console.error("❌ create college failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
