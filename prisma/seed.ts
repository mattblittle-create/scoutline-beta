// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Master seed runner.
 * Safe to run even if you only want certain seed blocks.
 *
 * Seeds:
 * - Discounts (via ./seed_discounts)
 * - Demo Team + Demo Admin User + Demo Membership (TEAM_ADMIN)
 */

async function seedDemoTeamAndAdmin() {
  const TEAM_SLUG = "the-battery";
  const TEAM_NAME = "The Battery Training Academy";
  const ADMIN_EMAIL = "admin@email.com";

  console.log("🏟️ Seeding demo team + admin membership...");

  // 1) Team
  const team = await prisma.team.upsert({
    where: { slug: TEAM_SLUG },
    update: {
      name: TEAM_NAME,
      teamType: "TRAINING",
    },
    create: {
      name: TEAM_NAME,
      slug: TEAM_SLUG,
      teamType: "TRAINING",
      billingMode: "NORMAL",
      // optional org-ish fields for nicer UI:
      city: "Clover",
      state: "SC",
      websiteUrl: "https://myscoutline.com",
    },
  });

  // 2) Admin user
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: "Team Admin",
      role: "TEAM_ADMIN",
    },
    create: {
      email: ADMIN_EMAIL,
      name: "Team Admin",
      role: "TEAM_ADMIN",
    },
  });

  // 3) Membership row linking admin -> team
  // NOTE: Because season is nullable, Prisma's compound unique with a null component
  // can be finicky across DBs. We'll do a findFirst + create/update safely.
  const existing = await prisma.teamMembership.findFirst({
    where: {
      teamId: team.id,
      userId: admin.id,
      role: "TEAM_ADMIN",
      season: null,
    },
  });

  if (existing) {
    await prisma.teamMembership.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
  } else {
    await prisma.teamMembership.create({
      data: {
        teamId: team.id,
        userId: admin.id,
        role: "TEAM_ADMIN",
        isActive: true,
        season: null,
      },
    });
  }

  console.log(`✅ Demo team ready: ${team.name} (slug: ${team.slug})`);
  console.log(`✅ Demo admin ready: ${admin.email}`);
  console.log("✅ Demo TEAM_ADMIN membership ready.");
}

async function main() {
  console.log("🌱 Starting master seed...");

  // ------------------------------------------------------------
  // OPTIONAL: seed discounts
  // ------------------------------------------------------------
  try {
    await import("./seed_discounts");
    console.log("✅ Discounts seed module loaded.");
  } catch (e) {
    console.warn("⚠️ Discounts seed not run from master seed (module not found or failed):", e);
  }

  // ------------------------------------------------------------
  // Demo team + admin (DEV)
  // ------------------------------------------------------------
  await seedDemoTeamAndAdmin();

  console.log("✅ Master seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
