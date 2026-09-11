// lib/billing/billingAudit.ts

import { prisma } from "@/lib/prisma";

type BillingAuditInput = {
  actorType?: string;
  actorId?: string | null;

  targetType: string;
  targetId: string;

  eventType: string;
  message: string;

  metadata?: any;

  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function createBillingAuditLog(
  input: BillingAuditInput
) {
  try {
    await prisma.billingAuditLog.create({
      data: {
        actorType: input.actorType || "SYSTEM",
        actorId: input.actorId || null,

        targetType: input.targetType,
        targetId: input.targetId,

        eventType: input.eventType,
        message: input.message,

        metadata: input.metadata || undefined,

        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
    });
  } catch (error) {
    console.error("BILLING_AUDIT_LOG_ERROR", error);
  }
}