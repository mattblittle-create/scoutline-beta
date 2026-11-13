-- AlterTable
ALTER TABLE "public"."PlayerInvoice" ADD COLUMN     "cardFeeCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processorReceiptUrl" TEXT,
ADD COLUMN     "processorResponseCode" TEXT,
ADD COLUMN     "processorTransactionId" TEXT;
