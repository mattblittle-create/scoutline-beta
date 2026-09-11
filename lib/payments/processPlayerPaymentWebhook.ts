// lib/payments/processPlayerPaymentWebhook.ts

import { InvoiceStatus, Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createBillingAuditLog } from "@/lib/billing/billingAudit";
import { normalizeCents } from "@/lib/billing/money";
import {
  PAYMENT_PROVIDER_CODE,
  PLAYER_BILLING_CADENCE,
  PLAYER_BILLING_STATUS,
} from "@/lib/billing/constants";
import type {
  NormalizedPaymentWebhook,
  PaymentProviderCode,
} from "@/lib/payments/types";

function normalizePlan(value: string): Plan {
  const normalized = value.trim().toUpperCase();

  if (normalized === "WALK_ON") {
    return Plan.WALK_ON;
  }

  if (normalized === "ALL_AMERICAN") {
    return Plan.ALL_AMERICAN;
  }

  return Plan.REDSHIRT;
}

function inferCadenceFromInvoice(
  invoiceCadence: string | null | undefined
) {
  const normalized = String(invoiceCadence || "")
    .trim()
    .toLowerCase();

  return normalized ===
  PLAYER_BILLING_CADENCE.ANNUAL
  ? PLAYER_BILLING_CADENCE.ANNUAL
  : PLAYER_BILLING_CADENCE.MONTHLY;
}

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

export function getFailedInvoiceStatus(
  status: string
): InvoiceStatus {
  const normalized = String(status || "")
    .trim()
    .toUpperCase();

  if (
    normalized === "VOID" ||
    normalized === "VOIDED"
  ) {
    return InvoiceStatus.VOID;
  }

  return InvoiceStatus.PAST_DUE;
}

type ProcessPlayerPaymentWebhookInput = {
  provider: PaymentProviderCode;
  normalized: NormalizedPaymentWebhook;
};

export async function applySuccessfulPlayerPayment({
  provider,
  normalized,
}: ProcessPlayerPaymentWebhookInput) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.playerInvoice.findFirst({
      where: {
        externalId: normalized.reference,
      },
      include: {
        playerProfile: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new Error(
        `No PlayerInvoice found for reference ${normalized.reference}`
      );
    }

    if (invoice.status === InvoiceStatus.PAID) {
      return {
        alreadyProcessed: true,
        playerProfileId: invoice.playerProfileId,
      };
    }

    const paidAt = new Date();

    const cadence = inferCadenceFromInvoice(invoice.cadence);

    const plan = normalizePlan(
      invoice.playerProfile.playerPlanTier?.toString?.() ||
        "REDSHIRT"
    );

    const nextPeriodEnd =
      cadence ===
        PLAYER_BILLING_CADENCE.ANNUAL
        ? addYears(paidAt, 1)
        : addMonths(paidAt, 1);

// Normalized webhook amounts must always be expressed in cents.
// Valor card transaction webhooks already send amount and fee fields
// as integer cents. ACH providers must convert decimal-dollar values
// to cents inside their provider-specific normalizer.
// Provider normalizers must express all amounts in cents.
//
// Valor sends the base transaction amount separately from added
// fee fields. Fall back to the invoice values if the webhook omits
// either field so invoice accounting remains consistent.
const paidSubtotalCents =
  normalized.amount != null && normalized.amount >= 0
    ? normalizeCents(normalized.amount)
    : invoice.amountCents;

const cardFeeCents =
  normalized.surcharge != null && normalized.surcharge >= 0
    ? normalizeCents(normalized.surcharge)
    : invoice.cardFeeCents;

const totalPaidCents =
  paidSubtotalCents + cardFeeCents;

    await tx.playerInvoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        status: InvoiceStatus.PAID,
        amountPaidCents: totalPaidCents,
        cardFeeCents,
        paidAt,

        hostedUrl:
          normalized.receiptUrl ||
          invoice.hostedUrl,

        processorReceiptUrl:
          normalized.receiptUrl ||
          invoice.processorReceiptUrl,

        processorTransactionId:
          normalized.transactionId ||
          invoice.processorTransactionId,

        processorResponseCode:
          normalized.status ||
          invoice.processorResponseCode,
      },
    });

    await tx.playerProfile.update({
      where: {
        id: invoice.playerProfileId,
      },
      data: {
        hasActivePlayerBilling: true,
        billingConflictFlag: false,
        playerBillingStatus:
          PLAYER_BILLING_STATUS.ACTIVE,
        playerBillingCadence: cadence,
        playerPlanTier: plan,
        playerCancelRequestedAt: null,
        playerCancelEffectiveAt: null,
        profileState: "PLAYER_OWNED_ACTIVE",
      },
    });

    if (invoice.playerProfile.userId) {
      await tx.player.updateMany({
        where: {
          userId: invoice.playerProfile.userId,
        },
        data: {
          plan,
        },
      });
    }

    await tx.playerBillingProfile.upsert({
      where: {
        playerProfileId: invoice.playerProfileId,
      },
      update: {
        provider,

        // Only replace the stored token when the provider
        // actually returned a reusable payment reference.
        ...(normalized.providerPaymentRef
          ? {
              providerPaymentRef:
                normalized.providerPaymentRef,
            }
          : {}),

        paymentType:
          normalized.paymentType || undefined,

        last4:
          normalized.last4 || undefined,

        brand:
          normalized.brand || undefined,
      },
      create: {
        playerProfileId: invoice.playerProfileId,
        provider,

        providerPaymentRef:
          normalized.providerPaymentRef || null,

        paymentType:
          normalized.paymentType || undefined,

        last4:
          normalized.last4 || undefined,

        brand:
          normalized.brand || undefined,
      },
    });

    await createBillingAuditLog({
      actorType: "SYSTEM",

      targetType: "PLAYER_PROFILE",
      targetId: invoice.playerProfileId,

      eventType:
        normalized.rawEvent
          .toUpperCase()
          .includes("RECURRING")
          ? "RECURRING_PAYMENT_SUCCESS"
          : "PAYMENT_APPROVED",

      message:
        `Payment approved for invoice ${normalized.reference}.`,

      metadata: {
        provider,

        invoiceId: invoice.id,
        externalId: normalized.reference,

        amount: normalized.amount,
        surcharge: normalized.surcharge,

        paymentType: normalized.paymentType,
        brand: normalized.brand,
        last4: normalized.last4,

        transactionId: normalized.transactionId,
        receiptUrl: normalized.receiptUrl,

        providerPaymentRef:
          normalized.providerPaymentRef,
      },
    });

    const existingUpcoming =
      await tx.playerInvoice.findFirst({
        where: {
          playerProfileId:
            invoice.playerProfileId,

          status: InvoiceStatus.UPCOMING,

          periodStart: {
            gte: paidAt,
          },
        },
      });

if (!existingUpcoming) {
  await tx.playerInvoice.create({
    data: {
      playerProfileId:
        invoice.playerProfileId,

      status: InvoiceStatus.UPCOMING,
      cadence,

      periodStart: paidAt,
      periodEnd: nextPeriodEnd,

      invoiceDate: paidAt,
      dueDate: nextPeriodEnd,

      amountCents: invoice.amountCents,

      // Continue the same fee treatment for the next billing cycle.
      // ACH invoices will carry zero here.
      cardFeeCents: invoice.cardFeeCents,

      amountPaidCents: 0,
    },
  });
}

    return {
      alreadyProcessed: false,
      playerProfileId:
        invoice.playerProfileId,
    };
  });
}

export async function applyFailedPlayerPayment({
  provider,
  normalized,
}: ProcessPlayerPaymentWebhookInput) {
  return prisma.$transaction(async (tx) => {
    const invoice =
      await tx.playerInvoice.findFirst({
        where: {
          externalId:
            normalized.reference,
        },
        include: {
          playerProfile: true,
        },
      });

    if (!invoice) {
      return {
        found: false,
      };
    }

    const invoiceStatus =
      getFailedInvoiceStatus(
        normalized.status
      );

    /*
     * ACH transactions may first SETTLE and
     * later be RETURNED or CHARGEBACK.
     *
     * In that case the invoice may already
     * be PAID. Reverse the paid accounting
     * state so ScoutLine no longer treats
     * the payment as collected.
     */
    await tx.playerInvoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        status:
          invoiceStatus,

        amountPaidCents: 0,

        paidAt: null,

        processorTransactionId:
          normalized.transactionId ||
          invoice.processorTransactionId,

        processorResponseCode:
          normalized.status ||
          invoice.processorResponseCode,
      },
    });

    /*
     * A SETTLED payment creates the next
     * UPCOMING invoice. If that settled ACH
     * later returns or becomes a chargeback,
     * cancel that future billing cycle until
     * the payment issue is resolved.
     */
    await tx.playerInvoice.updateMany({
      where: {
        playerProfileId:
          invoice.playerProfileId,

        status:
          InvoiceStatus.UPCOMING,
      },
      data: {
        status:
          InvoiceStatus.VOID,
      },
    });

    await tx.playerProfile.update({
      where: {
        id:
          invoice.playerProfileId,
      },
      data: {
        hasActivePlayerBilling:
          false,

        playerBillingStatus:
          PLAYER_BILLING_STATUS.PAST_DUE,
      },
    });

    await createBillingAuditLog({
      actorType: "SYSTEM",

      targetType:
        "PLAYER_PROFILE",

      targetId:
        invoice.playerProfileId,

      eventType:
        normalized.rawEvent
          .toUpperCase()
          .includes("RECURRING")
          ? "RECURRING_PAYMENT_FAILED"
          : "PAYMENT_FAILED",

      message:
        `Payment failed for invoice ${normalized.reference}.`,

      metadata: {
        provider,

        invoiceId:
          invoice.id,

        externalId:
          normalized.reference,

        amount:
          normalized.amount,

        surcharge:
          normalized.surcharge,

        paymentType:
          normalized.paymentType,

        brand:
          normalized.brand,

        last4:
          normalized.last4,

        transactionId:
          normalized.transactionId,

        responseStatus:
          normalized.status,

        invoiceStatus,
      },
    });

    return {
      found: true,

      playerProfileId:
        invoice.playerProfileId,

      invoiceStatus,
    };
  });
}