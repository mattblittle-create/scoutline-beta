const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const colleges = await prisma.college.findMany({
    select: { id: true, name: true, slug: true, division: true, conference: true },
    orderBy: { name: "asc" },
  });

  console.log("=== Colleges ===");
  for (const c of colleges) console.log(c);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => prisma.$disconnect());
