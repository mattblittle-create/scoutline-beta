-- CreateEnum
CREATE TYPE "public"."StaffRole" AS ENUM ('HEAD', 'ASSISTANT', 'RECRUITING', 'ADMIN');

-- AlterTable
ALTER TABLE "public"."CoachInvite" ADD COLUMN     "staffRole" "public"."StaffRole" NOT NULL DEFAULT 'ASSISTANT';
