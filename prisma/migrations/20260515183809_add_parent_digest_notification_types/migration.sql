-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationType" ADD VALUE 'PARENT_COACH_ACTIVITY';
ALTER TYPE "public"."NotificationType" ADD VALUE 'PARENT_UNREAD_MESSAGE_BADGE';
ALTER TYPE "public"."NotificationType" ADD VALUE 'PARENT_PROFILE_COMPLETION';
ALTER TYPE "public"."NotificationType" ADD VALUE 'PARENT_RECRUITING_PROGRESS';
ALTER TYPE "public"."NotificationType" ADD VALUE 'PARENT_BILLING_ALERT';
ALTER TYPE "public"."NotificationType" ADD VALUE 'PARENT_WEEKLY_DIGEST';
ALTER TYPE "public"."NotificationType" ADD VALUE 'BILLING_UPCOMING_INVOICE';
ALTER TYPE "public"."NotificationType" ADD VALUE 'BILLING_PAYMENT_REMINDER';
ALTER TYPE "public"."NotificationType" ADD VALUE 'BILLING_PAYMENT_FAILED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'BILLING_PAST_DUE';
ALTER TYPE "public"."NotificationType" ADD VALUE 'BILLING_CARD_UPDATE_REQUIRED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'BILLING_PLAN_CHANGED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'BILLING_CANCELLATION_REQUESTED';
ALTER TYPE "public"."NotificationType" ADD VALUE 'BILLING_CANCELLATION_CONFIRMED';
