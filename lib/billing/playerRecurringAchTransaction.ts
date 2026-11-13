// lib/billing/playerRecurringAchTransaction.ts

import { prisma } from "@/lib/prisma";

import {
  PAYMENT_PROVIDER_CODE,
} from "@/lib/billing/constants";

import type {
  StoredPaymentChargeResult,
} from "@/lib/payments/types";

/*
 * These statuses mean ScoutLine must NOT
 * automatically submit another ACH debit
 * for the same invoice.
 *
 * SUBMITTING is a local ScoutLine state.
 * It means we reserved the provider attempt
 * before contacting Xplor, but do not yet
 * have a safely recorded final submission
 * result.
 */
const BLOCKING_ACH_STATUSES = [
  "SUBMITTING",
  "PENDING",
  "APPROVED",
  "SETTLING",
  "SETTLED",
  "UNKNOWN",
] as const;

export type ExistingRecurringAchAttempt = {
  exists: boolean;

  transactionId?: string;
  providerTransactionId?: string | null;
  transactionStatus?: string;
};

export async function findBlockingRecurringAchAttempt(
  invoiceId: string
): Promise<ExistingRecurringAchAttempt> {
  const transaction =
    await prisma.billingTransaction.findFirst({
      where: {
        invoiceId,

        provider:
          PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

        transactionType:
          "ACH_DEBIT",

        transactionStatus: {
          in: [
            ...BLOCKING_ACH_STATUSES,
          ],
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        providerTransactionId: true,
        transactionStatus: true,
      },
    });

  if (!transaction) {
    return {
      exists: false,
    };
  }

  return {
    exists: true,

    transactionId:
      transaction.id,

    providerTransactionId:
      transaction.providerTransactionId,

    transactionStatus:
      transaction.transactionStatus,
  };
}

type ReserveRecurringAchTransactionInput = {
  invoiceId: string;
  playerProfileId: string;
  providerReference: string;
  amountCents: number;

  /*
   * This is the exact paymentProcessingAt value
   * assigned when this worker claimed the invoice.
   *
   * It acts as a fencing token. A stale worker
   * whose claim has been replaced must not be
   * allowed to reserve or submit another debit.
   */
  claimedAt: Date;
};

export type ReserveRecurringAchTransactionResult =
  | {
      reserved: true;
      transaction: {
        id: string;
        transactionStatus: string;
      };
    }
  | {
      reserved: false;
      reason: string;
      existingTransactionId?: string;
      existingProviderTransactionId?: string | null;
      existingTransactionStatus?: string;
    };

/*
 * Atomically verify claim ownership and reserve
 * the ACH attempt BEFORE contacting Xplor.
 *
 * The no-op update is intentional:
 *
 *   paymentProcessingAt = claimedAt
 *
 * It obtains a database write lock on the invoice
 * row while also proving that this worker still
 * owns the exact claim.
 *
 * That closes the stale-worker race:
 *
 * - if this worker still owns the claim, it can
 *   reserve SUBMITTING;
 *
 * - if another worker recovered the stale claim,
 *   this worker's claimedAt no longer matches and
 *   it cannot reserve or contact Xplor.
 *
 * The blocking-transaction check happens inside
 * the same database transaction so claim
 * validation and reservation are coordinated.
 */
export async function reserveRecurringAchTransaction(
  input: ReserveRecurringAchTransactionInput
): Promise<ReserveRecurringAchTransactionResult> {
  return prisma.$transaction(async (tx) => {
    const ownership =
      await tx.playerInvoice.updateMany({
        where: {
          id:
            input.invoiceId,

          paymentProcessingAt:
            input.claimedAt,
        },

        /*
         * Writing the same fencing value is
         * intentional. It locks the invoice row
         * for this transaction without changing
         * the claim.
         */
        data: {
          paymentProcessingAt:
            input.claimedAt,
        },
      });

    if (ownership.count !== 1) {
      return {
        reserved: false,

        reason:
          "Recurring ACH payment claim is no longer owned by this worker.",
      };
    }

    const existingTransaction =
      await tx.billingTransaction.findFirst({
        where: {
          invoiceId:
            input.invoiceId,

          provider:
            PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

          transactionType:
            "ACH_DEBIT",

          transactionStatus: {
            in: [
              ...BLOCKING_ACH_STATUSES,
            ],
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          providerTransactionId: true,
          transactionStatus: true,
        },
      });

    if (existingTransaction) {
      return {
        reserved: false,

        reason:
          `Recurring ACH debit is already protected by transaction status ${existingTransaction.transactionStatus}.`,

        existingTransactionId:
          existingTransaction.id,

        existingProviderTransactionId:
          existingTransaction.providerTransactionId,

        existingTransactionStatus:
          existingTransaction.transactionStatus,
      };
    }

    const transaction =
      await tx.billingTransaction.create({
        data: {
          invoiceId:
            input.invoiceId,

          playerProfileId:
            input.playerProfileId,

          provider:
            PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

          transactionType:
            "ACH_DEBIT",

          transactionStatus:
            "SUBMITTING",

          providerTransactionId:
            null,

          providerReference:
            input.providerReference,

          amountCents:
            input.amountCents,

          cardFeeCents: 0,

          responseMessage:
            "Recurring ACH debit reserved before provider submission.",
        },

        select: {
          id: true,
          transactionStatus: true,
        },
      });

    return {
      reserved: true,
      transaction,
    };
  });
}

type FinalizeRecurringAchTransactionInput = {
  billingTransactionId: string;

  result: StoredPaymentChargeResult;
};

/*
 * Update the exact reservation created by this
 * worker after the Xplor request completes.
 *
 * We update instead of creating a second row so
 * there is one durable BillingTransaction record
 * representing this provider attempt.
 */
export async function finalizeRecurringAchTransaction(
  input: FinalizeRecurringAchTransactionInput
) {
  return prisma.billingTransaction.update({
    where: {
      id:
        input.billingTransactionId,
    },

    data: {
      transactionStatus:
        input.result.status ||
        (input.result.ok
          ? "PENDING"
          : "FAILED"),

      providerTransactionId:
        input.result.transactionId ||
        null,

      responseCode:
        input.result.responseCode ||
        null,

      responseMessage:
        input.result.responseMessage ||
        input.result.reason ||
        null,

      receiptUrl:
        input.result.receiptUrl ||
        null,

      rawPayload:
        input.result.raw == null
          ? undefined
          : (input.result.raw as any),
    },
  });
}