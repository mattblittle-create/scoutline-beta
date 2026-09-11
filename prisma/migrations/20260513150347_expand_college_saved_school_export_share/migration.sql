-- AlterTable
ALTER TABLE "public"."CollegeSavedSchool" ADD COLUMN     "boardGroup" TEXT,
ADD COLUMN     "exportInclude" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "matchLabel" TEXT,
ADD COLUMN     "matchScore" INTEGER,
ADD COLUMN     "narrativeHeadline" TEXT,
ADD COLUMN     "narrativeStrategy" TEXT,
ADD COLUMN     "narrativeSummary" TEXT,
ADD COLUMN     "opportunityArchetype" TEXT,
ADD COLUMN     "opportunityLabel" TEXT,
ADD COLUMN     "opportunityScore" INTEGER,
ADD COLUMN     "strategyCategory" TEXT,
ADD COLUMN     "strategyExplanation" TEXT;

-- CreateIndex
CREATE INDEX "CollegeSavedSchool_status_idx" ON "public"."CollegeSavedSchool"("status");

-- CreateIndex
CREATE INDEX "CollegeSavedSchool_priority_idx" ON "public"."CollegeSavedSchool"("priority");

-- CreateIndex
CREATE INDEX "CollegeSavedSchool_strategyCategory_idx" ON "public"."CollegeSavedSchool"("strategyCategory");

-- CreateIndex
CREATE INDEX "CollegeSavedSchool_exportInclude_idx" ON "public"."CollegeSavedSchool"("exportInclude");
