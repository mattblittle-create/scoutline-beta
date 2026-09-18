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

  /*
   * ACH settlement webhooks may provide the
   * matched BillingTransaction so the provider
   * state transition and ScoutLine payment
   * activation occur atomically.
   *
   * Other providers may omit this and retain
   * the existing behavior.
   */
  billingTransactionId?: string;
  rawPayload?: unknown;
};

export async function applySuccessfulPlayerPayment({
  provider,
  normalized,
  billingTransactionId,
  rawPayload,
}: ProcessPlayerPaymentWebhookInput) {
  return prisma.$transaction(async (tx) => {
        /*
     * When processing an ACH SETTLED webhook,
     * atomically claim the provider transition
     * before applying ScoutLine's paid state.
     *
     * Only pre-terminal ACH states may settle.
     * This prevents stale or replayed SETTLED
     * webhooks from overwriting FAILED, VOIDED,
     * RETURNED, or CHARGEBACK transactions.
     *
     * Because this transition occurs inside the
     * same Prisma transaction as the invoice and
     * profile updates below, a downstream failure
     * rolls the provider transition back as well.
     */
    if (billingTransactionId) {
      const transition =
        await tx.billingTransaction.updateMany({
          where: {
            id:
              billingTransactionId,

            provider,

            transactionStatus: {
              in: [
                "PENDING",
                "APPROVED",
                "SETTLING",
                "UNKNOWN",
              ],
            },
          },

          data: {
            transactionStatus:
              "SETTLED",

            responseMessage:
              "SETTLED",

            rawPayload:
              rawPayload as any,
          },
        });

      if (
        transition.count !== 1
      ) {
        return {
          alreadyProcessed:
            true,

          settlementApplied:
            false,
        };
      }
    }
    const invoice = await tx.playerInvoice.findFirst({
      where: {
        OR: [
          {
            externalId: normalized.reference,
          },
          {
            id: normalized.reference,
          },
        ],
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

    // A successful settlement is authoritative.
    // Clear any stale dunning or processing state that may
    // remain from an earlier failed recurring payment attempt.
    failedAttemptCount: 0,
    lastFailedAt: null,
    nextRetryAt: null,
    failureReason: null,
    paymentProcessingAt: null,

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
  settlementApplied:
    billingTransactionId
      ? true
      : undefined,
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
          OR: [
            {
              externalId:
                normalized.reference,
            },
            {
              id:
                normalized.reference,
            },
          ],
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

type ApplyFailedPlayerPaymentWithDunningInput = {
  provider: PaymentProviderCode;
  normalized: NormalizedPaymentWebhook;
  billingTransactionId: string;
  rawPayload: unknown;
};

function addDunningDays(
  date: Date,
  days: number
) {
  return new Date(
    date.getTime() +
      days * 24 * 60 * 60 * 1000
  );
}

export async function applyFailedPlayerPaymentWithDunning({
  provider,
  normalized,
  billingTransactionId,
  rawPayload,
}: ApplyFailedPlayerPaymentWithDunningInput) {
  return prisma.$transaction(
    async (tx) => {
      /*
       * Atomically claim the transition into FAILED.
       *
       * Only a transaction that has not already been
       * recorded as FAILED may perform the dunning
       * side effects below. This makes replayed or
       * concurrent FAILED webhooks idempotent.
       */
      const transition =
        await tx.billingTransaction.updateMany({
          where: {
            id:
              billingTransactionId,

            provider,

            transactionStatus: {
              in: [
                "PENDING",
                "APPROVED",
                "SETTLING",
                "UNKNOWN",
              ],
            },
          },

          data: {
            transactionStatus:
              "FAILED",

            responseMessage:
              normalized.status,

            rawPayload:
              rawPayload as any,
          },
        });

      if (
        transition.count !== 1
      ) {
        return {
          alreadyProcessed:
            true,

          dunningApplied:
            false,
        };
      }

      const invoice =
        await tx.playerInvoice.findFirst({
          where: {
            OR: [
              {
                externalId:
                  normalized.reference,
              },
              {
                id:
                  normalized.reference,
              },
            ],
          },

          include: {
            playerProfile:
              true,
          },
        });

      if (!invoice) {
        throw new Error(
          `No PlayerInvoice found for reference ${normalized.reference}`
        );
      }

      const now =
        new Date();

      const nextFailedAttemptCount =
        invoice.failedAttemptCount +
        1;

      const nextRetryAt =
        nextFailedAttemptCount === 1
          ? addDunningDays(
              now,
              3
            )
          : nextFailedAttemptCount === 2
            ? addDunningDays(
                now,
                5
              )
            : addDunningDays(
                now,
                7
              );

      const shouldSuspend =
        nextFailedAttemptCount >=
        3;

      await tx.playerInvoice.update({
        where: {
          id:
            invoice.id,
        },

        data: {
          status:
            InvoiceStatus.PAST_DUE,

          amountPaidCents:
            0,

          paidAt:
            null,

          failedAttemptCount:
            nextFailedAttemptCount,

          lastFailedAt:
            now,

          nextRetryAt,

          failureReason:
            normalized.status ||
            "ACH payment failed.",

          paymentProcessingAt:
            null,

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
          id:
            invoice.playerProfileId,
        },

        data: {
          hasActivePlayerBilling:
            !shouldSuspend,

          playerBillingStatus:
            shouldSuspend
              ? PLAYER_BILLING_STATUS.SUSPENDED
              : PLAYER_BILLING_STATUS.PAST_DUE,
        },
      });

      await createBillingAuditLog({
        actorType:
          "SYSTEM",

        targetType:
          "PLAYER_PROFILE",

        targetId:
          invoice.playerProfileId,

        eventType:
          normalized.rawEvent
            .toUpperCase()
            .includes(
              "RECURRING"
            )
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

          paymentType:
            normalized.paymentType,

          transactionId:
            normalized.transactionId,

          responseStatus:
            normalized.status,

          failedAttemptCount:
            nextFailedAttemptCount,

          nextRetryAt,

          suspended:
            shouldSuspend,
        },
      });

      return {
        alreadyProcessed:
          false,

        dunningApplied:
          true,

        playerProfileId:
          invoice.playerProfileId,

        invoiceStatus:
          InvoiceStatus.PAST_DUE,

        failedAttemptCount:
          nextFailedAttemptCount,

        nextRetryAt,

        suspended:
          shouldSuspend,
      };
    }
  );
}

type ApplyReversedPlayerAchPaymentInput = {
  provider: PaymentProviderCode;
  normalized: NormalizedPaymentWebhook;
  billingTransactionId: string;
  rawPayload: unknown;
};

export async function applyReversedPlayerAchPayment({
  provider,
  normalized,
  billingTransactionId,
  rawPayload,
}: ApplyReversedPlayerAchPaymentInput) {
  return prisma.$transaction(
    async (tx) => {
      const reversalStatus =
        normalized.status ===
        "CHARGEBACK"
          ? "CHARGEBACK"
          : "RETURNED";

      /*
       * ACH RETURNED / CHARGEBACK are
       * post-settlement reversals.
       *
       * Only a transaction currently recorded
       * as SETTLED may enter one of these states.
       * The provider-state transition and all
       * financial reversal side effects occur
       * inside the same database transaction.
       *
       * This prevents replayed, concurrent, or
       * stale webhooks from reversing payment
       * state more than once.
       */
      const transition =
        await tx.billingTransaction.updateMany({
          where: {
            id:
              billingTransactionId,

            provider,

            transactionStatus:
              "SETTLED",
          },

          data: {
            transactionStatus:
              reversalStatus,

            responseMessage:
              reversalStatus,

            rawPayload:
              rawPayload as any,
          },
        });

      if (
        transition.count !== 1
      ) {
        return {
          alreadyProcessed:
            true,

          reversalApplied:
            false,
        };
      }

      const invoice =
        await tx.playerInvoice.findFirst({
          where: {
            OR: [
              {
                externalId:
                  normalized.reference,
              },
              {
                id:
                  normalized.reference,
              },
            ],
          },

          include: {
            playerProfile:
              true,
          },
        });

      if (!invoice) {
        throw new Error(
          `No PlayerInvoice found for reference ${normalized.reference}`
        );
      }

      await tx.playerInvoice.update({
        where: {
          id:
            invoice.id,
        },

        data: {
          status:
            InvoiceStatus.PAST_DUE,

          amountPaidCents:
            0,

          paidAt:
            null,

          paymentProcessingAt:
            null,

          processorTransactionId:
            normalized.transactionId ||
            invoice.processorTransactionId,

          processorResponseCode:
            reversalStatus,
        },
      });

      /*
       * Settlement creates the next UPCOMING
       * invoice. A later ACH reversal invalidates
       * that future billing cycle until the
       * payment issue is resolved.
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

      /*
       * Billing audit logging is intentionally
       * best-effort and currently uses the global
       * Prisma client. The authoritative financial
       * state above remains atomic.
       */
      await createBillingAuditLog({
        actorType:
          "SYSTEM",

        targetType:
          "PLAYER_PROFILE",

        targetId:
          invoice.playerProfileId,

        eventType:
          normalized.rawEvent
            .toUpperCase()
            .includes(
              "RECURRING"
            )
            ? "RECURRING_PAYMENT_FAILED"
            : "PAYMENT_FAILED",

        message:
          `ACH payment ${reversalStatus.toLowerCase()} for invoice ${normalized.reference}.`,

        metadata: {
          provider,

          invoiceId:
            invoice.id,

          externalId:
            normalized.reference,

          amount:
            normalized.amount,

          paymentType:
            normalized.paymentType,

          transactionId:
            normalized.transactionId,

          responseStatus:
            reversalStatus,
        },
      });

      return {
        alreadyProcessed:
          false,

        reversalApplied:
          true,

        playerProfileId:
          invoice.playerProfileId,

        invoiceStatus:
          InvoiceStatus.PAST_DUE,

        transactionStatus:
          reversalStatus,
      };
    }
  );
}