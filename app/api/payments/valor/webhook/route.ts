// app/api/payments/valor/webhook/route.ts

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, InvoiceStatus, Plan } from "@prisma/client";

export const runtime = "nodejs";

const prisma = new PrismaClient();

type NormalizedWebhook = {
  event: string;
  rawEvent: string;
  status: string;
  approved: boolean;
  reference: string;
  transactionId: string;
  amount: number | null;
  surcharge: number | null;
  paymentType: string | null;
  brand: string | null;
  last4: string | null;
  payload: any;
};

function verifyValorSignature(args: {
  rawBody: string;
  timestamp: string;
  signature: string;
  secret: string;
}) {
  const { rawBody, timestamp, signature, secret } = args;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody + timestamp, "utf8")
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch {
    return false;
  }
}

function toUpperString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim().toUpperCase();
    }
  }
  return "";
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function dollarsToCents(value: number | null): number | null {
  if (value == null) return null;
  return Math.round(value * 100);
}

function normalizePlan(value: string): Plan {
  const v = value.trim().toUpperCase();
  if (v === "WALK_ON") return Plan.WALK_ON;
  if (v === "ALL_AMERICAN") return Plan.ALL_AMERICAN;
  return Plan.REDSHIRT;
}

function inferCadenceFromInvoice(invoiceCadence: string | null | undefined) {
  const v = (invoiceCadence || "").trim().toLowerCase();
  return v === "annual" ? "annual" : "monthly";
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

function normalizeValorWebhook(payload: any): NormalizedWebhook {
  const rawEvent = firstString(payload?.event, payload?.type, payload?.eventType);
  const event = toUpperString(rawEvent);

  const data = payload?.data ?? payload?.payload ?? payload;

  const status = toUpperString(
    data?.status,
    data?.STATUS,
    data?.transaction_status,
    data?.txn_status,
    data?.result,
    data?.response,
    payload?.status
  );

  const reference = firstString(
    data?.invoicenumber,
    data?.invoiceNumber,
    data?.invoice,
    data?.order_id,
    data?.orderId,
    data?.merchant_reference,
    data?.merchantReference,
    data?.reference,
    payload?.reference
  );

  const transactionId = firstString(
    data?.transaction_id,
    data?.transactionId,
    data?.txn_id,
    data?.txnId,
    data?.id,
    payload?.id
  );

  const amount =
    toNumberOrNull(
      data?.amount,
      data?.transaction_amount,
      data?.txn_amount,
      payload?.amount
    ) ?? null;

  const surcharge =
    toNumberOrNull(
      data?.surcharge,
      data?.fee,
      data?.processing_fee,
      payload?.surcharge
    ) ?? null;

  const paymentType =
    firstString(
      data?.payment_type,
      data?.paymentType,
      data?.card_type,
      data?.tender_type
    ) || null;

  const brand =
    firstString(
      data?.brand,
      data?.card_brand,
      data?.cardType
    ) || null;

  const last4 =
    firstString(
      data?.last4,
      data?.card_last4,
      data?.acctlast4
    ) || null;

  const approved =
    [
      "APPROVED",
      "SUCCESS",
      "SUCCEEDED",
      "PAID",
      "AUTHCAPTURE",
      "CAPTURED",
      "SETTLED",
      "COMPLETED",
    ].includes(status) ||
    [
      "APPROVED",
      "TRANSACTION",
      "RECURRING BILLING SUCCESS",
    ].includes(event);

  return {
    event,
    rawEvent,
    status,
    approved,
    reference,
    transactionId,
    amount,
    surcharge,
    paymentType,
    brand,
    last4,
    payload,
  };
}

async function applySuccessfulPayment(normalized: NormalizedWebhook) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.playerInvoice.findFirst({
      where: { externalId: normalized.reference },
      include: {
        playerProfile: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new Error(`No PlayerInvoice found for reference ${normalized.reference}`);
    }

    // Idempotent: already paid, just return success
    if (invoice.status === InvoiceStatus.PAID) {
      return {
        alreadyProcessed: true,
        playerProfileId: invoice.playerProfileId,
      };
    }

    const paidAt = new Date();
    const cadence = inferCadenceFromInvoice(invoice.cadence);
    const plan = normalizePlan(
      invoice.playerProfile.playerPlanTier?.toString?.() || "REDSHIRT"
    );

    const nextPeriodEnd =
      cadence === "annual" ? addYears(paidAt, 1) : addMonths(paidAt, 1);

    const rawAmountCents = dollarsToCents(normalized.amount);
    const invoiceAmountCents =
      rawAmountCents && rawAmountCents > 0 ? rawAmountCents : invoice.amountCents;

    await tx.playerInvoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.PAID,
        amountPaidCents: invoiceAmountCents,
        paidAt,
      },
    });

    await tx.playerProfile.update({
      where: { id: invoice.playerProfileId },
      data: {
        hasActivePlayerBilling: true,
        billingConflictFlag: false,
        playerBillingStatus: "Active",
        playerBillingCadence: cadence,
        playerPlanTier: plan,
        playerCancelRequestedAt: null,
        playerCancelEffectiveAt: null,
        profileState: "PLAYER_OWNED_ACTIVE",
      },
    });

    if (invoice.playerProfile.userId) {
      await tx.player.updateMany({
        where: { userId: invoice.playerProfile.userId },
        data: {
          plan,
        },
      });
    }

    await tx.playerBillingProfile.upsert({
      where: { playerProfileId: invoice.playerProfileId },
      update: {
        provider: "VALOR",
        providerPaymentRef: normalized.transactionId || normalized.reference,
        paymentType: normalized.paymentType || undefined,
        last4: normalized.last4 || undefined,
        brand: normalized.brand || undefined,
      },
      create: {
        playerProfileId: invoice.playerProfileId,
        provider: "VALOR",
        providerPaymentRef: normalized.transactionId || normalized.reference,
        paymentType: normalized.paymentType || undefined,
        last4: normalized.last4 || undefined,
        brand: normalized.brand || undefined,
      },
    });

    // Optional: create the next upcoming invoice immediately
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
          dueDate: paidAt,
          amountCents: invoice.amountCents,
          amountPaidCents: 0,
        },
      });
    }

    return {
      alreadyProcessed: false,
      playerProfileId: invoice.playerProfileId,
    };
  });
}

async function applyFailedPayment(normalized: NormalizedWebhook) {
  const invoice = await prisma.playerInvoice.findFirst({
    where: { externalId: normalized.reference },
    include: { playerProfile: true },
  });

  if (!invoice) {
    return;
  }

  // Leave invoice open; mark profile billing as not active
  await prisma.playerProfile.update({
    where: { id: invoice.playerProfileId },
    data: {
      hasActivePlayerBilling: false,
      playerBillingStatus: "Past Due",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.VALOR_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Missing VALOR_WEBHOOK_SECRET." },
        { status: 500 }
      );
    }

    const rawBody = await req.text();

    let payload: any;
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const signature = req.headers.get("Valor-Signature") || "";
    const timestamp = req.headers.get("Valor-Timestamp") || "";

    if (!signature || !timestamp) {
      return NextResponse.json(
        { error: "Missing Valor authentication headers." },
        { status: 401 }
      );
    }

    const valid = verifyValorSignature({
      rawBody,
      timestamp,
      signature,
      secret: webhookSecret,
    });

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 401 }
      );
    }

    const normalized = normalizeValorWebhook(payload);

    if (!normalized.reference) {
      return NextResponse.json(
        { error: "Missing transaction reference." },
        { status: 400 }
      );
    }

    if (normalized.approved) {
      const result = await applySuccessfulPayment(normalized);

      return NextResponse.json({
        ok: true,
        received: true,
        approved: true,
        alreadyProcessed: result.alreadyProcessed,
        reference: normalized.reference,
        transactionId: normalized.transactionId,
      });
    }

    await applyFailedPayment(normalized);

    return NextResponse.json({
      ok: true,
      received: true,
      approved: false,
      reference: normalized.reference,
      transactionId: normalized.transactionId,
    });
  } catch (error) {
    console.error("VALOR_WEBHOOK_ERROR", error);

    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 }
    );
  }
}