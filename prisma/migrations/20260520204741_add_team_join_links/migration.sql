-- CreateTable
CREATE TABLE "public"."TeamJoinLink" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamJoinLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamJoinLink_code_key" ON "public"."TeamJoinLink"("code");

-- CreateIndex
CREATE INDEX "TeamJoinLink_teamId_idx" ON "public"."TeamJoinLink"("teamId");

-- AddForeignKey
ALTER TABLE "public"."TeamJoinLink" ADD CONSTRAINT "TeamJoinLink_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
