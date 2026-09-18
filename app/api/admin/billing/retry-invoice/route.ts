// app/api/admin/billing/retry-invoice/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chargeStoredPaymentMethod } from "@/lib/billing/chargeStoredPaymentMethod";
import { markPlayerInvoicePaymentFailed } from "@/lib/billing/playerDunning";
import { markPlayerRecurringPaymentSucceeded } from "@/lib/billing/playerRecurringSuccess";
import { createBillingAuditLog } from "@/lib/billing/billingAudit";
import { processPlayerRecurringAchPayment } from "@/lib/billing/processPlayerRecurringAchPayment";
import { getPlayerRecurringPaymentDecision } from "@/lib/billing/playerRecurringPaymentDecision";
import { PAYMENT_PROVIDER_CODE } from "@/lib/billing/constants";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const invoiceId = String(body?.invoiceId || "").trim();

    if (!invoiceId) {
      return NextResponse.json(
        { ok: false, error: "Missing invoiceId." },
        { status: 400 }
      );
    }

    const invoice = await prisma.playerInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        playerProfile: {
          include: {
            playerBillingProfile: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { ok: false, error: "Invoice not found." },
        { status: 404 }
      );
    }

    const billing = invoice.playerProfile.playerBillingProfile;
    const token = billing?.providerPaymentRef || "";

    if (!token) {
      await createBillingAuditLog({
        actorType: "ADMIN",
        targetType: "PLAYER_INVOICE",
        targetId: invoice.id,
        eventType: "RETRY_INVOICE_MISSING_TOKEN",
        message: `Manual retry failed because no stored billing token exists for invoice ${invoice.externalId || invoice.id}.`,
        metadata: {
          invoiceId: invoice.id,
          playerProfileId: invoice.playerProfileId,
          externalId: invoice.externalId,
        },
      });

      return NextResponse.json(
        { ok: false, error: "No stored billing token found." },
        { status: 400 }
      );
    }

    await createBillingAuditLog({
      actorType: "ADMIN",
      targetType: "PLAYER_INVOICE",
      targetId: invoice.id,
      eventType: "RETRY_INVOICE_ATTEMPTED",
      message: `Manual retry attempted for invoice ${invoice.externalId || invoice.id}.`,
      metadata: {
        invoiceId: invoice.id,
        playerProfileId: invoice.playerProfileId,
        externalId: invoice.externalId,
        amountCents: invoice.amountCents,
        cardFeeCents: invoice.cardFeeCents,
        billingMethod: {
          provider: billing?.provider,
          paymentType: billing?.paymentType,
          brand: billing?.brand,
          last4: billing?.last4,
        },
      },
    });

    const provider =
      String(billing?.provider || "")
        .trim()
        .toUpperCase();

    const isAch =
      provider ===
      PAYMENT_PROVIDER_CODE.CLEARENT_ACH;

    /*
     * Manual retries use the same provider-specific
     * safety model as automatic recurring billing.
     *
     * ACH must go through the recurring ACH processor
     * so the invoice claim, SUBMITTING reservation,
     * duplicate protection, and UNKNOWN handling are
     * all preserved.
     */
    const result =
      isAch
        ? await processPlayerRecurringAchPayment({
            invoiceId: invoice.id,
            token,
            customerName:
              invoice.playerProfile.email,
            email:
              invoice.playerProfile.email,
          })
        : await chargeStoredPaymentMethod({
            token,
            provider:
              billing?.provider,
            paymentType:
              billing?.paymentType,
            invoiceNumber:
              invoice.externalId ||
              invoice.id,
            amountCents:
              invoice.amountCents,
            cardFeeCents:
              invoice.cardFeeCents,
            description:
              `ScoutLine ${String(
                invoice.playerProfile.playerPlanTier
              )} ${String(
                invoice.playerProfile.playerBillingCadence ||
                  "monthly"
              )} manual invoice retry`,
            customerName:
              invoice.playerProfile.email,
            email:
              invoice.playerProfile.email,
          });

    const decision =
      getPlayerRecurringPaymentDecision({
        isAch,
        result,
      });

    /*
     * A skipped result is not a failed payment.
     *
     * For ACH this includes duplicate protection,
     * an invoice already being processed, or loss
     * of the processing claim.
     */
    if (result.skipped) {
      await createBillingAuditLog({
        actorType: "ADMIN",
        targetType: "PLAYER_INVOICE",
        targetId: invoice.id,
        eventType: "RETRY_INVOICE_SKIPPED",
        message: `Manual retry skipped for invoice ${invoice.externalId || invoice.id}.`,
        metadata: {
          invoiceId: invoice.id,
          result,
        },
      });

      return NextResponse.json({
        ok: true,
        skipped: true,
        result,
        message:
          result.reason ||
          "The stored payment method cannot currently be charged.",
      });
    }

    /*
     * Only a definitive failure enters dunning.
     *
     * In particular, ACH UNKNOWN must NOT increment
     * failedAttemptCount because Xplor may already
     * have received the debit.
     */
    if (decision.shouldDun) {
      const dunningResult =
        await markPlayerInvoicePaymentFailed({
          invoiceId: invoice.id,
          reason:
            result.reason ||
            result.responseMessage ||
            "Manual invoice retry failed.",
        });

      await createBillingAuditLog({
        actorType: "ADMIN",
        targetType: "PLAYER_INVOICE",
        targetId: invoice.id,
        eventType: "RETRY_INVOICE_FAILED",
        message: `Manual retry failed for invoice ${invoice.externalId || invoice.id}.`,
        metadata: {
          invoiceId: invoice.id,
          result,
          dunningResult,
        },
      });

      return NextResponse.json(
        {
          ok: false,
          error:
            result.reason ||
            result.responseMessage ||
            "Manual invoice retry failed.",
          result,
          dunningResult,
        },
        { status: 402 }
      );
    }

    /*
     * A completed card payment, or an ACH payment
     * explicitly returned as SETTLED/completed, may
     * complete the invoice immediately.
     */
    if (decision.shouldMarkPaid) {
      const successResult =
        await markPlayerRecurringPaymentSucceeded({
          invoiceId: invoice.id,
          amountPaidCents:
            result.amountPaidCents ??
            (
              invoice.amountCents +
              (
                isAch
                  ? 0
                  : invoice.cardFeeCents
              )
            ),
          cardFeeCents:
            isAch
              ? 0
              : (
                  result.cardFeeCents ??
                  invoice.cardFeeCents
                ),
          processorTransactionId:
            result.transactionId ||
            null,
          processorResponseCode:
            result.responseCode ||
            null,
          processorReceiptUrl:
            result.receiptUrl ||
            null,
        });

      await createBillingAuditLog({
        actorType: "ADMIN",
        targetType: "PLAYER_INVOICE",
        targetId: invoice.id,
        eventType: "RETRY_INVOICE_SUCCEEDED",
        message: `Manual retry succeeded for invoice ${invoice.externalId || invoice.id}.`,
        metadata: {
          invoiceId: invoice.id,
          result,
          successResult,
        },
      });

      return NextResponse.json({
        ok: true,
        result,
        successResult,
      });
    }

    /*
     * No immediate invoice-state change is correct
     * for an ACH debit that is still in flight or
     * whose submission outcome is ambiguous.
     *
     * PENDING / APPROVED / SETTLING:
     *   wait for Xplor settlement webhook
     *
     * UNKNOWN:
     *   preserve duplicate protection and require
     *   reconciliation rather than automatic retry
     */
    await createBillingAuditLog({
      actorType: "ADMIN",
      targetType: "PLAYER_INVOICE",
      targetId: invoice.id,
      eventType:
        isAch
          ? "RETRY_INVOICE_ACH_PENDING"
          : "RETRY_INVOICE_NO_STATE_CHANGE",
      message:
        isAch
          ? `Manual ACH retry submitted for invoice ${invoice.externalId || invoice.id}; awaiting final payment status.`
          : `Manual retry produced no final payment-state change for invoice ${invoice.externalId || invoice.id}.`,
      metadata: {
        invoiceId: invoice.id,
        result,
      },
    });

    return NextResponse.json({
      ok: result.ok,
      pending: isAch,
      result,
      message:
        isAch
          ? result.status === "UNKNOWN"
            ? "ACH submission outcome is unknown. No automatic retry or dunning action was taken."
            : "ACH debit submitted. ScoutLine is awaiting final settlement."
          : "The payment attempt produced no final payment-state change.",
    });
  } catch (error) {
    console.error("ADMIN_RETRY_INVOICE_ERROR", error);

    await createBillingAuditLog({
      actorType: "ADMIN",
      targetType: "ADMIN_BILLING",
      targetId: "RETRY_INVOICE",
      eventType: "RETRY_INVOICE_ERROR",
      message: "Unhandled error while retrying invoice.",
      metadata: {
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : String(error),
      },
    });

    return NextResponse.json(
      { ok: false, error: "Failed to retry invoice." },
      { status: 500 }
    );
  }
}