-- CreateEnum
CREATE TYPE "public"."CollegeAthleticDivision" AS ENUM ('NCAA_D1', 'NCAA_D2', 'NCAA_D3', 'NAIA', 'NJCAA_D1', 'NJCAA_D2', 'NJCAA_D3', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."CollegeRosterNeedLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."CollegeBaseballVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'NEEDS_REVIEW', 'BROKEN_LINK');

-- CreateTable
CREATE TABLE "public"."CollegeBaseballProgram" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "collegeId" TEXT NOT NULL,
    "nickname" TEXT,
    "logoUrl" TEXT,
    "baseballWebsiteUrl" TEXT,
    "rosterUrl" TEXT,
    "scheduleUrl" TEXT,
    "campsUrl" TEXT,
    "questionnaireUrl" TEXT,
    "generalContactUrl" TEXT,
    "generalContactEmail" TEXT,
    "division" "public"."CollegeAthleticDivision",
    "conference" TEXT,
    "currentRosterSize" INTEGER,
    "averageGpa" DECIMAL(4,2),
    "scholarshipNotes" TEXT,
    "scholarshipInfoUrl" TEXT,
    "transferHeavy" BOOLEAN NOT NULL DEFAULT false,
    "jucoFriendly" BOOLEAN NOT NULL DEFAULT false,
    "dataSourceUrl" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "verificationStatus" "public"."CollegeBaseballVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',

    CONSTRAINT "CollegeBaseballProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeBaseballCoach" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "bioUrl" TEXT,
    "contactUrl" TEXT,
    "isHeadCoach" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CollegeBaseballCoach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeBaseballRosterNeed" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "programId" TEXT NOT NULL,
    "gradYear" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    "needLevel" "public"."CollegeRosterNeedLevel" NOT NULL DEFAULT 'UNKNOWN',
    "notes" TEXT,
    "sourceUrl" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "CollegeBaseballRosterNeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeBaseballMetricAverage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "programId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "metricLabel" TEXT,
    "averageValue" DECIMAL(8,2),
    "minValue" DECIMAL(8,2),
    "maxValue" DECIMAL(8,2),
    "unit" TEXT,
    "sampleSize" INTEGER,
    "sourceUrl" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "CollegeBaseballMetricAverage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollegeBaseballProgram_collegeId_key" ON "public"."CollegeBaseballProgram"("collegeId");

-- CreateIndex
CREATE INDEX "CollegeBaseballProgram_division_idx" ON "public"."CollegeBaseballProgram"("division");

-- CreateIndex
CREATE INDEX "CollegeBaseballProgram_conference_idx" ON "public"."CollegeBaseballProgram"("conference");

-- CreateIndex
CREATE INDEX "CollegeBaseballProgram_transferHeavy_idx" ON "public"."CollegeBaseballProgram"("transferHeavy");

-- CreateIndex
CREATE INDEX "CollegeBaseballProgram_jucoFriendly_idx" ON "public"."CollegeBaseballProgram"("jucoFriendly");

-- CreateIndex
CREATE INDEX "CollegeBaseballCoach_programId_idx" ON "public"."CollegeBaseballCoach"("programId");

-- CreateIndex
CREATE INDEX "CollegeBaseballCoach_isHeadCoach_idx" ON "public"."CollegeBaseballCoach"("isHeadCoach");

-- CreateIndex
CREATE INDEX "CollegeBaseballRosterNeed_programId_idx" ON "public"."CollegeBaseballRosterNeed"("programId");

-- CreateIndex
CREATE INDEX "CollegeBaseballRosterNeed_gradYear_idx" ON "public"."CollegeBaseballRosterNeed"("gradYear");

-- CreateIndex
CREATE INDEX "CollegeBaseballRosterNeed_position_idx" ON "public"."CollegeBaseballRosterNeed"("position");

-- CreateIndex
CREATE INDEX "CollegeBaseballRosterNeed_needLevel_idx" ON "public"."CollegeBaseballRosterNeed"("needLevel");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeBaseballRosterNeed_programId_gradYear_position_key" ON "public"."CollegeBaseballRosterNeed"("programId", "gradYear", "position");

-- CreateIndex
CREATE INDEX "CollegeBaseballMetricAverage_programId_idx" ON "public"."CollegeBaseballMetricAverage"("programId");

-- CreateIndex
CREATE INDEX "CollegeBaseballMetricAverage_position_idx" ON "public"."CollegeBaseballMetricAverage"("position");

-- CreateIndex
CREATE INDEX "CollegeBaseballMetricAverage_metricKey_idx" ON "public"."CollegeBaseballMetricAverage"("metricKey");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeBaseballMetricAverage_programId_position_metricKey_key" ON "public"."CollegeBaseballMetricAverage"("programId", "position", "metricKey");

-- AddForeignKey
ALTER TABLE "public"."CollegeBaseballProgram" ADD CONSTRAINT "CollegeBaseballProgram_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeBaseballCoach" ADD CONSTRAINT "CollegeBaseballCoach_programId_fkey" FOREIGN KEY ("programId") REFERENCES "public"."CollegeBaseballProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeBaseballRosterNeed" ADD CONSTRAINT "CollegeBaseballRosterNeed_programId_fkey" FOREIGN KEY ("programId") REFERENCES "public"."CollegeBaseballProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeBaseballMetricAverage" ADD CONSTRAINT "CollegeBaseballMetricAverage_programId_fkey" FOREIGN KEY ("programId") REFERENCES "public"."CollegeBaseballProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
