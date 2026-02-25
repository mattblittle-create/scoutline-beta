-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('UPCOMING', 'OPEN', 'PAID', 'PAST_DUE', 'VOID');

-- CreateTable
CREATE TABLE "public"."TeamBillingProfile" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'VALOR',
    "providerCustomerId" TEXT,
    "providerPaymentRef" TEXT,
    "paymentType" TEXT,
    "last4" TEXT,
    "brand" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamBillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamInvoice" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'UPCOMING',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "externalId" TEXT,
    "hostedUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "TeamInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamBillingProfile_teamId_key" ON "public"."TeamBillingProfile"("teamId");

-- CreateIndex
CREATE INDEX "TeamBillingProfile_teamId_idx" ON "public"."TeamBillingProfile"("teamId");

-- CreateIndex
CREATE INDEX "TeamInvoice_teamId_periodStart_idx" ON "public"."TeamInvoice"("teamId", "periodStart");

-- CreateIndex
CREATE INDEX "TeamInvoice_teamId_status_idx" ON "public"."TeamInvoice"("teamId", "status");

-- AddForeignKey
ALTER TABLE "public"."TeamBillingProfile" ADD CONSTRAINT "TeamBillingProfile_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamInvoice" ADD CONSTRAINT "TeamInvoice_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
