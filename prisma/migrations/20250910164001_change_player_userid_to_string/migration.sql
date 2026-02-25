/*
  Warnings:

  - The primary key for the `Player` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Player` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('Male', 'Female');

-- DropForeignKey
ALTER TABLE "public"."Player" DROP CONSTRAINT "Player_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Player" DROP CONSTRAINT "Player_pkey",
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "dobPrivate" BOOLEAN DEFAULT true,
ADD COLUMN     "gender" "public"."Gender",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Player_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "Player_userId_idx" ON "public"."Player"("userId");

-- AddForeignKey
ALTER TABLE "public"."Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
