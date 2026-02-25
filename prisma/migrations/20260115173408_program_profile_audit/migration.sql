-- AlterTable
ALTER TABLE "public"."College" ADD COLUMN     "programProfileUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "programProfileUpdatedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."College" ADD CONSTRAINT "College_programProfileUpdatedByUserId_fkey" FOREIGN KEY ("programProfileUpdatedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
