-- CreateTable
CREATE TABLE "public"."CoachJoinLink" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachJoinLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachJoinLink_code_key" ON "public"."CoachJoinLink"("code");

-- CreateIndex
CREATE INDEX "CoachJoinLink_collegeId_idx" ON "public"."CoachJoinLink"("collegeId");

-- AddForeignKey
ALTER TABLE "public"."CoachJoinLink" ADD CONSTRAINT "CoachJoinLink_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
