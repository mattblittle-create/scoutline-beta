/*
  Warnings:

  - You are about to drop the column `billingCadence` on the `PlayerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `billingMode` on the `PlayerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `billingStatus` on the `PlayerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `planTier` on the `PlayerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `sponsorName` on the `PlayerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `sponsorNote` on the `PlayerProfile` table. All the data in the column will be lost.
  - You are about to drop the `PlayerBillingProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlayerInvoice` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."PlayerBillingProfile" DROP CONSTRAINT "PlayerBillingProfile_playerProfileId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlayerInvoice" DROP CONSTRAINT "PlayerInvoice_playerProfileId_fkey";

-- AlterTable
ALTER TABLE "public"."PlayerProfile" DROP COLUMN "billingCadence",
DROP COLUMN "billingMode",
DROP COLUMN "billingStatus",
DROP COLUMN "planTier",
DROP COLUMN "sponsorName",
DROP COLUMN "sponsorNote",
ADD COLUMN     "playerBillingCadence" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN     "playerBillingStatus" TEXT NOT NULL DEFAULT 'Active',
ADD COLUMN     "playerPlanTier" "public"."Plan" NOT NULL DEFAULT 'REDSHIRT';

-- DropTable
DROP TABLE "public"."PlayerBillingProfile";

-- DropTable
DROP TABLE "public"."PlayerInvoice";

-- DropEnum
DROP TYPE "public"."PlayerBillingMode";
