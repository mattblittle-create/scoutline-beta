// prisma/seed_discounts.ts
import {
  PrismaClient,
  DiscountAppliesTo,
  DiscountDurationType,
  DiscountType,
} from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed discount codes (safe to re-run; uses upsert).
 * NOTE: This file assumes DiscountCode has:
 * - oncePerTarget Boolean
 * - allowedTargetIdsJson String
 */
async function main() {
  const plans = (arr: string[]) => JSON.stringify(arr);

  // For codes that should be restricted to specific teams/players, populate this JSON array.
  // Example (TEAM): JSON.stringify(["<teamId1>", "<teamId2>"])
  const allowedTargets = (arr: string[]) => JSON.stringify(arr);

  // 1) HALFOFF3 — 50% off for 3 months (Teams only)
  // Anti-abuse: once per target team
  await prisma.discountCode.upsert({
    where: { code: "HALFOFF3" },
    update: {
      type: DiscountType.PERCENT,
      value: 50,
      appliesTo: DiscountAppliesTo.TEAM,
      plansAllowedJson: plans(["Teams"]),
      cadence: null,
      durationType: DiscountDurationType.MONTHS,
      durationMonths: 3,
      expiresAt: null,
      maxRedemptions: null,
      isActive: true,

      oncePerTarget: true,
      allowedTargetIdsJson: allowedTargets([]),
    },
    create: {
      code: "HALFOFF3",
      type: DiscountType.PERCENT,
      value: 50,
      appliesTo: DiscountAppliesTo.TEAM,
      plansAllowedJson: plans(["Teams"]),
      cadence: null,
      durationType: DiscountDurationType.MONTHS,
      durationMonths: 3,
      expiresAt: null,
      maxRedemptions: null,
      isActive: true,

      oncePerTarget: true,
      allowedTargetIdsJson: allowedTargets([]),
    },
  });

  // 2) ANNUAL20 — 20% off annual Teams plan
  await prisma.discountCode.upsert({
    where: { code: "ANNUAL20" },
    update: {
      type: DiscountType.PERCENT,
      value: 20,
      appliesTo: DiscountAppliesTo.TEAM,
      plansAllowedJson: plans(["Teams"]),
      cadence: "annual",
      durationType: DiscountDurationType.ONCE,
      durationMonths: null,
      expiresAt: null,
      maxRedemptions: null,
      isActive: true,

      oncePerTarget: false,
      allowedTargetIdsJson: allowedTargets([]),
    },
    create: {
      code: "ANNUAL20",
      type: DiscountType.PERCENT,
      value: 20,
      appliesTo: DiscountAppliesTo.TEAM,
      plansAllowedJson: plans(["Teams"]),
      cadence: "annual",
      durationType: DiscountDurationType.ONCE,
      durationMonths: null,
      expiresAt: null,
      maxRedemptions: null,
      isActive: true,

      oncePerTarget: false,
      allowedTargetIdsJson: allowedTargets([]),
    },
  });

  // 3) BATTERYBETA — price override to $0 (sponsored)
  // IMPORTANT: Ideally this should be replaced with Team.billingMode=SPONSORED in Step 3.
  // For now, enforcement exists in discounts.ts if you set allowedTargetIdsJson to Battery’s Team.id.
  await prisma.discountCode.upsert({
    where: { code: "BATTERYBETA" },
    update: {
      type: DiscountType.OVERRIDE_PRICE,
      value: 0,
      appliesTo: DiscountAppliesTo.TEAM,
      plansAllowedJson: plans(["Teams"]),
      cadence: null,
      durationType: DiscountDurationType.FOREVER,
      durationMonths: null,
      expiresAt: null,
      maxRedemptions: null,
      isActive: true,

      oncePerTarget: false,
      // TODO: set to allowedTargets(["<BATTERY_TEAM_ID>"]) once you know the id
      allowedTargetIdsJson: allowedTargets([]),
    },
    create: {
      code: "BATTERYBETA",
      type: DiscountType.OVERRIDE_PRICE,
      value: 0,
      appliesTo: DiscountAppliesTo.TEAM,
      plansAllowedJson: plans(["Teams"]),
      cadence: null,
      durationType: DiscountDurationType.FOREVER,
      durationMonths: null,
      expiresAt: null,
      maxRedemptions: null,
      isActive: true,

      oncePerTarget: false,
      // TODO: set to allowedTargets(["<BATTERY_TEAM_ID>"]) once you know the id
      allowedTargetIdsJson: allowedTargets([]),
    },
  });

  console.log("✅ Seeded discount codes: HALFOFF3 (oncePerTarget), ANNUAL20, BATTERYBETA");
}

main()
  .catch((e) => {
    console.error("❌ Discount seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
