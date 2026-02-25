const { PrismaClient, ProfileState, OwnershipMode, Plan } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const players = [
    {
      email: "demo.player1@scoutline.dev",
      name: "Demo Player One",
      slug: "demo-player-one",
      gradYear: 2028,
      primaryPos: "SS",
      secondaryPos: "2B",
      bats: "R",
      throws: "R",
      hsName: "Demo High School",
      travelTeam: "Demo Travel",
      hometown: "Charlotte",
      state: "NC",
      gpa: 3.6,
      isCommitted: false,
      committedProgram: null,
      plan: Plan.REDSHIRT,
    },
    {
      email: "demo.player2@scoutline.dev",
      name: "Demo Player Two",
      slug: "demo-player-two",
      gradYear: 2027,
      primaryPos: "C",
      secondaryPos: "1B",
      bats: "L",
      throws: "R",
      hsName: "Demo Prep Academy",
      travelTeam: "Demo Elite",
      hometown: "Atlanta",
      state: "GA",
      gpa: 3.9,
      isCommitted: true,
      committedProgram: "Clemson University",
      plan: Plan.REDSHIRT,
    },
  ];

  for (const p of players) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: { name: p.name, slug: p.slug },
      create: { email: p.email, name: p.name, slug: p.slug },
      select: { id: true, email: true },
    });

    await prisma.player.upsert({
      where: { userId: user.id },
      update: {
        gradYear: p.gradYear,
        primaryPos: p.primaryPos,
        secondaryPos: p.secondaryPos,
        bats: p.bats,
        throws: p.throws,
        hsName: p.hsName,
        travelTeam: p.travelTeam,
        hometown: p.hometown,
        state: p.state,
        gpa: p.gpa,
        isCommitted: p.isCommitted,
        committedProgram: p.committedProgram,
        plan: p.plan,
      },
      create: {
        userId: user.id,
        gradYear: p.gradYear,
        primaryPos: p.primaryPos,
        secondaryPos: p.secondaryPos,
        bats: p.bats,
        throws: p.throws,
        hsName: p.hsName,
        travelTeam: p.travelTeam,
        hometown: p.hometown,
        state: p.state,
        gpa: p.gpa,
        isCommitted: p.isCommitted,
        committedProgram: p.committedProgram,
        plan: p.plan,
      },
    });

    await prisma.playerProfile.upsert({
      where: { email: p.email },
      update: {
        userId: user.id,
        profileState: ProfileState.PLAYER_OWNED_ACTIVE,
        ownershipMode: OwnershipMode.PLAYER_PRIMARY,
        schemaVersion: 1,
        data: {},
      },
      create: {
        email: p.email,
        userId: user.id,
        profileState: ProfileState.PLAYER_OWNED_ACTIVE,
        ownershipMode: OwnershipMode.PLAYER_PRIMARY,
        schemaVersion: 1,
        data: {},
      },
    });

    console.log(`✅ Seeded player: ${p.email}`);
  }

  console.log("✅ Done seeding dev players.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
