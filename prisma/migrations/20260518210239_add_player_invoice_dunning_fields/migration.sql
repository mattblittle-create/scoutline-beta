-- AlterTable
ALTER TABLE "public"."PlayerInvoice" ADD COLUMN     "failedAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "lastFailedAt" TIMESTAMP(3),
ADD COLUMN     "nextRetryAt" TIMESTAMP(3);
