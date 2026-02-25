-- AlterTable
ALTER TABLE "public"."Team" ADD COLUMN     "billingCadence" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN     "billingStatus" TEXT NOT NULL DEFAULT 'Active',
ADD COLUMN     "planTier" "public"."Plan" NOT NULL DEFAULT 'TEAM';
