// lib/billing/playerDunning.ts

import { prisma } from "@/lib/prisma";

import {
  PLAYER_BILLING_STATUS,
} from "@/lib/billing/constants";

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function markPlayerInvoicePaymentFailed(args: {
  invoiceId: string;
  reason?: string | null;
}) {
  const now = new Date();

  const invoice = await prisma.playerInvoice.findUnique({
    where: { id: args.invoiceId },
    select: {
      id: true,
      playerProfileId: true,
      failedAttemptCount: true,
    },
  });

  if (!invoice) {
    return { ok: false, error: "Invoice not found." };
  }

  const nextFailedAttemptCount = invoice.failedAttemptCount + 1;

  const nextRetryAt =
    nextFailedAttemptCount === 1
      ? addDays(now, 3)
      : nextFailedAttemptCount === 2
        ? addDays(now, 5)
        : addDays(now, 7);

  const shouldSuspend = nextFailedAttemptCount >= 3;

  await prisma.$transaction(async (tx) => {
    await tx.playerInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "PAST_DUE",
        failedAttemptCount: nextFailedAttemptCount,
        lastFailedAt: now,
        nextRetryAt,
        failureReason: args.reason || "Payment attempt failed.",
      },
    });

    await tx.playerProfile.update({
      where: { id: invoice.playerProfileId },
      data: {
        hasActivePlayerBilling: !shouldSuspend,
        playerBillingStatus: shouldSuspend
          ? PLAYER_BILLING_STATUS.SUSPENDED
          : PLAYER_BILLING_STATUS.PAST_DUE,
      },
    });
  });

  return {
    ok: true,
    invoiceId: invoice.id,
    failedAttemptCount: nextFailedAttemptCount,
    nextRetryAt,
    suspended: shouldSuspend,
  };
}