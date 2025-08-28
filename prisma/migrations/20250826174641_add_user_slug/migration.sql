/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "campsUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "coachSocial" JSONB;
ALTER TABLE "User" ADD COLUMN "conference" TEXT;
ALTER TABLE "User" ADD COLUMN "division" TEXT;
ALTER TABLE "User" ADD COLUMN "positionNeeds" JSONB;
ALTER TABLE "User" ADD COLUMN "preferredContact" TEXT;
ALTER TABLE "User" ADD COLUMN "programSocial" JSONB;
ALTER TABLE "User" ADD COLUMN "programWebsiteUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "questionnaireUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "recruitingUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "schoolMeta" JSONB;
ALTER TABLE "User" ADD COLUMN "slug" TEXT;
ALTER TABLE "User" ADD COLUMN "sport" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_slug_key" ON "User"("slug");
