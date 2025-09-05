-- CreateEnum
CREATE TYPE "public"."Visibility" AS ENUM ('PUBLIC', 'PRIVATE', 'TEAM_ONLY', 'VERIFIED_ONLY');

-- CreateEnum
CREATE TYPE "public"."Plan" AS ENUM ('REDSHIRT', 'WALK_ON', 'ALL_AMERICAN', 'TEAM');

-- CreateTable
CREATE TABLE "public"."Player" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gradYear" INTEGER,
    "primaryPos" TEXT,
    "secondaryPos" TEXT,
    "throws" TEXT,
    "bats" TEXT,
    "heightIn" INTEGER,
    "weightLb" INTEGER,
    "hsName" TEXT,
    "travelTeam" TEXT,
    "hometown" TEXT,
    "state" TEXT,
    "gpa" DECIMAL(4,2),
    "act" INTEGER,
    "sat" INTEGER,
    "ncaaId" TEXT,
    "plan" "public"."Plan" NOT NULL DEFAULT 'REDSHIRT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_userId_key" ON "public"."Player"("userId");

-- AddForeignKey
ALTER TABLE "public"."Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
