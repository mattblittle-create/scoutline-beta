// prisma/seed_player.ts
import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const email = "matt.b.little@gmail.com"; // change if needed

  // 1) Look up existing User (we created this earlier)
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, slug: true, name: true, email: true },
  });

  if (!user) {
    throw new Error(`No User found for email ${email}. Create the user first.`);
  }

  // 2) Upsert Player linked to that User
  const player = await prisma.player.upsert({
    where: { userId: user.id },
    update: {
      // update anything here next time you run the seed
      gradYear: 2026,
      primaryPos: "SS",
      secondaryPos: "2B",
      throws: "R",
      bats: "R",
      heightFt: 6,  // feet component
      heightIn: 1,  // inches remainder (0–11)
      weightLb: 185,
      hsName: "Example High School",
      travelTeam: "Example Travel",
      hometown: "Raleigh",
      state: "NC",
      gpa: new Prisma.Decimal(3.45),
      plan: "REDSHIRT",
    },
    create: {
      userId: user.id,
      gradYear: 2026,
      primaryPos: "SS",
      secondaryPos: "2B",
      throws: "R",
      bats: "R",
      heightFt: 6,
      heightIn: 1,
      weightLb: 185,
      hsName: "Example High School",
      travelTeam: "Example Travel",
      hometown: "Raleigh",
      state: "NC",
      gpa: new Prisma.Decimal(3.45),
      plan: "REDSHIRT",
    },
    select: {
      id: true,
      userId: true,
      gradYear: true,
      primaryPos: true,
      secondaryPos: true,
      throws: true,
      bats: true,
      heightFt: true,
      heightIn: true,
      weightLb: true,
      plan: true,
      user: { select: { email: true, name: true, slug: true } },
    },
  });

  console.log("Seeded Player:", player);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
