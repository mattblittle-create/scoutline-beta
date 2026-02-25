// prisma/seed_player.ts
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  /**
   * IMPORTANT:
   * This seeds the PLAYER behind /player/braden-little (slug).
   * If you want a different player, change these 3 values.
   */
  const email = "braden.little2@gmail.com";
  const name = "Braden Little";
  const slug = "braden-little";

  // 1) Upsert User
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      slug,
      role: "Player",
      // optional: keep privacy as you prefer
      emailPrivate: false,
      phonePrivate: false,
    },
    create: {
      email,
      name,
      slug,
      role: "Player",
      emailPrivate: false,
      phonePrivate: false,
    },
    select: { id: true, email: true, name: true, slug: true, role: true },
  });

  // 2) Upsert Player (this is what drives computedPlanTier in /api/public/player/[slug])
  const player = await prisma.player.upsert({
    where: { userId: user.id },
    update: {
      // ✅ THIS is the important part
      plan: "TEAM",

      // optional: keep public enabled
      publicEnabled: true,
      publicVisibility: "PUBLIC",
    },
    create: {
      userId: user.id,

      // minimal required-ish fields (optional)
      gradYear: 2028,
      primaryPos: "3B",
      throws: "R",
      bats: "R",

      // ✅ THIS is the important part
      plan: "TEAM",

      publicEnabled: true,
      publicVisibility: "PUBLIC",
    },
    select: {
      id: true,
      userId: true,
      plan: true,
      publicEnabled: true,
      publicVisibility: true,
      user: { select: { email: true, name: true, slug: true } },
    },
  });

  // 3) Nuke cached public payload so you don't keep seeing stale planTier
  // (your API reads cache first unless fresh/debug/nocache are used)
  await prisma.publicProfileCache.deleteMany({ where: { slug } });

  console.log("✅ User upserted:", user);
  console.log("✅ Player upserted:", player);
  console.log(`✅ Cleared PublicProfileCache for slug: ${slug}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
