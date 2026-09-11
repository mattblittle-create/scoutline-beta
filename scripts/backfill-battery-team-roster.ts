// scripts/backfill-battery-team-roster.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const team = await prisma.team.findFirst({
    where: {
      OR: [
        { name: { contains: "Battery", mode: "insensitive" } },
        { slug: { contains: "battery", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, slug: true },
  });

  if (!team) throw new Error("No Battery team found.");

  const players = await prisma.playerProfile.findMany({
    where: {
      email: { not: "" },
    },
select: {
  id: true,
  email: true,
  userId: true,
},
  });

  console.log(`Team: ${team.name} (${team.id})`);
  console.log(`Player profiles found: ${players.length}`);

  for (const player of players) {
    if (!player.userId) {
      console.log(`SKIP ${player.email}: no userId on PlayerProfile`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.teamMembership.updateMany({
        where: {
          playerProfileId: player.id,
          role: "PLAYER" as any,
          isPrimaryForProfile: true,
        },
        data: {
          isPrimaryForProfile: false,
          isActive: false,
        },
      });

      const existing = await tx.teamMembership.findFirst({
        where: {
          teamId: team.id,
          userId: player.userId!,
          role: "PLAYER" as any,
        },
        select: { id: true },
      });

      if (existing?.id) {
        await tx.teamMembership.update({
          where: { id: existing.id },
          data: {
            playerProfileId: player.id,
            isActive: true,
            isPrimaryForProfile: true,
          },
        });
      } else {
        await tx.teamMembership.create({
          data: {
            teamId: team.id,
            userId: player.userId!,
            role: "PLAYER" as any,
            playerProfileId: player.id,
            isActive: true,
            isPrimaryForProfile: true,
          },
        });
      }

      await tx.playerProfile.update({
        where: { id: player.id },
        data: {
          ownerTeamId: team.id,
          profileState: "TEAM_OWNED_ACTIVE" as any,
          ownershipMode: "TEAM_PRIMARY" as any,
          hasActiveTeamBilling: true,
          hasActivePlayerBilling: false,
          billingConflictFlag: false,
          playerPlanTier: "TEAM" as any,
          playerBillingCadence: "monthly",
          playerBillingStatus: "Team Covered",
          updatedAt: new Date(),
        },
      });
    });

    console.log(`CONNECTED ${player.email} → ${team.name}`);
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });