-- AlterTable
ALTER TABLE "public"."PlayerProfile" ADD COLUMN     "playerCancelEffectiveAt" TIMESTAMP(3),
ADD COLUMN     "playerCancelRequestedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Team" ADD COLUMN     "cancelEffectiveAt" TIMESTAMP(3),
ADD COLUMN     "cancelRequestedAt" TIMESTAMP(3);

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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerBillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlayerInvoice" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'UPCOMING',
    "cadence" TEXT NOT NULL DEFAULT 'monthly',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "amountPaidCents" INTEGER NOT NULL DEFAULT 0,
    "externalId" TEXT,
    "hostedUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerBillingProfile_playerProfileId_key" ON "public"."PlayerBillingProfile"("playerProfileId");

-- CreateIndex
CREATE INDEX "PlayerBillingProfile_playerProfileId_idx" ON "public"."PlayerBillingProfile"("playerProfileId");

-- CreateIndex
CREATE INDEX "PlayerInvoice_playerProfileId_invoiceDate_idx" ON "public"."PlayerInvoice"("playerProfileId", "invoiceDate");

-- CreateIndex
CREATE INDEX "PlayerInvoice_playerProfileId_status_idx" ON "public"."PlayerInvoice"("playerProfileId", "status");

-- CreateIndex
CREATE INDEX "PlayerInvoice_playerProfileId_periodStart_idx" ON "public"."PlayerInvoice"("playerProfileId", "periodStart");

-- AddForeignKey
ALTER TABLE "public"."PlayerBillingProfile" ADD CONSTRAINT "PlayerBillingProfile_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "public"."PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerInvoice" ADD CONSTRAINT "PlayerInvoice_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "public"."PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
