-- AlterTable
ALTER TABLE "public"."CoachInvite" ADD COLUMN     "playerProfileId" TEXT;

-- AlterTable
ALTER TABLE "public"."CoachProfile" ADD COLUMN     "coachBio" TEXT;

-- AlterTable
ALTER TABLE "public"."College" ADD COLUMN     "programBio" TEXT;

-- CreateIndex
CREATE INDEX "College_programProfileUpdatedByUserId_idx" ON "public"."College"("programProfileUpdatedByUserId");

-- AddForeignKey
ALTER TABLE "public"."CoachInvite" ADD CONSTRAINT "CoachInvite_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "public"."PlayerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
