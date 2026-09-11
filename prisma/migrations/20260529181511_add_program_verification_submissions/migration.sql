-- CreateEnum
CREATE TYPE "public"."ProgramVerificationSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."ProgramVerificationSubmission" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "baseballProgramId" TEXT,
    "submittedByUserId" TEXT,
    "status" "public"."ProgramVerificationSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "schoolName" TEXT,
    "nickname" TEXT,
    "division" TEXT,
    "conference" TEXT,
    "region" TEXT,
    "city" TEXT,
    "state" TEXT,
    "baseballWebsiteUrl" TEXT,
    "recruitingQuestionnaireUrl" TEXT,
    "recruitingPageUrl" TEXT,
    "rosterUrl" TEXT,
    "scheduleUrl" TEXT,
    "campsUrl" TEXT,
    "xUrl" TEXT,
    "instagramUrl" TEXT,
    "youtubeUrl" TEXT,
    "transferHeavy" BOOLEAN,
    "jucoFriendly" BOOLEAN,
    "averageGpa" TEXT,
    "rosterSize" INTEGER,
    "coachContacts" JSONB,
    "rosterNeeds" JSONB,
    "academicAreas" JSONB,
    "nilInfo" JSONB,
    "programMetrics" JSONB,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramVerificationSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramVerificationSubmission_collegeId_idx" ON "public"."ProgramVerificationSubmission"("collegeId");

-- CreateIndex
CREATE INDEX "ProgramVerificationSubmission_baseballProgramId_idx" ON "public"."ProgramVerificationSubmission"("baseballProgramId");

-- CreateIndex
CREATE INDEX "ProgramVerificationSubmission_submittedByUserId_idx" ON "public"."ProgramVerificationSubmission"("submittedByUserId");

-- CreateIndex
CREATE INDEX "ProgramVerificationSubmission_status_idx" ON "public"."ProgramVerificationSubmission"("status");
