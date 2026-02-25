-- CreateTable
CREATE TABLE "public"."PlayerProfile" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,

    CONSTRAINT "PlayerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_email_key" ON "public"."PlayerProfile"("email");

-- CreateIndex
CREATE INDEX "PlayerProfile_email_idx" ON "public"."PlayerProfile"("email");
