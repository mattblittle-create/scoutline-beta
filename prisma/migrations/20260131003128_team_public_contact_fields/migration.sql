-- AlterTable
ALTER TABLE "public"."Team" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phoneExt" TEXT,
ADD COLUMN     "phonePrivate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "xUrl" TEXT;
