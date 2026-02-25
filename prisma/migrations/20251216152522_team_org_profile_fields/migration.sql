-- CreateEnum
CREATE TYPE "public"."TeamType" AS ENUM ('TRAVEL', 'HS', 'TRAINING', 'COLLEGE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."TeamRole" AS ENUM ('PLAYER', 'COACH', 'TEAM_ADMIN', 'RECRUITING_COACH');

-- CreateEnum
CREATE TYPE "public"."ProfileState" AS ENUM ('PLAYER_OWNED_ACTIVE', 'TEAM_OWNED_ACTIVE', 'TEAM_REMOVAL_PENDING_TRANSFER', 'ARCHIVED_NO_ACTIVE_PLAN');

-- CreateEnum
CREATE TYPE "public"."OwnershipMode" AS ENUM ('PLAYER_PRIMARY', 'TEAM_PRIMARY');

-- CreateEnum
CREATE TYPE "public"."ProfileViewSource" AS ENUM ('PUBLIC_PROFILE', 'SEARCH_RESULT', 'RECRUITING_BOARD', 'SHARED_LINK', 'COACH_TEASER_QR', 'INTERNAL_TOOL');

-- CreateEnum
CREATE TYPE "public"."ProfileViewerType" AS ENUM ('ANONYMOUS', 'PLAYER_SELF', 'PARENT', 'TEAM_COACH', 'TEAM_ADMIN', 'COLLEGE_COACH', 'SCOUTLINE_ADMIN');

-- CreateEnum
CREATE TYPE "public"."ProfileActorRole" AS ENUM ('PLAYER', 'PARENT', 'TEAM_ADMIN', 'TEAM_COACH', 'COLLEGE_COACH', 'SCOUTLINE_ADMIN');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('PROFILE_VIEWS_WEEKLY_DIGEST', 'PLAYER_ADDED_TO_RECRUITING_BOARD', 'PLAYER_REMOVED_FROM_TEAM', 'PLAYER_OWNERSHIP_CHANGED', 'COACH_MESSAGE');

-- AlterTable
ALTER TABLE "public"."PlayerProfile"
ADD COLUMN     "billingConflictFlag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasActivePlayerBilling" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasActiveTeamBilling" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ownerTeamId" TEXT,
ADD COLUMN     "ownershipMode" "public"."OwnershipMode" NOT NULL DEFAULT 'PLAYER_PRIMARY',
ADD COLUMN     "profileState" "public"."ProfileState" NOT NULL DEFAULT 'PLAYER_OWNED_ACTIVE';

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "collegeId" TEXT;

-- CreateTable
CREATE TABLE "public"."Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "teamType" "public"."TeamType" NOT NULL DEFAULT 'TRAVEL',
    "city" TEXT,
    "state" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "role" "public"."TeamRole" NOT NULL,
    "season" TEXT,
    "isPrimaryForProfile" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."College" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "conference" TEXT,
    "division" TEXT,
    "city" TEXT,
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "College_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamProfileSnapshot" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamProfileSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProfileChangeLog" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "public"."ProfileActorRole" NOT NULL,
    "changeSummary" TEXT NOT NULL,
    "diff" JSONB,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CoachNote" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "teamId" TEXT,
    "collegeId" TEXT,
    "noteText" TEXT NOT NULL,
    "sharedWithOrg" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProfileViewEvent" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "viewerUserId" TEXT,
    "viewerType" "public"."ProfileViewerType" NOT NULL,
    "source" "public"."ProfileViewSource" NOT NULL,
    "teamId" TEXT,
    "collegeId" TEXT,
    "ipHash" TEXT,
    "userAgentHash" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countedInWeekly" BOOLEAN NOT NULL DEFAULT false,
    "notifiedPlayer" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProfileViewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecruitingBoardEntry" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "addedByCoachId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedPlayer" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RecruitingBoardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "public"."Team"("slug");

-- CreateIndex
CREATE INDEX "TeamMembership_teamId_role_idx" ON "public"."TeamMembership"("teamId", "role");

-- CreateIndex
CREATE INDEX "TeamMembership_userId_role_idx" ON "public"."TeamMembership"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMembership_userId_teamId_role_season_key" ON "public"."TeamMembership"("userId", "teamId", "role", "season");

-- CreateIndex
CREATE UNIQUE INDEX "College_slug_key" ON "public"."College"("slug");

-- CreateIndex
CREATE INDEX "TeamProfileSnapshot_teamId_idx" ON "public"."TeamProfileSnapshot"("teamId");

-- CreateIndex
CREATE INDEX "TeamProfileSnapshot_playerProfileId_idx" ON "public"."TeamProfileSnapshot"("playerProfileId");

-- CreateIndex
CREATE INDEX "ProfileChangeLog_playerProfileId_idx" ON "public"."ProfileChangeLog"("playerProfileId");

-- CreateIndex
CREATE INDEX "ProfileChangeLog_actorUserId_idx" ON "public"."ProfileChangeLog"("actorUserId");

-- CreateIndex
CREATE INDEX "CoachNote_playerProfileId_idx" ON "public"."CoachNote"("playerProfileId");

-- CreateIndex
CREATE INDEX "CoachNote_coachUserId_idx" ON "public"."CoachNote"("coachUserId");

-- CreateIndex
CREATE INDEX "CoachNote_teamId_idx" ON "public"."CoachNote"("teamId");

-- CreateIndex
CREATE INDEX "CoachNote_collegeId_idx" ON "public"."CoachNote"("collegeId");

-- CreateIndex
CREATE INDEX "ProfileViewEvent_playerProfileId_viewedAt_idx" ON "public"."ProfileViewEvent"("playerProfileId", "viewedAt");

-- CreateIndex
CREATE INDEX "ProfileViewEvent_viewerUserId_idx" ON "public"."ProfileViewEvent"("viewerUserId");

-- CreateIndex
CREATE INDEX "ProfileViewEvent_teamId_idx" ON "public"."ProfileViewEvent"("teamId");

-- CreateIndex
CREATE INDEX "ProfileViewEvent_collegeId_idx" ON "public"."ProfileViewEvent"("collegeId");

-- CreateIndex
CREATE INDEX "RecruitingBoardEntry_collegeId_idx" ON "public"."RecruitingBoardEntry"("collegeId");

-- CreateIndex
CREATE INDEX "RecruitingBoardEntry_playerProfileId_idx" ON "public"."RecruitingBoardEntry"("playerProfileId");

-- CreateIndex
CREATE INDEX "RecruitingBoardEntry_addedByCoachId_idx" ON "public"."RecruitingBoardEntry"("addedByCoachId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitingBoardEntry_collegeId_playerProfileId_key" ON "public"."RecruitingBoardEntry"("collegeId", "playerProfileId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "public"."Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "public"."Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "PlayerProfile_ownerTeamId_idx" ON "public"."PlayerProfile"("ownerTeamId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlayerProfile" ADD CONSTRAINT "PlayerProfile_ownerTeamId_fkey" FOREIGN KEY ("ownerTeamId") REFERENCES "public"."Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMembership" ADD CONSTRAINT "TeamMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamProfileSnapshot" ADD CONSTRAINT "TeamProfileSnapshot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamProfileSnapshot" ADD CONSTRAINT "TeamProfileSnapshot_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "public"."PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileChangeLog" ADD CONSTRAINT "ProfileChangeLog_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "public"."PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileChangeLog" ADD CONSTRAINT "ProfileChangeLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoachNote" ADD CONSTRAINT "CoachNote_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "public"."PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoachNote" ADD CONSTRAINT "CoachNote_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoachNote" ADD CONSTRAINT "CoachNote_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoachNote" ADD CONSTRAINT "CoachNote_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileViewEvent" ADD CONSTRAINT "ProfileViewEvent_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "public"."PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileViewEvent" ADD CONSTRAINT "ProfileViewEvent_viewerUserId_fkey" FOREIGN KEY ("viewerUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileViewEvent" ADD CONSTRAINT "ProfileViewEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileViewEvent" ADD CONSTRAINT "ProfileViewEvent_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecruitingBoardEntry" ADD CONSTRAINT "RecruitingBoardEntry_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecruitingBoardEntry" ADD CONSTRAINT "RecruitingBoardEntry_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "public"."PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecruitingBoardEntry" ADD CONSTRAINT "RecruitingBoardEntry_addedByCoachId_fkey" FOREIGN KEY ("addedByCoachId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
