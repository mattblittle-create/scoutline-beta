-- DropIndex
DROP INDEX "public"."PlayerProfile_userId_idx";

-- CreateTable
CREATE TABLE "public"."ParentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ParentPlayerLink" (
    "id" TEXT NOT NULL,
    "parentProfileId" TEXT NOT NULL,
    "playerProfileId" TEXT NOT NULL,
    "relationship" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentPlayerLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParentProfile_userId_key" ON "public"."ParentProfile"("userId");

-- CreateIndex
CREATE INDEX "ParentProfile_userId_idx" ON "public"."ParentProfile"("userId");

-- CreateIndex
CREATE INDEX "ParentPlayerLink_parentProfileId_idx" ON "public"."ParentPlayerLink"("parentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentPlayerLink_parentProfileId_playerProfileId_key" ON "public"."ParentPlayerLink"("parentProfileId", "playerProfileId");

-- AddForeignKey
ALTER TABLE "public"."ParentProfile" ADD CONSTRAINT "ParentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParentPlayerLink" ADD CONSTRAINT "ParentPlayerLink_parentProfileId_fkey" FOREIGN KEY ("parentProfileId") REFERENCES "public"."ParentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ParentPlayerLink" ADD CONSTRAINT "ParentPlayerLink_playerProfileId_fkey" FOREIGN KEY ("playerProfileId") REFERENCES "public"."PlayerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
