-- CreateTable
CREATE TABLE "public"."CoachPlayerRating" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachPlayerRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachPlayerRating_collegeId_playerProfileId_idx" ON "public"."CoachPlayerRating"("collegeId", "playerProfileId");

-- CreateIndex
CREATE INDEX "CoachPlayerRating_coachUserId_idx" ON "public"."CoachPlayerRating"("coachUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachPlayerRating_collegeId_coachUserId_playerProfileId_key" ON "public"."CoachPlayerRating"("collegeId", "coachUserId", "playerProfileId");

-- AddForeignKey
ALTER TABLE "public"."CoachPlayerRating" ADD CONSTRAINT "CoachPlayerRating_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoachPlayerRating" ADD CONSTRAINT "CoachPlayerRating_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoachPlayerRating" ADD CONSTRAINT "CoachPlayerRating_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "public"."PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
