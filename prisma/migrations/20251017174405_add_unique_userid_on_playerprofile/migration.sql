/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `PlayerProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Player" ADD COLUMN     "publicEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "publicVisibility" "public"."Visibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "public"."PlayerProfile" ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "public"."PublicProfileCache" (
    "slug" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "PublicProfileCache_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE INDEX "PublicProfileCache_userId_idx" ON "public"."PublicProfileCache"("userId");

-- CreateIndex
CREATE INDEX "PlayerProfile_userId_idx" ON "public"."PlayerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_userId_key" ON "public"."PlayerProfile"("userId");

-- AddForeignKey
ALTER TABLE "public"."PlayerProfile" ADD CONSTRAINT "PlayerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PublicProfileCache" ADD CONSTRAINT "PublicProfileCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
