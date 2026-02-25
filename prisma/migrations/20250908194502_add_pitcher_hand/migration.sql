-- CreateEnum
CREATE TYPE "public"."PitcherHand" AS ENUM ('RHP', 'LHP');

-- AlterTable
ALTER TABLE "public"."Player" ADD COLUMN     "pitcherHand" "public"."PitcherHand";
