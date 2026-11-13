ALTER TABLE "NotificationPreference" ADD COLUMN "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE "NotificationEmailDelivery" (
  "id" TEXT NOT NULL, "notificationId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0, "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3), "lastError" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationEmailDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NotificationEmailDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "NotificationEmailDelivery_notificationId_key" ON "NotificationEmailDelivery"("notificationId");
CREATE INDEX "NotificationEmailDelivery_status_nextAttemptAt_idx" ON "NotificationEmailDelivery"("status", "nextAttemptAt");
