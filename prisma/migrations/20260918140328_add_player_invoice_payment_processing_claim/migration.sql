-- AlterTable
ALTER TABLE "public"."PlayerInvoice" ADD COLUMN     "paymentProcessingAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PlayerInvoice_paymentProcessingAt_idx" ON "public"."PlayerInvoice"("paymentProcessingAt");
