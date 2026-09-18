/*
  Warnings:

  - A unique constraint covering the columns `[programId,importKey]` on the table `CollegeBaseballCoach` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."CollegeBaseballCoach" ADD COLUMN     "dataSource" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "importKey" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "manuallyVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "reviewStatus" TEXT,
ADD COLUMN     "sourceUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."Player" ADD COLUMN     "hometownZip" TEXT;

-- CreateIndex
CREATE INDEX "CollegeBaseballCoach_programId_isActive_idx" ON "public"."CollegeBaseballCoach"("programId", "isActive");

-- CreateIndex
CREATE INDEX "CollegeBaseballCoach_dataSource_idx" ON "public"."CollegeBaseballCoach"("dataSource");

-- CreateIndex
CREATE INDEX "CollegeBaseballCoach_reviewStatus_idx" ON "public"."CollegeBaseballCoach"("reviewStatus");

-- CreateIndex
CREATE INDEX "CollegeBaseballCoach_lastSeenAt_idx" ON "public"."CollegeBaseballCoach"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeBaseballCoach_programId_importKey_key" ON "public"."CollegeBaseballCoach"("programId", "importKey");
