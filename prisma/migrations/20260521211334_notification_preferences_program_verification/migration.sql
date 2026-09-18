-- CreateEnum
CREATE TYPE "public"."VerificationSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PARTIALLY_APPROVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationType" ADD VALUE 'COACH_NEW_MATCH';
ALTER TYPE "public"."NotificationType" ADD VALUE 'COACH_PROGRAM_SAVED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'COACH_STAFF_INVITE_ACCEPTED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'COACH_JOIN_REQUEST_SUBMITTED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'COACH_PLAYER_LIST_ACTIVITY';
ALTER TYPE "public"."NotificationType" ADD VALUE 'COACH_SHARED_NOTE_ACTIVITY';
ALTER TYPE "public"."NotificationType" ADD VALUE 'COACH_WEEKLY_DIGEST';
ALTER TYPE "public"."NotificationType" ADD VALUE 'COACH_PROGRAM_VERIFICATION_REMINDER';
ALTER TYPE "public"."NotificationType" ADD VALUE 'PROGRAM_UPDATE_APPROVED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'PROGRAM_UPDATE_REJECTED';

-- CreateTable
CREATE TABLE "public"."NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instantChatMessages" BOOLEAN NOT NULL DEFAULT true,
    "digestChatMessages" BOOLEAN NOT NULL DEFAULT false,
    "instantProgramSaves" BOOLEAN NOT NULL DEFAULT true,
    "instantNewMatches" BOOLEAN NOT NULL DEFAULT true,
    "instantStaffActivity" BOOLEAN NOT NULL DEFAULT true,
    "weeklyDigest" BOOLEAN NOT NULL DEFAULT true,
    "verificationReminders" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CollegeProgramVerificationSubmission" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "status" "public"."VerificationSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "submittedData" JSONB NOT NULL,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "CollegeProgramVerificationSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "public"."NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "CollegeProgramVerificationSubmission_collegeId_idx" ON "public"."CollegeProgramVerificationSubmission"("collegeId");

-- CreateIndex
CREATE INDEX "CollegeProgramVerificationSubmission_submittedByUserId_idx" ON "public"."CollegeProgramVerificationSubmission"("submittedByUserId");

-- CreateIndex
CREATE INDEX "CollegeProgramVerificationSubmission_reviewedByUserId_idx" ON "public"."CollegeProgramVerificationSubmission"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "CollegeProgramVerificationSubmission_status_idx" ON "public"."CollegeProgramVerificationSubmission"("status");

-- CreateIndex
CREATE INDEX "CollegeProgramVerificationSubmission_createdAt_idx" ON "public"."CollegeProgramVerificationSubmission"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeProgramVerificationSubmission" ADD CONSTRAINT "CollegeProgramVerificationSubmission_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeProgramVerificationSubmission" ADD CONSTRAINT "CollegeProgramVerificationSubmission_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeProgramVerificationSubmission" ADD CONSTRAINT "CollegeProgramVerificationSubmission_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
