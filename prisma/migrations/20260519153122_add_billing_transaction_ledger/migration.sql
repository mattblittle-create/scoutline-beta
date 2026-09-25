-- CreateTable
CREATE TABLE "public"."BillingTransaction" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT,
    "playerProfileId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'VALOR',
    "transactionType" TEXT NOT NULL,
    "transactionStatus" TEXT NOT NULL,
    "providerTransactionId" TEXT,
    "providerReference" TEXT,
    "amountCents" INTEGER NOT NULL,
    "cardFeeCents" INTEGER NOT NULL DEFAULT 0,
    "approvalCode" TEXT,
    "responseCode" TEXT,
    "responseMessage" TEXT,
    "receiptUrl" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingTransaction_invoiceId_idx" ON "public"."BillingTransaction"("invoiceId");

-- CreateIndex
CREATE INDEX "BillingTransaction_playerProfileId_idx" ON "public"."BillingTransaction"("playerProfileId");

-- CreateIndex
CREATE INDEX "BillingTransaction_providerTransactionId_idx" ON "public"."BillingTransaction"("providerTransactionId");

-- CreateIndex
CREATE INDEX "BillingTransaction_providerReference_idx" ON "public"."BillingTransaction"("providerReference");

-- CreateIndex
CREATE INDEX "BillingTransaction_transactionType_idx" ON "public"."BillingTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "BillingTransaction_transactionStatus_idx" ON "public"."BillingTransaction"("transactionStatus");

-- AddForeignKey
ALTER TABLE "public"."BillingTransaction" ADD CONSTRAINT "BillingTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."PlayerInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
