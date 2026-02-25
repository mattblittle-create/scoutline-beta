-- CreateEnum
CREATE TYPE "public"."CoachAccountType" AS ENUM ('COLLEGE_COACH', 'RECRUITING_SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."CoachBillingStatus" AS ENUM ('NONE', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateTable
CREATE TABLE "public"."CoachProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coachAccountType" "public"."CoachAccountType",
    "coachBillingStatus" "public"."CoachBillingStatus",
    "recruitingServiceName" TEXT,
    "recruitingServiceWebsite" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CoachBillingProfile" (
    "id" TEXT NOT NULL,
    "coachProfileId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'VALOR',
    "providerCustomerId" TEXT,
    "providerPaymentRef" TEXT,
    "paymentType" TEXT,
    "last4" TEXT,
    "brand" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachBillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_userId_key" ON "public"."CoachProfile"("userId");

-- CreateIndex
CREATE INDEX "CoachProfile_userId_idx" ON "public"."CoachProfile"("userId");

-- CreateIndex
CREATE INDEX "CoachProfile_coachAccountType_idx" ON "public"."CoachProfile"("coachAccountType");

-- CreateIndex
CREATE INDEX "CoachProfile_coachBillingStatus_idx" ON "public"."CoachProfile"("coachBillingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "CoachBillingProfile_coachProfileId_key" ON "public"."CoachBillingProfile"("coachProfileId");

-- CreateIndex
CREATE INDEX "CoachBillingProfile_coachProfileId_idx" ON "public"."CoachBillingProfile"("coachProfileId");

-- AddForeignKey
ALTER TABLE "public"."CoachProfile" ADD CONSTRAINT "CoachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoachBillingProfile" ADD CONSTRAINT "CoachBillingProfile_coachProfileId_fkey" FOREIGN KEY ("coachProfileId") REFERENCES "public"."CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
