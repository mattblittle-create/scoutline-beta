-- CreateTable
CREATE TABLE "public"."CollegeSavedSchool" (
    "id" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "listName" TEXT NOT NULL DEFAULT 'Target Programs',
    "status" TEXT NOT NULL DEFAULT 'SAVED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollegeSavedSchool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollegeSavedSchool_playerProfileId_idx" ON "public"."CollegeSavedSchool"("playerProfileId");

-- CreateIndex
CREATE INDEX "CollegeSavedSchool_collegeId_idx" ON "public"."CollegeSavedSchool"("collegeId");

-- CreateIndex
CREATE INDEX "CollegeSavedSchool_listName_idx" ON "public"."CollegeSavedSchool"("listName");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeSavedSchool_playerProfileId_collegeId_key" ON "public"."CollegeSavedSchool"("playerProfileId", "collegeId");

-- AddForeignKey
ALTER TABLE "public"."CollegeSavedSchool" ADD CONSTRAINT "CollegeSavedSchool_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "public"."PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CollegeSavedSchool" ADD CONSTRAINT "CollegeSavedSchool_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "public"."College"("id") ON DELETE CASCADE ON UPDATE CASCADE;
