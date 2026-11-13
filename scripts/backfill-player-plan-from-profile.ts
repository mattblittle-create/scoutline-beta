// scripts/backfill-player-plan-from-profile.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type PlanTier = "REDSHIRT" | "WALK_ON" | "ALL_AMERICAN";

function normalizePlanTier(value: unknown): PlanTier {
  const v = String(value ?? "").trim().toUpperCase();

  if (v === "ALL_AMERICAN" || v === "ALL-AMERICAN" || v === "ALLAMERICAN") {
    return "ALL_AMERICAN";
  }
  if (v === "WALK_ON" || v === "WALK-ON" || v === "WALKON") {
    return "WALK_ON";
  }
  return "REDSHIRT";
}

async function main() {
  console.log("Starting backfill: Player.plan <- PlayerProfile.playerPlanTier");

  const profiles = await prisma.playerProfile.findMany({
    select: {
      id: true,
      email: true,
      playerPlanTier: true,
    },
  });

  console.log(`Found ${profiles.length} player profile record(s).`);

  let updatedCount = 0;
  let skippedNoUser = 0;
  let skippedNoPlayer = 0;

  for (const profile of profiles) {
    const email = String(profile.email ?? "").trim().toLowerCase();
    if (!email) {
      console.log(`- Skipping profile ${profile.id}: missing email`);
      continue;
    }

    const nextPlan = normalizePlanTier(profile.playerPlanTier);

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      skippedNoUser += 1;
      console.log(`- No user found for profile ${profile.id} (${email})`);
      continue;
    }

    const players = await prisma.player.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        plan: true,
      },
    });

    if (!players.length) {
      skippedNoPlayer += 1;
      console.log(`- No player row found for user ${user.email} (${user.id})`);
      continue;
    }

    for (const player of players) {
      const currentPlan = String(player.plan ?? "").toUpperCase();
      if (currentPlan === nextPlan) {
        console.log(`- OK ${email}: Player ${player.id} already ${currentPlan}`);
        continue;
      }

      await prisma.player.update({
        where: { id: player.id },
        data: { plan: nextPlan as any },
      });

      updatedCount += 1;
      console.log(`- Updated ${email}: Player ${player.id} ${currentPlan || "(empty)"} -> ${nextPlan}`);
    }
  }

  console.log("");
  console.log("Backfill complete.");
  console.log(`Updated Player rows: ${updatedCount}`);
  console.log(`Skipped (no user): ${skippedNoUser}`);
  console.log(`Skipped (no player): ${skippedNoPlayer}`);
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });