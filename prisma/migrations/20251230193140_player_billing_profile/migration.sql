-- CreateEnum
CREATE TYPE "public"."PlayerBillingMode" AS ENUM ('NORMAL', 'SPONSORED');

-- AlterTable
ALTER TABLE "public"."PlayerProfile" ADD COLUMN     "billingCadence" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN     "billingMode" "public"."PlayerBillingMode" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "billingStatus" TEXT NOT NULL DEFAULT 'Active',
ADD COLUMN     "planTier" "public"."Plan" NOT NULL DEFAULT 'REDSHIRT',
ADD COLUMN     "sponsorName" TEXT,
ADD COLUMN     "sponsorNote" TEXT;

-- CreateTable
CREATE TABLE "public"."PlayerBillingProfile" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'VALOR',
    "providerCustomerId" TEXT,
    "providerPaymentRef" TEXT,
    "paymentType" TEXT,
    "last4" TEXT,
    "brand" TEXT,
    "billingEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerBillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerInvoice" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'UPCOMING',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "externalId" TEXT,
    "hostedUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PlayerInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerBillingProfile_playerProfileId_key" ON "public"."PlayerBillingProfile"("playerProfileId");

-- CreateIndex
CREATE INDEX "PlayerBillingProfile_playerProfileId_idx" ON "public"."PlayerBillingProfile"("playerProfileId");

-- CreateIndex
CREATE INDEX "PlayerInvoice_playerProfileId_periodStart_idx" ON "public"."PlayerInvoice"("playerProfileId", "periodStart");

-- CreateIndex
CREATE INDEX "PlayerInvoice_playerProfileId_status_idx" ON "public"."PlayerInvoice"("playerProfileId", "status");

-- AddForeignKey
ALTER TABLE "public"."PlayerBillingProfile" ADD CONSTRAINT "PlayerBillingProfile_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "public"."PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerInvoice" ADD CONSTRAINT "PlayerInvoice_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "public"."PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
