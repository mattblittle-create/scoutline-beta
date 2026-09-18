// app/api/payments/clearent/ach/webhook/route.ts

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  PAYMENT_PROVIDER_CODE,
} from "@/lib/billing/constants";

import {
  normalizeClearentAchWebhook,
} from "@/lib/payments/providers/clearentAchWebhook";

import {
  applyFailedPlayerPayment,
  applyFailedPlayerPaymentWithDunning,
  applyReversedPlayerAchPayment,
  applySuccessfulPlayerPayment,
  applyVoidedPlayerAchPayment,
} from "@/lib/payments/processPlayerPaymentWebhook";

import {
  canUpdateClearentAchTransactionStatus,
} from "@/lib/payments/providers/clearentAchTransactionState";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

function isFailureStatus(
  status: string
) {
  return status.startsWith(
    "REJECTED_"
  );
}

export async function POST(
  req: NextRequest
) {
  try {
    /*
     * Xplor support confirmed ACH
     * webhooks currently do not use
     * signature verification.
     *
     * Do not treat request headers as
     * authentication until Xplor offers
     * an ACH webhook signature mechanism.
     */
    const payload =
      await req
        .json()
        .catch(() => null);

    if (!payload) {
      console.warn(
        "CLEARENT_ACH_WEBHOOK_INVALID_JSON"
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid ACH webhook payload.",
        },
        {
          status: 400,
        }
      );
    }

    const payloadValue =
      payload as Record<string, any>;

    const nestedPayload =
      payloadValue?.Payload ??
      payloadValue?.payload ??
      payloadValue?.data ??
      null;

    const metadata =
      payloadValue?.metadata ??
      payloadValue?.Metadata ??
      null;

    /*
     * Temporary sanitized diagnostics.
     *
     * We intentionally log field names /
     * structure only, not banking values,
     * tokens, credentials, or the full
     * webhook payload.
     */
    console.info(
      "CLEARENT_ACH_WEBHOOK_DIAGNOSTIC",
      {
        topLevelKeys:
          Object.keys(
            payloadValue || {}
          ),

        nestedPayloadKeys:
          nestedPayload &&
          typeof nestedPayload === "object"
            ? Object.keys(
                nestedPayload
              )
            : [],

        metadataKeys:
          metadata &&
          typeof metadata === "object"
            ? Object.keys(
                metadata
              )
            : [],

        topLevelType:
          typeof payload,

        hasPayload:
          Boolean(
            payloadValue?.Payload ||
            payloadValue?.payload ||
            payloadValue?.data
          ),

        hasMetadata:
          Boolean(metadata),
      }
    );

    const normalized =
      normalizeClearentAchWebhook(
        payload
      );

    console.info(
      "CLEARENT_ACH_WEBHOOK_NORMALIZED",
      {
        rawEvent:
          normalized.rawEvent,

        status:
          normalized.status,

        hasTransactionId:
          Boolean(
            normalized.transactionId
          ),

        hasReference:
          Boolean(
            normalized.reference
          ),

        amount:
          normalized.amount,

        paymentType:
          normalized.paymentType,
      }
    );

    if (
      !normalized.transactionId
    ) {
      console.warn(
        "CLEARENT_ACH_WEBHOOK_TRANSACTION_ID_MISSING",
        {
          rawEvent:
            normalized.rawEvent,

          status:
            normalized.status,

          topLevelKeys:
            Object.keys(
              payloadValue || {}
            ),

          nestedPayloadKeys:
            nestedPayload &&
            typeof nestedPayload === "object"
              ? Object.keys(
                  nestedPayload
                )
              : [],
        }
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "ACH webhook is missing transaction_id.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Xplor ACH webhook payloads identify
     * the transaction by Xplor's transaction
     * ID rather than ScoutLine's invoice
     * reference.
     */
    const existingTransaction =
      await prisma.billingTransaction.findFirst({
        where: {
          provider:
            PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

          providerTransactionId:
            normalized.transactionId,
        },
      });

    if (
      !existingTransaction
    ) {
      console.warn(
        "CLEARENT_ACH_WEBHOOK_TRANSACTION_NOT_FOUND",
        {
          transactionId:
            normalized.transactionId,

          status:
            normalized.status,
        }
      );

      /*
       * INT sends dummy webhook data that
       * may not correspond to a ScoutLine
       * transaction.
       *
       * Return 200 so Xplor knows the
       * webhook was received successfully.
       */
      return NextResponse.json({
        ok: true,
        matched: false,
      });
    }

    normalized.reference =
      existingTransaction.providerReference ||
      "";

    if (
      !normalized.reference
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Matched ACH transaction has no ScoutLine reference.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * FAILED is a definitive unsuccessful ACH
     * payment attempt and enters ScoutLine's
     * normal dunning/retry lifecycle.
     *
     * The processor atomically transitions the
     * BillingTransaction into FAILED so replayed
     * or concurrent FAILED webhooks cannot
     * increment dunning more than once.
     *
     * This must run before the generic provider
     * status update below.
     */
    if (
      normalized.status ===
      "FAILED"
    ) {
      const result =
        await applyFailedPlayerPaymentWithDunning({
          provider:
            PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

          normalized,

          billingTransactionId:
            existingTransaction.id,

          rawPayload:
            payload,
        });

      return NextResponse.json({
        ok: true,
        matched: true,
        action:
          "FAILED",
        result,
      });
    }

        /*
     * RETURNED and CHARGEBACK are
     * post-settlement ACH reversals.
     *
     * The processor atomically transitions
     * the BillingTransaction from SETTLED
     * and reverses ScoutLine's paid state.
     * Replayed, concurrent, or stale
     * reversal webhooks therefore cannot
     * apply the financial reversal twice.
     *
     * This must run before the generic
     * provider status update below.
     */
    if (
      normalized.status ===
        "RETURNED" ||
      normalized.status ===
        "CHARGEBACK"
    ) {
      const result =
        await applyReversedPlayerAchPayment({
          provider:
            PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

          normalized,

          billingTransactionId:
            existingTransaction.id,

          rawPayload:
            payload,
        });

      return NextResponse.json({
        ok: true,
        matched: true,
        action:
          normalized.status,
        result,
      });
    }

        /*
     * VOIDED represents an ACH payment canceled
     * before settlement.
     *
     * The processor atomically transitions the
     * BillingTransaction from an allowed
     * pre-terminal state and voids only the
     * associated invoice.
     *
     * Replayed or stale VOIDED webhooks cannot
     * overwrite another terminal ACH state.
     */
    if (
      normalized.status ===
      "VOIDED"
    ) {
      const result =
        await applyVoidedPlayerAchPayment({
          provider:
            PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

          normalized,

          billingTransactionId:
            existingTransaction.id,

          rawPayload:
            payload,
        });

      return NextResponse.json({
        ok: true,
        matched: true,
        action:
          "VOIDED",
        result,
      });
    }

        /*
     * SETTLED is the authoritative successful
     * ACH payment state.
     *
     * The processor atomically transitions the
     * BillingTransaction from an allowed
     * pre-terminal state and applies ScoutLine's
     * paid billing state in the same database
     * transaction.
     *
     * Replayed or stale SETTLED webhooks cannot
     * reactivate a transaction that has already
     * FAILED, VOIDED, RETURNED, or CHARGEBACK.
     */
    if (
      normalized.status ===
      "SETTLED"
    ) {
      const result =
        await applySuccessfulPlayerPayment({
          provider:
            PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

          normalized,

          billingTransactionId:
            existingTransaction.id,

          rawPayload:
            payload,
        });

      return NextResponse.json({
        ok: true,
        matched: true,
        action:
          "SETTLED",
        result,
      });
    }

    /*
     * Always record the latest provider
     * status and webhook payload first.
     */
/*
 * Remaining webhook statuses use the generic
 * provider-state recorder.
 *
 * Never allow an out-of-order intermediate
 * webhook to overwrite a terminal ACH state.
 * Terminal financial transitions are handled
 * by their dedicated processors above.
 */
const canUpdateStatus =
  canUpdateClearentAchTransactionStatus(
    existingTransaction.transactionStatus,
    normalized.status
  );

if (canUpdateStatus) {
  await prisma.billingTransaction.update({
    where: {
      id: existingTransaction.id,
    },

    data: {
      transactionStatus:
        normalized.status,

      responseMessage:
        normalized.status,

      rawPayload:
        payload as any,
    },
  });
}

    if (
      isFailureStatus(
        normalized.status
      )
    ) {
      const result =
        await applyFailedPlayerPayment({
          provider:
            PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

          normalized,
        });

      return NextResponse.json({
        ok: true,
        matched: true,
        action:
          normalized.status,
        result,
      });
    }

    /*
     * PENDING / APPROVED / SETTLING /
     * other intermediate statuses are
     * recorded but do not activate billing.
     */
    return NextResponse.json({
      ok: true,
      matched: true,
      action:
        "STATUS_UPDATED",
      status:
        normalized.status,
    });
  } catch (error) {
    console.error(
      "CLEARENT_ACH_WEBHOOK_ERROR",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Failed to process ACH webhook.",
      },
      {
        status: 500,
      }
    );
  }
}