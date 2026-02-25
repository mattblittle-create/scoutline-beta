-- CreateTable
CREATE TABLE "public"."RecruitingList" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruitingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecruitingListMember" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruitingListMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecruitingListAccess" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruitingListAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecruitingList_collegeId_createdAt_idx" ON "public"."RecruitingList"("collegeId", "createdAt");

-- CreateIndex
CREATE INDEX "RecruitingList_createdByUserId_idx" ON "public"."RecruitingList"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitingList_collegeId_name_key" ON "public"."RecruitingList"("collegeId", "name");

-- CreateIndex
CREATE INDEX "RecruitingListMember_listId_createdAt_idx" ON "public"."RecruitingListMember"("listId", "createdAt");

-- CreateIndex
CREATE INDEX "RecruitingListMember_playerProfileId_idx" ON "public"."RecruitingListMember"("playerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitingListMember_listId_playerProfileId_key" ON "public"."RecruitingListMember"("listId", "playerProfileId");

-- CreateIndex
CREATE INDEX "RecruitingListAccess_coachUserId_idx" ON "public"."RecruitingListAccess"("coachUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitingListAccess_listId_coachUserId_key" ON "public"."RecruitingListAccess"("listId", "coachUserId");

-- AddForeignKey
ALTER TABLE "public"."RecruitingList" ADD CONSTRAINT "RecruitingList_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecruitingList" ADD CONSTRAINT "RecruitingList_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecruitingListMember" ADD CONSTRAINT "RecruitingListMember_listId_fkey" FOREIGN KEY ("listId") REFERENCES "public"."RecruitingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecruitingListMember" ADD CONSTRAINT "RecruitingListMember_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "public"."PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecruitingListAccess" ADD CONSTRAINT "RecruitingListAccess_listId_fkey" FOREIGN KEY ("listId") REFERENCES "public"."RecruitingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecruitingListAccess" ADD CONSTRAINT "RecruitingListAccess_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
