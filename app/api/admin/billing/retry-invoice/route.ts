// app/api/admin/billing/retry-invoice/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chargeStoredPaymentMethod } from "@/lib/billing/chargeStoredPaymentMethod";
import { markPlayerInvoicePaymentFailed } from "@/lib/billing/playerDunning";
import { markPlayerRecurringPaymentSucceeded } from "@/lib/billing/playerRecurringSuccess";
import { createBillingAuditLog } from "@/lib/billing/billingAudit";

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

const result: any = await chargeStoredPaymentMethod({
  token,
  provider: billing?.provider,
  paymentType: billing?.paymentType,
  invoiceNumber: invoice.externalId || invoice.id,
  amountCents: invoice.amountCents,
  cardFeeCents: invoice.cardFeeCents,
  description: `ScoutLine ${String(
    invoice.playerProfile.playerPlanTier
  )} ${String(
    invoice.playerProfile.playerBillingCadence || "monthly"
  )} manual invoice retry`,
  customerName: invoice.playerProfile.email,
  email: invoice.playerProfile.email,
});

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

    if (!result.ok) {
      const dunningResult = await markPlayerInvoicePaymentFailed({
        invoiceId: invoice.id,
        reason: result.reason || "Manual invoice retry failed.",
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
          error: result.reason || "Manual invoice retry failed.",
          result,
          dunningResult,
        },
        { status: 402 }
      );
    }

    const successResult = await markPlayerRecurringPaymentSucceeded({
      invoiceId: invoice.id,
      amountPaidCents: result.amountPaidCents || invoice.amountCents + invoice.cardFeeCents,
      cardFeeCents: result.cardFeeCents || invoice.cardFeeCents,
      processorTransactionId: result.transactionId || null,
      processorResponseCode: result.responseCode || null,
      processorReceiptUrl: result.receiptUrl || null,
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