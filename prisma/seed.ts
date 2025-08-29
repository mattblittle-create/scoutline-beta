import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Upsert ensures you don't create duplicates if you re-run the seed
  const coach = await prisma.coach.upsert({
    where: { slug: "matt-little" },
    update: {}, // leave empty to keep existing values if already seeded
    create: {
      slug: "matt-little",
      name: "Matt Little",
      email: "matt.b.little@gmail.com",
      role: "Head Coach",
      collegeProgram: "The Battery Training Academy",
      workPhone: "555-555-5555",
      phonePrivate: true,
    },
  });

  console.log("✅ Seeded coach:", coach);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
