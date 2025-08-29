import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Adjust these to whatever you want live
  const email = "matt.b.little@gmail.com";
  const slug = "matt-little";

  const coach = await prisma.user.upsert({
    where: { email },
    update: {
      slug,
      name: "Matt Little",
      role: "Head Coach",
      program: "Your College Baseball",
      // Optional fields if they exist in your schema:
      // photoUrl: "https://…",
      // workPhone: "(555) 555-5555",
      phonePrivate: true,
    },
    create: {
      email,
      slug,
      name: "Matt Little",
      role: "Head Coach",
      program: "Your College Baseball",
      // photoUrl: "https://…",
      // workPhone: "(555) 555-5555",
      phonePrivate: true,
    },
  });

  console.log("Seeded user:", coach.email, "→ /coach/" + coach.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
