-- AlterTable
ALTER TABLE "public"."CollegeBaseballProgram" ADD COLUMN     "conferenceStrength" TEXT,
ADD COLUMN     "draftHistoryNotes" TEXT,
ADD COLUMN     "headCoachTenureYears" INTEGER,
ADD COLUMN     "playerDevelopmentNotes" TEXT,
ADD COLUMN     "recentWinPercentage" DECIMAL(5,2),
ADD COLUMN     "recruitingAggressiveness" TEXT,
ADD COLUMN     "regionalRecruitingBias" TEXT,
ADD COLUMN     "rosterTurnoverLevel" TEXT;
