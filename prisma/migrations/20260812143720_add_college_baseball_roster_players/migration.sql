-- CreateTable
CREATE TABLE "public"."CollegeBaseballRosterPlayer" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "programId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "positionRaw" TEXT,
    "primaryPosition" TEXT,
    "classYearRaw" TEXT,
    "classBucket" TEXT,
    "heightRaw" TEXT,
    "heightInches" INTEGER,
    "weightRaw" TEXT,
    "weightLb" INTEGER,
    "rosterProfileUrl" TEXT,
    "sourceUrl" TEXT,
    "sourceType" "public"."DataSourceType",
    "confidence" "public"."DataConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "CollegeBaseballRosterPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollegeBaseballRosterPlayer_programId_season_idx" ON "public"."CollegeBaseballRosterPlayer"("programId", "season");

-- CreateIndex
CREATE INDEX "CollegeBaseballRosterPlayer_season_idx" ON "public"."CollegeBaseballRosterPlayer"("season");

-- CreateIndex
CREATE INDEX "CollegeBaseballRosterPlayer_primaryPosition_idx" ON "public"."CollegeBaseballRosterPlayer"("primaryPosition");

-- CreateIndex
CREATE INDEX "CollegeBaseballRosterPlayer_classBucket_idx" ON "public"."CollegeBaseballRosterPlayer"("classBucket");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeBaseballRosterPlayer_programId_season_name_key" ON "public"."CollegeBaseballRosterPlayer"("programId", "season", "name");

-- AddForeignKey
ALTER TABLE "public"."CollegeBaseballRosterPlayer" ADD CONSTRAINT "CollegeBaseballRosterPlayer_programId_fkey" FOREIGN KEY ("programId") REFERENCES "public"."CollegeBaseballProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
