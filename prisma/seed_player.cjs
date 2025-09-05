// prisma/seed_player.cjs
const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // CHANGE THESE IF YOU WANT TO SEED A DIFFERENT PERSON
  const email = "matt.b.little@gmail.com";
  const name  = "Matt Little";
  const slug  = "matt-little"; // must be unique

  // 1) Ensure a User exists (create if missing)
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      // keep existing values, but make sure slug stays set
      slug,
      name,
      role: "Coach", // your User.role is a String in schema
    },
    create: {
      email,
      name,
      role: "Coach",
      slug,
      phonePrivate: true,
    },
    select: { id: true, email: true, name: true, slug: true },
  });

  // 2) Upsert a Player linked to that user
  const player = await prisma.player.upsert({
    where: { userId: user.id },
    update: {
      // add updates here if you re-run the seed
    },
    create: {
      userId: user.id,
      gradYear: 2026,
      primaryPos: "SS",
      secondaryPos: "2B",
      throws: "R",
      bats: "R",
      heightFt: 6,   // feet
      heightIn: 1,   // inches remainder (0–11)
      weightLb: 185,
      hsName: "Example High School",
      travelTeam: "Example Travel",
      hometown: "Raleigh",
      state: "NC",
      gpa: new Prisma.Decimal(3.45),
      plan: "REDSHIRT", // must match enum Plan
    },
    select: {
      id: true,
      userId: true,
      gradYear: true,
      primaryPos: true,
      secondaryPos: true,
      heightFt: true,
      heightIn: true,
      weightLb: true,
      gpa: true,
      plan: true,
      user: { select: { email: true, name: true, slug: true } },
    },
  });

  console.log("User upserted:", user);
  console.log("Player upserted:", player);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
