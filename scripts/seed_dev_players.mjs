// scripts/seed_dev_players.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * This seed creates:
 * - 2 Users (each with a Player row)
 * - 2 PlayerProfiles linked to those Users
 * - PlayerProfile.data.metrics arrays in the format your /api/coach/player/search expects
 *
 * Safe to run multiple times (uses upserts by email).
 */

function slugify(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeMetrics({ exitVelo, sixty, htf, rawThrow, popTime }) {
  // monthYear format supports MM/YYYY per your parser
  const monthYear = "01/2026";

  const arr = (v) => (v == null ? [] : [{ monthYear, value: v }]);

  return {
    // keys your search route reads from PlayerProfile.data.metrics
    exitVelo: arr(exitVelo),
    sixtyYdDash: arr(sixty),
    homeToFirst: arr(htf),
    rawThrowVelo: arr(rawThrow),
    popTime: arr(popTime),

    // include a couple optional ones so UI won’t choke if you add columns later
    infieldThrowVelo: [],
    outfieldThrowVelo: [],
    catcherThrowVelo: [],
  };
}

async function upsertPlayerWithProfile(p) {
  const email = p.email.toLowerCase().trim();

  // 1) Upsert User
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: p.name,
      slug: p.slug || slugify(p.name),
      photoUrl: p.photoUrl || null,
      emailPrivate: p.emailPrivate ?? false,
      phonePrivate: p.phonePrivate ?? false,
      workPhone: p.workPhoneDigits || null,
      workPhoneExt: p.workPhoneExt || null,
    },
    create: {
      email,
      name: p.name,
      slug: p.slug || slugify(p.name),
      photoUrl: p.photoUrl || null,
      emailPrivate: p.emailPrivate ?? false,
      phonePrivate: p.phonePrivate ?? false,
      workPhone: p.workPhoneDigits || null,
      workPhoneExt: p.workPhoneExt || null,
    },
    select: { id: true, email: true },
  });

  // 2) Ensure Player row exists
  await prisma.player.upsert({
    where: { userId: user.id },
    update: {
      gradYear: p.gradYear,
      primaryPos: p.primaryPos,
      secondaryPos: p.secondaryPos || null,
      bats: p.bats,
      throws: p.throws,
      pitcherHand: p.pitcherHand || null,
      hsName: p.hsName || null,
      travelTeam: p.travelTeam || null,
      hometown: p.hometown || null,
      state: p.state || null,
      gpa: p.gpa != null ? p.gpa : null,
      isCommitted: !!p.isCommitted,
      committedProgram: p.committedProgram || null,
      publicEnabled: true,
    },
    create: {
      userId: user.id,
      gradYear: p.gradYear,
      primaryPos: p.primaryPos,
      secondaryPos: p.secondaryPos || null,
      bats: p.bats,
      throws: p.throws,
      pitcherHand: p.pitcherHand || null,
      hsName: p.hsName || null,
      travelTeam: p.travelTeam || null,
      hometown: p.hometown || null,
      state: p.state || null,
      gpa: p.gpa != null ? p.gpa : null,
      isCommitted: !!p.isCommitted,
      committedProgram: p.committedProgram || null,
      publicEnabled: true,
    },
  });

  // 3) Upsert PlayerProfile
  // Your app uses PlayerProfile.email as unique. We'll use the same email.
  const profile = await prisma.playerProfile.upsert({
    where: { email },
    update: {
      userId: user.id,
      profileState: "PLAYER_OWNED_ACTIVE",
      ownershipMode: "PLAYER_PRIMARY",
      hasActivePlayerBilling: true,
      hasActiveTeamBilling: false,
      billingConflictFlag: false,
      schemaVersion: 1,
      data: {
        // keep it minimal but valid
        metrics: makeMetrics(p.metrics),
        stats: { seasons: [] },
        seededBy: "seed_dev_players.mjs",
      },
    },
    create: {
      email,
      userId: user.id,
      profileState: "PLAYER_OWNED_ACTIVE",
      ownershipMode: "PLAYER_PRIMARY",
      hasActivePlayerBilling: true,
      hasActiveTeamBilling: false,
      billingConflictFlag: false,
      schemaVersion: 1,
      data: {
        metrics: makeMetrics(p.metrics),
        stats: { seasons: [] },
        seededBy: "seed_dev_players.mjs",
      },
    },
    select: { id: true, email: true, userId: true },
  });

  return { user, profile };
}

async function main() {
  const players = [
    {
      email: "jaxon.rivera27@gmail.com",
      name: "Jaxon Rivera",
      slug: "jaxon-rivera",
      photoUrl: "",

      gradYear: 2028,
      primaryPos: "SS",
      secondaryPos: "2B",
      bats: "R",
      throws: "R",
      pitcherHand: null,

      hsName: "South Pointe HS",
      travelTeam: "Carolina Prospects",
      hometown: "Rock Hill",
      state: "SC",
      gpa: 3.6,

      isCommitted: false,
      committedProgram: null,

      emailPrivate: false,
      phonePrivate: false,
      workPhoneDigits: "8035551212",
      workPhoneExt: "",

      metrics: {
        exitVelo: 92,
        sixty: 6.84,
        htf: 4.08,
        rawThrow: 84,
        popTime: null,
      },
    },
    {
      email: "eli.thompson15@gmail.com",
      name: "Eli Thompson",
      slug: "eli-thompson",
      photoUrl: "",

      gradYear: 2027,
      primaryPos: "C",
      secondaryPos: "1B",
      bats: "L",
      throws: "R",
      pitcherHand: null,

      hsName: "Myers Park HS",
      travelTeam: "Dirtbags Charlotte",
      hometown: "Charlotte",
      state: "NC",
      gpa: 3.2,

      isCommitted: true,
      committedProgram: "Winthrop",

      emailPrivate: false,
      phonePrivate: true, // so you can confirm privacy behavior on coach UI
      workPhoneDigits: "7045559988",
      workPhoneExt: "123",

      metrics: {
        exitVelo: 95,
        sixty: 7.12,
        htf: 4.32,
        rawThrow: 80,
        popTime: 1.93,
      },
    },
  ];

  const created = [];
  for (const p of players) {
    const out = await upsertPlayerWithProfile(p);
    created.push(out);
  }

  console.log("✅ Seeded dev players:");
  for (const x of created) {
    console.log(`- ${x.user.email} -> PlayerProfileId=${x.profile.id}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ seed_dev_players failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
