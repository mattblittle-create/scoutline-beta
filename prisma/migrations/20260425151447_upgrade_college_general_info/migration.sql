-- CreateEnum
CREATE TYPE "public"."CollegeRegion" AS ENUM ('NORTHEAST', 'MID_ATLANTIC', 'SOUTHEAST', 'MIDWEST', 'SOUTHWEST', 'WEST', 'PACIFIC');

-- CreateEnum
CREATE TYPE "public"."CollegeControl" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "public"."CollegeSchoolType" AS ENUM ('FOUR_YEAR', 'TWO_YEAR', 'COMMUNITY_COLLEGE', 'JUNIOR_COLLEGE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."CollegeVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'NEEDS_REVIEW', 'BROKEN_LINK');

-- AlterTable
ALTER TABLE "public"."College" ADD COLUMN     "academicsUrl" TEXT,
ADD COLUMN     "acceptanceRate" DECIMAL(5,2),
ADD COLUMN     "admissionsUrl" TEXT,
ADD COLUMN     "applicationUrl" TEXT,
ADD COLUMN     "control" "public"."CollegeControl",
ADD COLUMN     "dataSourceUrl" TEXT,
ADD COLUMN     "enrollmentTotal" INTEGER,
ADD COLUMN     "enrollmentUndergrad" INTEGER,
ADD COLUMN     "financialAidUrl" TEXT,
ADD COLUMN     "graduationRate" DECIMAL(5,2),
ADD COLUMN     "lastVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "majorsUrl" TEXT,
ADD COLUMN     "region" "public"."CollegeRegion",
ADD COLUMN     "schoolType" "public"."CollegeSchoolType" NOT NULL DEFAULT 'FOUR_YEAR',
ADD COLUMN     "tuitionInState" INTEGER,
ADD COLUMN     "tuitionInternational" INTEGER,
ADD COLUMN     "tuitionOutOfState" INTEGER,
ADD COLUMN     "tuitionYear" INTEGER,
ADD COLUMN     "verificationStatus" "public"."CollegeVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';

-- CreateTable
CREATE TABLE "public"."CollegeAcademicArea" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "collegeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CollegeAcademicArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollegeAcademicArea_collegeId_idx" ON "public"."CollegeAcademicArea"("collegeId");

-- CreateIndex
CREATE INDEX "CollegeAcademicArea_name_idx" ON "public"."CollegeAcademicArea"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeAcademicArea_collegeId_name_key" ON "public"."CollegeAcademicArea"("collegeId", "name");

-- CreateIndex
CREATE INDEX "College_name_idx" ON "public"."College"("name");

-- CreateIndex
CREATE INDEX "College_state_idx" ON "public"."College"("state");

-- CreateIndex
CREATE INDEX "College_region_idx" ON "public"."College"("region");

-- CreateIndex
CREATE INDEX "College_control_idx" ON "public"."College"("control");

-- CreateIndex
CREATE INDEX "College_schoolType_idx" ON "public"."College"("schoolType");

-- AddForeignKey
ALTER TABLE "public"."CollegeAcademicArea" ADD CONSTRAINT "CollegeAcademicArea_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
