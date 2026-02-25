-- AlterTable
ALTER TABLE "public"."Player" ADD COLUMN     "committedProgram" TEXT,
ADD COLUMN     "committedProgramId" TEXT,
ADD COLUMN     "isCommitted" BOOLEAN NOT NULL DEFAULT false;
