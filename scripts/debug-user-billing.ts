// scripts/debug-user-billing.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Usage examples:
 *   npx tsx scripts/debug-user-billing.ts "jaxon.rivera27@gmail.com"
 *   npx tsx scripts/debug-user-billing.ts "Jaxon Rivera"
 *   npx tsx scripts/debug-user-billing.ts "cmkmxlkkt0002qt0c2ndxk2t3"   (playerProfileId is OK)
 */
const INPUT = (process.argv.slice(2).join(" ") || "").trim();

function norm(s: string) {
  return s.trim().toLowerCase();
}

async function main() {
  if (!INPUT) {
    console.log('Missing input. Example: npx tsx scripts/debug-user-billing.ts "jaxon.rivera27@gmail.com"');
    return;
  }

  const q = INPUT;
  const qLower = norm(q);
  const isEmail = qLower.includes("@");

  // 1) Try find PlayerProfile directly by id or email
  const playerProfile =
    (await prisma.playerProfile.findFirst({
      where: {
        OR: [
          { id: q },
          { email: isEmail ? qLower : undefined },
          // if user typed a name, we can try contains on email too (lightweight)
          { email: !isEmail ? { contains: qLower } : undefined },
        ].filter(Boolean) as any,
      },
      select: {
        id: true,
        email: true,
        userId: true,
        playerPlanTier: true,
        playerBillingCadence: true,
        playerBillingStatus: true,
        hasActivePlayerBilling: true,
        createdAt: true,
        updatedAt: true,
      },
    })) ?? null;

  // 2) Try find User by id/email/name (optional; helpful context)
  const user =
    (await prisma.user.findFirst({
      where: {
        OR: [
          { id: q },
          { email: isEmail ? qLower : undefined },
          { name: !isEmail ? { contains: q, mode: "insensitive" } : undefined },
        ].filter(Boolean) as any,
      },
      select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
    })) ?? null;

  // 3) If we found a User but not PlayerProfile, try PlayerProfile by userId
  const playerProfile2 =
    !playerProfile && user?.id
      ? await prisma.playerProfile.findFirst({
          where: { userId: user.id },
          select: {
            id: true,
            email: true,
            userId: true,
            playerPlanTier: true,
            playerBillingCadence: true,
            playerBillingStatus: true,
            hasActivePlayerBilling: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : null;

  const pp = playerProfile ?? playerProfile2;

  console.log("\n=== INPUT ===");
  console.log(q);

  console.log("\n=== USER (optional) ===");
  console.dir(user, { depth: null });

  console.log("\n=== PLAYER PROFILE (this is the billing/discount target for PLAYER) ===");
  console.dir(pp, { depth: null });

  if (!pp?.id) {
    console.log("\nNo PlayerProfile found. If this is a test player, verify a PlayerProfile row exists for them.");
    return;
  }

  // 4) Discounts applied to the PlayerProfile
  const apps = await prisma.discountApplication.findMany({
    where: { targetType: "PLAYER", targetId: pp.id },
    orderBy: { appliedAt: "desc" },
    take: 25,
    include: { discountCode: true },
  });

  console.log("\n=== DISCOUNT APPLICATIONS (PLAYER target) ===");
  console.dir(
    apps.map((a) => ({
      id: a.id,
      status: a.status,
      targetId: a.targetId,
      planTier: a.planTier,
      cadence: a.cadence,
      appliedAt: a.appliedAt,
      endsAt: a.endsAt,
      revokedAt: a.revokedAt,
      code: a.discountCode.code,
      type: a.discountCode.type,
      value: a.discountCode.value,
      appliesTo: a.discountCode.appliesTo,
      dcCadence: a.discountCode.cadence,
      durationType: a.discountCode.durationType,
      durationMonths: a.discountCode.durationMonths,
      meta: a.metadata,
    })),
    { depth: null }
  );

  // 5) Invoices for that PlayerProfile (likely empty in dev until you generate)
  const invoices = await prisma.playerInvoice.findMany({
    where: { playerProfileId: pp.id },
    orderBy: { invoiceDate: "desc" },
    take: 25,
  });

  console.log("\n=== PLAYER INVOICES ===");
  console.dir(
    invoices.map((i) => ({
      id: i.id,
      status: i.status,
      cadence: i.cadence,
      periodStart: i.periodStart,
      periodEnd: i.periodEnd,
      invoiceDate: i.invoiceDate,
      dueDate: i.dueDate,
      amountCents: i.amountCents,
      amountPaidCents: i.amountPaidCents,
      paidAt: i.paidAt,
      externalId: i.externalId,
      hostedUrl: i.hostedUrl,
    })),
    { depth: null }
  );

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });