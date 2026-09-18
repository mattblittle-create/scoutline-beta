// lib/billing/processPlayerRecurringAchPayment.ts

import { prisma } from "@/lib/prisma";

import {
  PAYMENT_PROVIDER_CODE,
} from "@/lib/billing/constants";

import {
  chargeStoredPaymentMethod,
} from "@/lib/billing/chargeStoredPaymentMethod";

import {
  claimPlayerRecurringPayment,
  releasePlayerRecurringPaymentClaim,
} from "@/lib/billing/playerRecurringPaymentClaim";

import {
  findBlockingRecurringAchAttempt,
  finalizeRecurringAchTransaction,
  reserveRecurringAchTransaction,
} from "@/lib/billing/playerRecurringAchTransaction";

import type {
  StoredPaymentChargeResult,
} from "@/lib/payments/types";

type ProcessPlayerRecurringAchPaymentInput = {
  invoiceId: string;

  token: string;

  customerName?: string | null;
  email?: string | null;
};

export type ProcessPlayerRecurringAchPaymentResult =
  StoredPaymentChargeResult & {
    claimed?: boolean;
    duplicateProtected?: boolean;
    billingTransactionId?: string | null;
  };

export async function processPlayerRecurringAchPayment(
  input: ProcessPlayerRecurringAchPaymentInput
): Promise<ProcessPlayerRecurringAchPaymentResult> {
  /*
   * Load canonical invoice information first.
   *
   * Actual recurring-payment eligibility is
   * enforced atomically by the claim below.
   */
  const invoice =
    await prisma.playerInvoice.findUnique({
      where: {
        id: input.invoiceId,
      },

      select: {
        id: true,
        playerProfileId: true,
        externalId: true,
        amountCents: true,
        status: true,
      },
    });

  if (!invoice) {
    return {
      ok: false,
      skipped: true,

      reason:
        "Player invoice was not found.",

      invoiceNumber:
        input.invoiceId,

      claimed: false,
    };
  }

  const invoiceNumber =
    invoice.externalId ||
    invoice.id;

  /*
   * Prevent overlapping workers from processing
   * the same invoice concurrently.
   */
  const claim =
    await claimPlayerRecurringPayment(
      invoice.id
    );

  if (
    !claim.claimed ||
    !claim.claimedAt
  ) {
    return {
      ok: false,
      skipped: true,

      reason:
        claim.reason ||
        "Invoice could not be claimed for recurring payment.",

      invoiceNumber,

      claimed: false,
    };
  }

  const claimedAt =
    claim.claimedAt;

  try {
    /*
     * The atomic claim protects the current
     * execution window.
     *
     * BillingTransaction protects the invoice
     * across future workers, deployments,
     * crashes, and stale-claim recovery.
     */
    const existingAttempt =
      await findBlockingRecurringAchAttempt(
        invoice.id
      );

    if (existingAttempt.exists) {
      return {
        ok: false,
        skipped: true,

        reason:
          `Recurring ACH debit is already protected by transaction status ${existingAttempt.transactionStatus || "UNKNOWN"}.`,

        invoiceNumber,

        status:
          normalizeBlockingStatus(
            existingAttempt.transactionStatus
          ),

        paymentCompleted:
          existingAttempt.transactionStatus ===
          "SETTLED",

        transactionId:
          existingAttempt.providerTransactionId ||
          null,

        claimed: true,
        duplicateProtected: true,

        billingTransactionId:
          existingAttempt.transactionId ||
          null,
      };
    }

    /*
     * Reserve the provider attempt BEFORE
     * contacting Xplor.
     *
     * If this worker dies after Xplor receives
     * the request, SUBMITTING remains as the
     * durable duplicate-payment guard.
     */
const reservation =
      await reserveRecurringAchTransaction({
        invoiceId:
          invoice.id,

        playerProfileId:
          invoice.playerProfileId,

        providerReference:
          invoiceNumber,

        amountCents:
          invoice.amountCents,

        claimedAt,
      });

    /*
     * The reservation performs the final
     * fencing check before any provider call.
     *
     * If this worker lost its claim, or another
     * durable ACH attempt appeared, stop here.
     * Xplor must not be contacted.
     */
    if (!reservation.reserved) {
      return {
        ok: false,
        skipped: true,

        reason:
          reservation.reason,

        invoiceNumber,

        status:
          normalizeBlockingStatus(
            reservation.existingTransactionStatus
          ),

        paymentCompleted:
          reservation.existingTransactionStatus ===
          "SETTLED",

        transactionId:
          reservation.existingProviderTransactionId ||
          null,

        claimed: true,
        duplicateProtected:
          Boolean(
            reservation.existingTransactionId
          ),

        billingTransactionId:
          reservation.existingTransactionId ||
          null,
      };
    }

    const reservedTransaction =
      reservation.transaction;

    let result:
      StoredPaymentChargeResult;

    try {
      /*
       * The only code between the durable
       * SUBMITTING reservation and this provider
       * call is local setup.
       *
       * Xplor recurring ACH uses the stored
       * token only. No bank account or routing
       * information is persisted or sent here.
       */
      result =
        await chargeStoredPaymentMethod({
          provider:
            PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

          paymentType: "ACH",

          token:
            input.token,

          invoiceNumber,

          amountCents:
            invoice.amountCents,

          cardFeeCents: 0,

          description:
            `ScoutLine recurring ACH payment ${invoiceNumber}`,

          customerName:
            input.customerName,

          email:
            input.email,
        });
    } catch (error) {
      /*
       * An unexpected exception after the
       * SUBMITTING reservation must NOT turn
       * the transaction into FAILED.
       *
       * We cannot prove whether the provider
       * request reached Xplor.
       */
      console.error(
        "PLAYER_RECURRING_ACH_PROVIDER_EXCEPTION",
        {
          invoiceId:
            invoice.id,

          invoiceNumber,

          billingTransactionId:
            reservedTransaction.id,

          error,
        }
      );

      const unknownResult:
        StoredPaymentChargeResult = {
          ok: false,
          skipped: false,

          reason:
            "Recurring ACH submission outcome is unknown because the provider call did not complete normally.",

          invoiceNumber,

          status: "UNKNOWN",

          paymentCompleted: false,

          cardFeeCents: 0,
        };

      /*
       * Best effort: convert SUBMITTING to
       * UNKNOWN.
       *
       * If this database update itself fails,
       * SUBMITTING remains durable and still
       * blocks another automatic debit.
       */
      try {
        await finalizeRecurringAchTransaction({
          billingTransactionId:
            reservedTransaction.id,

          result:
            unknownResult,
        });
      } catch (finalizeError) {
        console.error(
          "PLAYER_RECURRING_ACH_UNKNOWN_FINALIZE_ERROR",
          {
            invoiceId:
              invoice.id,

            invoiceNumber,

            billingTransactionId:
              reservedTransaction.id,

            finalizeError,
          }
        );
      }

      return {
        ...unknownResult,

        claimed: true,
        duplicateProtected: true,

        billingTransactionId:
          reservedTransaction.id,
      };
    }

    /*
     * Finalize the exact SUBMITTING reservation
     * with Xplor's result.
     *
     * PENDING / APPROVED / SETTLING / SETTLED
     * and UNKNOWN all remain blocking states.
     *
     * FAILED is a definitive provider failure
     * and may later enter the controlled
     * dunning/retry lifecycle.
     */
    try {
      const billingTransaction =
        await finalizeRecurringAchTransaction({
          billingTransactionId:
            reservedTransaction.id,

          result,
        });

      return {
        ...result,

        claimed: true,

        duplicateProtected:
          result.status === "UNKNOWN",

        billingTransactionId:
          billingTransaction.id,
      };
    } catch (finalizeError) {
      /*
       * This is the most important crash-safety
       * behavior in the processor.
       *
       * Xplor may already have the debit.
       * Therefore we must NOT convert this into
       * FAILED or make the invoice retryable.
       *
       * The original SUBMITTING reservation
       * remains in BillingTransaction and blocks
       * another automatic debit.
       */
      console.error(
        "PLAYER_RECURRING_ACH_FINALIZE_ERROR",
        {
          invoiceId:
            invoice.id,

          invoiceNumber,

          billingTransactionId:
            reservedTransaction.id,

          providerTransactionId:
            result.transactionId ||
            null,

          providerStatus:
            result.status ||
            null,

          finalizeError,
        }
      );

      return {
        ok: false,
        skipped: false,

        reason:
          "Xplor ACH responded, but ScoutLine could not safely record the submission result. Automatic retry is blocked.",

        invoiceNumber,

        status: "UNKNOWN",

        paymentCompleted: false,

        cardFeeCents: 0,

        transactionId:
          result.transactionId ||
          null,

        responseCode:
          result.responseCode ||
          null,

        responseMessage:
          result.responseMessage ||
          null,

        raw:
          result.raw,

        claimed: true,
        duplicateProtected: true,

        billingTransactionId:
          reservedTransaction.id,
      };
    }
  } finally {
    /*
     * Release only the exact claim owned by
     * this worker.
     *
     * Durable duplicate protection now lives
     * in BillingTransaction rather than in the
     * short-lived processing claim.
     */
    try {
      await releasePlayerRecurringPaymentClaim(
        invoice.id,
        claimedAt
      );
    } catch (releaseError) {
      console.error(
        "PLAYER_RECURRING_ACH_CLAIM_RELEASE_ERROR",
        {
          invoiceId:
            invoice.id,

          invoiceNumber,

          claimedAt,
          releaseError,
        }
      );
    }
  }
}

function normalizeBlockingStatus(
  value: string | null | undefined
):
  | "PENDING"
  | "APPROVED"
  | "SETTLING"
  | "SETTLED"
  | "UNKNOWN" {
  const normalized =
    String(value || "")
      .trim()
      .toUpperCase();

  switch (normalized) {
    case "PENDING":
      return "PENDING";

    case "APPROVED":
      return "APPROVED";

    case "SETTLING":
      return "SETTLING";

    case "SETTLED":
      return "SETTLED";

    /*
     * SUBMITTING intentionally maps to UNKNOWN
     * at this API boundary. Both states mean
     * the caller must not automatically submit
     * another ACH debit.
     */
    case "SUBMITTING":
    case "UNKNOWN":
    default:
      return "UNKNOWN";
  }
}