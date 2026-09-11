-- CreateEnum
CREATE TYPE "public"."DataConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'ESTIMATED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."DataSourceType" AS ENUM ('OFFICIAL_SCHOOL', 'OFFICIAL_ATHLETICS', 'GOVERNMENT', 'CONFERENCE', 'NCAA', 'NAIA', 'NJCAA', 'COLLECTIVE', 'THIRD_PARTY', 'COACH_VERIFIED', 'USER_SUBMITTED', 'INTERNAL_ESTIMATE');

-- CreateEnum
CREATE TYPE "public"."NilStrengthTier" AS ENUM ('ELITE', 'STRONG', 'COMPETITIVE', 'EMERGING', 'LIMITED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."SportKey" AS ENUM ('BASEBALL', 'SOFTBALL', 'FOOTBALL', 'MENS_BASKETBALL', 'WOMENS_BASKETBALL', 'MENS_SOCCER', 'WOMENS_SOCCER', 'VOLLEYBALL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."CampusSetting" AS ENUM ('URBAN', 'SUBURBAN', 'RURAL', 'SMALL_TOWN', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."PortalActivityLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN');

-- CreateTable
CREATE TABLE "public"."CollegeAcademicProfile" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "majorsSummary" TEXT,
    "strongestMajors" TEXT,
    "academicStrengthTags" TEXT,
    "intendedMajorCategories" TEXT,
    "sportsManagement" BOOLEAN NOT NULL DEFAULT false,
    "kinesiology" BOOLEAN NOT NULL DEFAULT false,
    "business" BOOLEAN NOT NULL DEFAULT false,
    "engineering" BOOLEAN NOT NULL DEFAULT false,
    "nursing" BOOLEAN NOT NULL DEFAULT false,
    "communications" BOOLEAN NOT NULL DEFAULT false,
    "education" BOOLEAN NOT NULL DEFAULT false,
    "biologyPreMed" BOOLEAN NOT NULL DEFAULT false,
    "majorsUrl" TEXT,
    "sourceUrl" TEXT,
    "sourceType" "public"."DataSourceType",
    "confidence" "public"."DataConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeAcademicProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeAdmissionsProfile" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "applicationUrl" TEXT,
    "admissionsContactUrl" TEXT,
    "admissionsEmail" TEXT,
    "admissionsPhone" TEXT,
    "applicationDeadline" TEXT,
    "testOptional" BOOLEAN,
    "transferFriendly" BOOLEAN,
    "freshmanRetentionRate" DECIMAL(5,2),
    "averageGpa" DECIMAL(4,2),
    "averageSat" INTEGER,
    "averageAct" INTEGER,
    "sourceUrl" TEXT,
    "sourceType" "public"."DataSourceType",
    "confidence" "public"."DataConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeAdmissionsProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeFinancialProfile" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "averageNetCostCents" INTEGER,
    "averageAidAwardCents" INTEGER,
    "meritAidStrength" TEXT,
    "needBasedAidStrength" TEXT,
    "outOfStateValueRating" TEXT,
    "inStateValueRating" TEXT,
    "financialAidUrl" TEXT,
    "scholarshipUrl" TEXT,
    "costOfAttendanceUrl" TEXT,
    "sourceUrl" TEXT,
    "sourceType" "public"."DataSourceType",
    "confidence" "public"."DataConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeFinancialProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeCampusProfile" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "campusSetting" "public"."CampusSetting" NOT NULL DEFAULT 'UNKNOWN',
    "faithBased" BOOLEAN NOT NULL DEFAULT false,
    "hbcu" BOOLEAN NOT NULL DEFAULT false,
    "militaryCollege" BOOLEAN NOT NULL DEFAULT false,
    "commuterFriendly" BOOLEAN NOT NULL DEFAULT false,
    "greekLifePresence" BOOLEAN,
    "nearestMajorCity" TEXT,
    "distanceToAirport" TEXT,
    "climateCategory" TEXT,
    "campusLifeSummary" TEXT,
    "sourceUrl" TEXT,
    "sourceType" "public"."DataSourceType",
    "confidence" "public"."DataConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeCampusProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeNilProfile" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "nilAvailable" BOOLEAN NOT NULL DEFAULT false,
    "overallNilStrength" "public"."NilStrengthTier" NOT NULL DEFAULT 'UNKNOWN',
    "baseballNilStrength" "public"."NilStrengthTier" NOT NULL DEFAULT 'UNKNOWN',
    "localMarketScore" INTEGER,
    "localBusinessSupportScore" INTEGER,
    "athleteBrandSupport" TEXT,
    "nilSummary" TEXT,
    "nilNotes" TEXT,
    "sourceUrl" TEXT,
    "sourceType" "public"."DataSourceType",
    "confidence" "public"."DataConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeNilProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeNilCollective" (
    "id" TEXT NOT NULL,
    "nilProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "xUrl" TEXT,
    "instagramUrl" TEXT,
    "contactEmail" TEXT,
    "contactUrl" TEXT,
    "estimatedAnnualValueCents" INTEGER,
    "fundingTier" "public"."NilStrengthTier" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "sourceUrl" TEXT,
    "sourceType" "public"."DataSourceType",
    "confidence" "public"."DataConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeNilCollective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeNilSportAllocation" (
    "id" TEXT NOT NULL,
    "collectiveId" TEXT NOT NULL,
    "sport" "public"."SportKey" NOT NULL,
    "estimatedAnnualAllocationCents" INTEGER,
    "allocationPercent" DECIMAL(5,2),
    "strengthTier" "public"."NilStrengthTier" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "sourceUrl" TEXT,
    "sourceType" "public"."DataSourceType",
    "confidence" "public"."DataConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeNilSportAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeBaseballRosterSnapshot" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "rosterSize" INTEGER,
    "freshmen" INTEGER,
    "sophomores" INTEGER,
    "juniors" INTEGER,
    "seniors" INTEGER,
    "graduateStudents" INTEGER,
    "pitchers" INTEGER,
    "catchers" INTEGER,
    "infielders" INTEGER,
    "outfielders" INTEGER,
    "twoWayPlayers" INTEGER,
    "leftHandedPitchers" INTEGER,
    "rightHandedPitchers" INTEGER,
    "sourceUrl" TEXT,
    "sourceType" "public"."DataSourceType",
    "confidence" "public"."DataConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeBaseballRosterSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeBaseballPortalActivity" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "transfersIn" INTEGER,
    "transfersOut" INTEGER,
    "jucoTransfersIn" INTEGER,
    "d1TransfersIn" INTEGER,
    "d2TransfersIn" INTEGER,
    "portalActivityLevel" "public"."PortalActivityLevel" NOT NULL DEFAULT 'UNKNOWN',
    "transferHeavy" BOOLEAN NOT NULL DEFAULT false,
    "jucoFriendly" BOOLEAN NOT NULL DEFAULT false,
    "portalNotes" TEXT,
    "sourceUrl" TEXT,
    "sourceType" "public"."DataSourceType",
    "confidence" "public"."DataConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeBaseballPortalActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeBaseballProgramOutcome" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "wins" INTEGER,
    "losses" INTEGER,
    "conferenceWins" INTEGER,
    "conferenceLosses" INTEGER,
    "postseasonResult" TEXT,
    "mlbDraftPicks" INTEGER,
    "proSignings" INTEGER,
    "notableAlumni" TEXT,
    "developmentNotes" TEXT,
    "sourceUrl" TEXT,
    "sourceType" "public"."DataSourceType",
    "confidence" "public"."DataConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeBaseballProgramOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollegeAcademicProfile_collegeId_key" ON "public"."CollegeAcademicProfile"("collegeId");

-- CreateIndex
CREATE INDEX "CollegeAcademicProfile_sportsManagement_idx" ON "public"."CollegeAcademicProfile"("sportsManagement");

-- CreateIndex
CREATE INDEX "CollegeAcademicProfile_business_idx" ON "public"."CollegeAcademicProfile"("business");

-- CreateIndex
CREATE INDEX "CollegeAcademicProfile_engineering_idx" ON "public"."CollegeAcademicProfile"("engineering");

-- CreateIndex
CREATE INDEX "CollegeAcademicProfile_nursing_idx" ON "public"."CollegeAcademicProfile"("nursing");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeAdmissionsProfile_collegeId_key" ON "public"."CollegeAdmissionsProfile"("collegeId");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeFinancialProfile_collegeId_key" ON "public"."CollegeFinancialProfile"("collegeId");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeCampusProfile_collegeId_key" ON "public"."CollegeCampusProfile"("collegeId");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeNilProfile_collegeId_key" ON "public"."CollegeNilProfile"("collegeId");

-- CreateIndex
CREATE INDEX "CollegeNilProfile_overallNilStrength_idx" ON "public"."CollegeNilProfile"("overallNilStrength");

-- CreateIndex
CREATE INDEX "CollegeNilProfile_baseballNilStrength_idx" ON "public"."CollegeNilProfile"("baseballNilStrength");

-- CreateIndex
CREATE INDEX "CollegeNilCollective_nilProfileId_idx" ON "public"."CollegeNilCollective"("nilProfileId");

-- CreateIndex
CREATE INDEX "CollegeNilCollective_fundingTier_idx" ON "public"."CollegeNilCollective"("fundingTier");

-- CreateIndex
CREATE INDEX "CollegeNilSportAllocation_sport_idx" ON "public"."CollegeNilSportAllocation"("sport");

-- CreateIndex
CREATE INDEX "CollegeNilSportAllocation_strengthTier_idx" ON "public"."CollegeNilSportAllocation"("strengthTier");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeNilSportAllocation_collectiveId_sport_key" ON "public"."CollegeNilSportAllocation"("collectiveId", "sport");

-- CreateIndex
CREATE INDEX "CollegeBaseballRosterSnapshot_programId_idx" ON "public"."CollegeBaseballRosterSnapshot"("programId");

-- CreateIndex
CREATE INDEX "CollegeBaseballRosterSnapshot_season_idx" ON "public"."CollegeBaseballRosterSnapshot"("season");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeBaseballRosterSnapshot_programId_season_key" ON "public"."CollegeBaseballRosterSnapshot"("programId", "season");

-- CreateIndex
CREATE INDEX "CollegeBaseballPortalActivity_programId_idx" ON "public"."CollegeBaseballPortalActivity"("programId");

-- CreateIndex
CREATE INDEX "CollegeBaseballPortalActivity_season_idx" ON "public"."CollegeBaseballPortalActivity"("season");

-- CreateIndex
CREATE INDEX "CollegeBaseballPortalActivity_portalActivityLevel_idx" ON "public"."CollegeBaseballPortalActivity"("portalActivityLevel");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeBaseballPortalActivity_programId_season_key" ON "public"."CollegeBaseballPortalActivity"("programId", "season");

-- CreateIndex
CREATE INDEX "CollegeBaseballProgramOutcome_programId_idx" ON "public"."CollegeBaseballProgramOutcome"("programId");

-- CreateIndex
CREATE INDEX "CollegeBaseballProgramOutcome_season_idx" ON "public"."CollegeBaseballProgramOutcome"("season");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeBaseballProgramOutcome_programId_season_key" ON "public"."CollegeBaseballProgramOutcome"("programId", "season");

-- AddForeignKey
ALTER TABLE "public"."CollegeAcademicProfile" ADD CONSTRAINT "CollegeAcademicProfile_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeAdmissionsProfile" ADD CONSTRAINT "CollegeAdmissionsProfile_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeFinancialProfile" ADD CONSTRAINT "CollegeFinancialProfile_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeCampusProfile" ADD CONSTRAINT "CollegeCampusProfile_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeNilProfile" ADD CONSTRAINT "CollegeNilProfile_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeNilCollective" ADD CONSTRAINT "CollegeNilCollective_nilProfileId_fkey" FOREIGN KEY ("nilProfileId") REFERENCES "public"."CollegeNilProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeNilSportAllocation" ADD CONSTRAINT "CollegeNilSportAllocation_collectiveId_fkey" FOREIGN KEY ("collectiveId") REFERENCES "public"."CollegeNilCollective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeBaseballRosterSnapshot" ADD CONSTRAINT "CollegeBaseballRosterSnapshot_programId_fkey" FOREIGN KEY ("programId") REFERENCES "public"."CollegeBaseballProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeBaseballPortalActivity" ADD CONSTRAINT "CollegeBaseballPortalActivity_programId_fkey" FOREIGN KEY ("programId") REFERENCES "public"."CollegeBaseballProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeBaseballProgramOutcome" ADD CONSTRAINT "CollegeBaseballProgramOutcome_programId_fkey" FOREIGN KEY ("programId") REFERENCES "public"."CollegeBaseballProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
