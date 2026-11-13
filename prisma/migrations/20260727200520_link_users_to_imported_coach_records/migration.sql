/*
  Warnings:

  - A unique constraint covering the columns `[claimedByUserId]` on the table `CollegeBaseballCoach` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."CollegeBaseballCoach" ADD COLUMN     "claimedAt" TIMESTAMP(3),
ADD COLUMN     "claimedByUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CollegeBaseballCoach_claimedByUserId_key" ON "public"."CollegeBaseballCoach"("claimedByUserId");

-- CreateIndex
CREATE INDEX "CollegeBaseballCoach_claimedByUserId_idx" ON "public"."CollegeBaseballCoach"("claimedByUserId");

-- AddForeignKey
ALTER TABLE "public"."CollegeBaseballCoach" ADD CONSTRAINT "CollegeBaseballCoach_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
