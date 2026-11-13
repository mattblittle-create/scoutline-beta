// scripts/generate-test-player-invoice.ts

import { Prisma, PrismaClient, DiscountTargetType } from "@prisma/client";
import { validateAndComputeDiscount } from "../lib/billing/discounts";
import { normalizePlanTier, normalizeCadence, basePriceCents } from "../lib/billing/plans";

const prisma = new PrismaClient();
const INPUT = (process.argv.slice(2).join(" ") || "").trim();

function norm(s: string) {
  return s.trim().toLowerCase();
}

function addMonths(d: Date, months: number) {
  const x = new Date(d.getTime());
  x.setMonth(x.getMonth() + months);
  return x;
}

function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

async function main() {
  if (!INPUT) {
    console.log('Missing input. Example: npx tsx scripts/generate-test-player-invoice.ts "jaxon.rivera27@gmail.com"');
    return;
  }

  const q = INPUT;
  const qLower = norm(q);
  const isEmail = qLower.includes("@");

  const userWhere: Prisma.UserWhereInput = {
    OR: [
      { id: q },
      ...(isEmail ? [{ email: qLower }] : []),
      ...(!isEmail
        ? [
            {
              name: {
                contains: q,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ]
        : []),
    ],
  };

  // Optional: find user (helpful for name searches)
  const user =
    (await prisma.user.findFirst({
      where: userWhere,
      select: { id: true, email: true, name: true },
    })) ?? null;

  const pp =
    (await prisma.playerProfile.findFirst({
      where: {
        OR: [
          { id: q },
          ...(isEmail ? [{ email: qLower }] : []),
          ...(user?.id ? [{ userId: user.id }] : []),
        ],
      },
      select: {
        id: true,
        email: true,
        playerPlanTier: true,
        playerBillingCadence: true,
        playerBillingStatus: true,
      },
    })) ?? null;

  if (!pp) {
    console.log("No PlayerProfile found for:", q);
    return;
  }

  const planTierLabel = normalizePlanTier(pp.playerPlanTier);
  const cadence = normalizeCadence(pp.playerBillingCadence);

  if (!planTierLabel || !cadence) {
    console.log("Invalid plan/cadence on PlayerProfile:", {
      playerPlanTier: pp.playerPlanTier,
      playerBillingCadence: pp.playerBillingCadence,
      planTierLabel,
      cadence,
    });
    return;
  }

  // Get most recent ACTIVE discount code for this PLAYER target
  const activeApp = await prisma.discountApplication.findFirst({
    where: {
      targetType: "PLAYER",
      targetId: pp.id,
      status: "ACTIVE",
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
    },
    orderBy: { appliedAt: "desc" },
    include: { discountCode: { select: { code: true } } },
  });

  const code = activeApp?.discountCode?.code ?? null;

  // Base price from CURRENT profile context
  const baseCents = basePriceCents(planTierLabel, cadence);

  let totalCents = baseCents;
  let discountAmountCents = 0;
  let discountCodeUsed: string | null = null;
  let computeNote: string | null = null;

  if (code) {
    const computed = await validateAndComputeDiscount({
      code,
      targetType: DiscountTargetType.PLAYER,
      targetId: pp.id,
      planTierRaw: planTierLabel,
      cadenceRaw: cadence,
    });

    if (computed?.ok) {
      totalCents = computed.totalCents;
      discountAmountCents = computed.discountAmountCents;
      discountCodeUsed = code;
    } else {
      computeNote = computed?.reason ? String(computed.reason) : "Discount not valid for current context";
      totalCents = baseCents;
    }
  }

  if (totalCents < 0) totalCents = 0;

  const now = new Date();
  const periodStart = now;
  const periodEnd =
    cadence === "annual" ? addMonths(periodStart, 12) : addMonths(periodStart, 1);

  const invoice = await prisma.playerInvoice.create({
    data: {
      playerProfileId: pp.id,
      status: "OPEN",
      cadence,
      periodStart,
      periodEnd,
      invoiceDate: now,
      dueDate: addDays(now, 7),
      amountCents: totalCents,
      amountPaidCents: 0,
      externalId: `DEV_${pp.id}_${now.getTime()}`,
    } as any,
    select: {
      id: true,
      status: true,
      cadence: true,
      amountCents: true,
      amountPaidCents: true,
      invoiceDate: true,
      dueDate: true,
      periodStart: true,
      periodEnd: true,
      playerProfileId: true,
      externalId: true,
    },
  });

  console.log("\n=== CONTEXT (invoice uses CURRENT profile context) ===");
  console.log({
    playerProfileId: pp.id,
    email: pp.email,
    playerPlanTier: pp.playerPlanTier,
    playerBillingCadence: pp.playerBillingCadence,
    normalized: { planTierLabel, cadence },
  });

  console.log("\n=== DISCOUNT (if any) ===");
  console.log({
    activeDiscountCode: code,
    discountCodeUsed,
    baseCents,
    discountAmountCents,
    totalCents,
    note: computeNote,
  });

  console.log("\nCreated PlayerInvoice (OPEN):");
  console.dir(invoice, { depth: null });

  console.log("\nNext: run debug-user-billing to confirm invoice shows up and amount reflects discount.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });