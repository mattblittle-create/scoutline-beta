-- CreateEnum
CREATE TYPE "public"."TeamBillingMode" AS ENUM ('NORMAL', 'SPONSORED');

-- AlterTable
ALTER TABLE "public"."Team" ADD COLUMN     "billingMode" "public"."TeamBillingMode" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "sponsorName" TEXT,
ADD COLUMN     "sponsorNote" TEXT;
