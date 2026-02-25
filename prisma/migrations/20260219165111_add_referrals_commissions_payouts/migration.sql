/*
  Warnings:

  - A unique constraint covering the columns `[targetType,targetId]` on the table `Referral` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "public"."PayoutStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "public"."CommissionEvent" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "note" TEXT,
ALTER COLUMN "billedAmountCents" SET DEFAULT 0,
ALTER COLUMN "commissionAmountCents" SET DEFAULT 0,
ALTER COLUMN "eligibleAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Referral" ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE INDEX "CommissionEvent_referralId_earnedAt_idx" ON "public"."CommissionEvent"("referralId", "earnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_targetType_targetId_key" ON "public"."Referral"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "public"."CommissionEvent" ADD CONSTRAINT "CommissionEvent_teamInvoiceId_fkey" FOREIGN KEY ("teamInvoiceId") REFERENCES "public"."TeamInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CommissionEvent" ADD CONSTRAINT "CommissionEvent_playerInvoiceId_fkey" FOREIGN KEY ("playerInvoiceId") REFERENCES "public"."PlayerInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
