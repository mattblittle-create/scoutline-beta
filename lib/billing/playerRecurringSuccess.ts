// lib/billing/playerRecurringSuccess.ts

import { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function inferCadence(value: string | null | undefined) {
  return String(value || "").toLowerCase() === "annual" ? "annual" : "monthly";
}

export async function markPlayerRecurringPaymentSucceeded(args: {
  invoiceId: string;
  amountPaidCents: number;
  cardFeeCents?: number;
  processorTransactionId?: string | null;
  processorResponseCode?: string | null;
  processorReceiptUrl?: string | null;
}) {
  const paidAt = new Date();

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.playerInvoice.findUnique({
      where: { id: args.invoiceId },
      include: {
        playerProfile: true,
      },
    });

    if (!invoice) {
      return { ok: false, error: "Invoice not found." };
    }

    if (invoice.status === InvoiceStatus.PAID) {
      return {
        ok: true,
        alreadyProcessed: true,
        invoiceId: invoice.id,
        playerProfileId: invoice.playerProfileId,
      };
    }

    const cadence = inferCadence(invoice.cadence);
    const nextPeriodEnd =
      cadence === "annual" ? addYears(paidAt, 1) : addMonths(paidAt, 1);

    await tx.playerInvoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.PAID,
        amountPaidCents: Math.max(0, Math.round(args.amountPaidCents)),
        cardFeeCents: Math.max(0, Math.round(args.cardFeeCents || 0)),
        paidAt,
        hostedUrl: args.processorReceiptUrl || invoice.hostedUrl,
        processorReceiptUrl:
          args.processorReceiptUrl || invoice.processorReceiptUrl,
        processorTransactionId:
          args.processorTransactionId || invoice.processorTransactionId,
        processorResponseCode:
          args.processorResponseCode || invoice.processorResponseCode,
        failedAttemptCount: 0,
        lastFailedAt: null,
        nextRetryAt: null,
        failureReason: null,
      },
    });

    await tx.playerProfile.update({
      where: { id: invoice.playerProfileId },
      data: {
        hasActivePlayerBilling: true,
        playerBillingStatus: "Active",
        playerCancelRequestedAt: null,
        playerCancelEffectiveAt: null,
      },
    });

    const existingUpcoming = await tx.playerInvoice.findFirst({
      where: {
        playerProfileId: invoice.playerProfileId,
        status: InvoiceStatus.UPCOMING,
        periodStart: { gte: paidAt },
      },
    });

    if (!existingUpcoming) {
      await tx.playerInvoice.create({
        data: {
          playerProfileId: invoice.playerProfileId,
          status: InvoiceStatus.UPCOMING,
          cadence,
          periodStart: paidAt,
          periodEnd: nextPeriodEnd,
          invoiceDate: paidAt,
          dueDate: nextPeriodEnd,
          amountCents: invoice.amountCents,
          cardFeeCents: 0,
          amountPaidCents: 0,
        },
      });
    }

    return {
      ok: true,
      alreadyProcessed: false,
      invoiceId: invoice.id,
      playerProfileId: invoice.playerProfileId,
    };
  });
}