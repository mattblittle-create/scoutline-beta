/*
  Warnings:

  - A unique constraint covering the columns `[teamId,playerProfileId,role,season]` on the table `TeamMembership` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."DiscountType" AS ENUM ('PERCENT', 'FIXED', 'FREE_TRIAL', 'OVERRIDE_PRICE');

-- CreateEnum
CREATE TYPE "public"."DiscountAppliesTo" AS ENUM ('PLAYER', 'TEAM', 'BOTH');

-- CreateEnum
CREATE TYPE "public"."DiscountDurationType" AS ENUM ('ONCE', 'MONTHS', 'FOREVER');

-- CreateEnum
CREATE TYPE "public"."DiscountTargetType" AS ENUM ('PLAYER', 'TEAM');

-- CreateEnum
CREATE TYPE "public"."DiscountAppStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."TeamMembership" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "playerProfileId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."TeamInvite" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "parentEmail" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "public"."InviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdByUserId" TEXT,
    "acceptedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "TeamInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DiscountCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "public"."DiscountType" NOT NULL,
    "value" INTEGER NOT NULL,
    "appliesTo" "public"."DiscountAppliesTo" NOT NULL DEFAULT 'BOTH',
    "plansAllowedJson" TEXT NOT NULL DEFAULT '[]',
    "cadence" TEXT,
    "durationType" "public"."DiscountDurationType" NOT NULL DEFAULT 'ONCE',
    "durationMonths" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "oncePerTarget" BOOLEAN NOT NULL DEFAULT false,
    "allowedTargetIdsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DiscountApplication" (
    "id" TEXT NOT NULL,
    "discountCodeId" TEXT NOT NULL,
    "targetType" "public"."DiscountTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "planTier" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "status" "public"."DiscountAppStatus" NOT NULL DEFAULT 'ACTIVE',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "DiscountApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamInvite_teamId_status_idx" ON "public"."TeamInvite"("teamId", "status");

-- CreateIndex
CREATE INDEX "TeamInvite_invitedEmail_status_idx" ON "public"."TeamInvite"("invitedEmail", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvite_tokenHash_key" ON "public"."TeamInvite"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "public"."DiscountCode"("code");

-- CreateIndex
CREATE INDEX "DiscountApplication_targetType_targetId_status_idx" ON "public"."DiscountApplication"("targetType", "targetId", "status");

-- CreateIndex
CREATE INDEX "DiscountApplication_discountCodeId_status_idx" ON "public"."DiscountApplication"("discountCodeId", "status");

-- CreateIndex
CREATE INDEX "TeamMembership_playerProfileId_role_idx" ON "public"."TeamMembership"("playerProfileId", "role");

-- CreateIndex
CREATE INDEX "TeamMembership_teamId_isActive_idx" ON "public"."TeamMembership"("teamId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMembership_teamId_playerProfileId_role_season_key" ON "public"."TeamMembership"("teamId", "playerProfileId", "role", "season");

-- AddForeignKey
ALTER TABLE "public"."TeamMembership" ADD CONSTRAINT "TeamMembership_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "public"."PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamInvite" ADD CONSTRAINT "TeamInvite_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamInvite" ADD CONSTRAINT "TeamInvite_acceptedUserId_fkey" FOREIGN KEY ("acceptedUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamInvite" ADD CONSTRAINT "TeamInvite_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DiscountApplication" ADD CONSTRAINT "DiscountApplication_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "public"."DiscountCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
