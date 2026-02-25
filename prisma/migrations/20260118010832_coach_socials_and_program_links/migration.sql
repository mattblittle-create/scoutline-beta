-- AlterTable
ALTER TABLE "public"."CoachProfile" ADD COLUMN     "coachInstagramUrl" TEXT,
ADD COLUMN     "coachXUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."College" ADD COLUMN     "programInstagramUrl" TEXT,
ADD COLUMN     "programXUrl" TEXT,
ADD COLUMN     "recruitingQuestionnaireUrl" TEXT;
