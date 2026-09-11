-- CreateTable
CREATE TABLE "public"."BillingAuditLog" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL DEFAULT 'SYSTEM',
    "actorId" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingAuditLog_targetType_targetId_idx" ON "public"."BillingAuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "BillingAuditLog_eventType_idx" ON "public"."BillingAuditLog"("eventType");

-- CreateIndex
CREATE INDEX "BillingAuditLog_createdAt_idx" ON "public"."BillingAuditLog"("createdAt");
