-- CreateEnum
CREATE TYPE "public"."JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateTable
CREATE TABLE "public"."CoachJoinRequest" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "decidedByUserId" TEXT,
    "requestedRole" "public"."StaffRole" NOT NULL DEFAULT 'ASSISTANT',
    "proofUrl" TEXT,
    "notes" TEXT,
    "status" "public"."JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachJoinRequest_collegeId_status_idx" ON "public"."CoachJoinRequest"("collegeId", "status");

-- CreateIndex
CREATE INDEX "CoachJoinRequest_requestedByUserId_status_idx" ON "public"."CoachJoinRequest"("requestedByUserId", "status");

-- CreateIndex
CREATE INDEX "CoachJoinRequest_status_createdAt_idx" ON "public"."CoachJoinRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."CoachJoinRequest" ADD CONSTRAINT "CoachJoinRequest_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoachJoinRequest" ADD CONSTRAINT "CoachJoinRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CoachJoinRequest" ADD CONSTRAINT "CoachJoinRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
