-- CreateEnum
CREATE TYPE "public"."ReferralSourceType" AS ENUM ('DISCOUNT_CODE', 'REFERRAL_LINK', 'MANUAL');

-- CreateEnum
CREATE TYPE "public"."CommissionStatus" AS ENUM ('PENDING', 'ELIGIBLE', 'PAID', 'VOIDED');

-- CreateEnum
CREATE TYPE "public"."PayoutStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'CANCELED');

-- CreateTable
CREATE TABLE "public"."Referral" (
    "id" TEXT NOT NULL,
    "referrerUserId" TEXT,
    "targetType" "public"."DiscountTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "sourceType" "public"."ReferralSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceCode" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CommissionEvent" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "planTier" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "billedAmountCents" INTEGER NOT NULL,
    "commissionAmountCents" INTEGER NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eligibleAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "teamInvoiceId" TEXT,
    "playerInvoiceId" TEXT,
    "discountApplicationId" TEXT,
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payout" (
    "id" TEXT NOT NULL,
    "payeeUserId" TEXT,
    "status" "public"."PayoutStatus" NOT NULL DEFAULT 'DRAFT',
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "method" TEXT,
    "note" TEXT,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Referral_referrerUserId_idx" ON "public"."Referral"("referrerUserId");

-- CreateIndex
CREATE INDEX "Referral_targetType_targetId_idx" ON "public"."Referral"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Referral_sourceType_idx" ON "public"."Referral"("sourceType");

-- CreateIndex
CREATE INDEX "CommissionEvent_status_eligibleAt_idx" ON "public"."CommissionEvent"("status", "eligibleAt");

-- CreateIndex
CREATE INDEX "CommissionEvent_payoutId_idx" ON "public"."CommissionEvent"("payoutId");

-- CreateIndex
CREATE INDEX "CommissionEvent_teamInvoiceId_idx" ON "public"."CommissionEvent"("teamInvoiceId");

-- CreateIndex
CREATE INDEX "CommissionEvent_playerInvoiceId_idx" ON "public"."CommissionEvent"("playerInvoiceId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "public"."Payout"("status");

-- CreateIndex
CREATE INDEX "Payout_payeeUserId_idx" ON "public"."Payout"("payeeUserId");

-- AddForeignKey
ALTER TABLE "public"."Referral" ADD CONSTRAINT "Referral_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommissionEvent" ADD CONSTRAINT "CommissionEvent_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "public"."Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommissionEvent" ADD CONSTRAINT "CommissionEvent_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "public"."Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_payeeUserId_fkey" FOREIGN KEY ("payeeUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
