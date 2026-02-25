-- CreateEnum
CREATE TYPE "public"."CoachInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "public"."CoachInvite" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "public"."CoachInviteStatus" NOT NULL DEFAULT 'PENDING',
    "canEditLists" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "acceptedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "CoachInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachInvite_tokenHash_key" ON "public"."CoachInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "CoachInvite_collegeId_status_idx" ON "public"."CoachInvite"("collegeId", "status");

-- CreateIndex
CREATE INDEX "CoachInvite_invitedEmail_status_idx" ON "public"."CoachInvite"("invitedEmail", "status");

-- CreateIndex
CREATE INDEX "CoachInvite_createdByUserId_idx" ON "public"."CoachInvite"("createdByUserId");

-- CreateIndex
CREATE INDEX "CoachInvite_acceptedUserId_idx" ON "public"."CoachInvite"("acceptedUserId");

-- AddForeignKey
ALTER TABLE "public"."CoachInvite" ADD CONSTRAINT "CoachInvite_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoachInvite" ADD CONSTRAINT "CoachInvite_acceptedUserId_fkey" FOREIGN KEY ("acceptedUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoachInvite" ADD CONSTRAINT "CoachInvite_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
