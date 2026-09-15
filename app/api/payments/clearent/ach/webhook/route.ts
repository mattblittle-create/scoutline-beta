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
  applySuccessfulPlayerPayment,
} from "@/lib/payments/processPlayerPaymentWebhook";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

function isFailureStatus(
  status: string
) {
  return (
    status === "RETURNED" ||
    status === "CHARGEBACK" ||
    status.startsWith(
      "REJECTED_"
    ) ||
    status === "FAILED" ||
    status === "VOIDED"
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
     * Always record the latest provider
     * status and webhook payload first.
     */
    await prisma.billingTransaction.update({
      where: {
        id:
          existingTransaction.id,
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

    if (
      normalized.status ===
      "SETTLED"
    ) {
      const result =
        await applySuccessfulPlayerPayment({
          provider:
            PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

          normalized,
        });

      return NextResponse.json({
        ok: true,
        matched: true,
        action:
          "SETTLED",
        result,
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