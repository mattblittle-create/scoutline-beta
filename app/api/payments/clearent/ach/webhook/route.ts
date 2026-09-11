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

    const normalized =
      normalizeClearentAchWebhook(
        payload
      );

    if (
      !normalized.transactionId
    ) {
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
       * Return 200 so Xplor does not
       * endlessly retry a webhook that
       * ScoutLine cannot currently match.
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