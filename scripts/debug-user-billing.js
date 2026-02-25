/* scripts/debug-user-billing.js */
const { prisma } = require("../lib/prisma");

const USER_ID = "cmkmxlkkt0002qt0c2ndxk2t3";

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: USER_ID },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    console.log("User not found:", USER_ID);
    return;
  }

  const playerProfile = await prisma.playerProfile.findFirst({
    where: { userId: USER_ID },
    select: {
      id: true,
      email: true,
      playerPlanTier: true,
      playerBillingCadence: true,
      playerBillingStatus: true,
      hasActivePlayerBilling: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const playerProfileId = playerProfile?.id ?? null;

  const apps = playerProfileId
    ? await prisma.discountApplication.findMany({
        where: { targetType: "PLAYER", targetId: playerProfileId },
        orderBy: { appliedAt: "desc" },
        take: 10,
        include: { discountCode: true },
      })
    : [];

  const invoices = playerProfileId
    ? await prisma.playerInvoice.findMany({
        where: { playerProfileId },
        orderBy: { invoiceDate: "desc" },
        take: 10,
      })
    : [];

  console.log("\n=== USER ===");
  console.dir(user, { depth: null });

  console.log("\n=== PLAYER PROFILE ===");
  console.dir(playerProfile, { depth: null });

  console.log("\n=== DISCOUNT APPLICATIONS (latest 10) ===");
  console.dir(
    apps.map((a) => ({
      id: a.id,
      status: a.status,
      targetType: a.targetType,
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

  console.log("\n=== PLAYER INVOICES (latest 10) ===");
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
    })),
    { depth: null }
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });