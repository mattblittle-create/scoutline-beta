import { prisma } from "../lib/prisma";

async function main() {
  const college = await prisma.college.findFirst({
    where: {
      name: "Saint Peter's University",
    },
    select: {
      baseballProgram: {
        select: {
          id: true,
        },
      },
    },
  });

  const programId = college?.baseballProgram?.id;

  if (!programId) {
    console.log("Program not found.");
    return;
  }

  const snapshot =
    await prisma.collegeBaseballRosterSnapshot.findFirst({
      where: { programId },
      orderBy: { season: "desc" },
    });

  if (!snapshot) {
    console.log("Snapshot not found.");
    return;
  }

  const players =
    await prisma.collegeBaseballRosterPlayer.findMany({
      where: {
        programId,
        season: snapshot.season,
      },
      select: {
        name: true,
        positionRaw: true,
        classYearRaw: true,
        classBucket: true,
      },
      orderBy: {
        name: "asc",
      },
    });

  console.log(
    `Season: ${snapshot.season}`
  );

  console.table(
    players.filter((player) =>
      /redshirt freshman|r-fr|rs-fr|rfr|rsfr/i.test(
        player.classYearRaw || ""
      )
    )
  );
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
