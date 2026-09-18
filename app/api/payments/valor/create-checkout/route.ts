// app/api/payments/valor/create-checkout/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, InvoiceStatus, Plan } from "@prisma/client";
import { createPaymentCheckout } from "@/lib/payments/createCheckout";

import {
  PaymentMethod,
  PaymentMethodKind,
} from "@/lib/payments/types";

import { centsToDecimalString } from "@/lib/billing/money";

import {
  PLAYER_BILLING_CADENCE,
  PLAYER_BILLING_STATUS,
} from "@/lib/billing/constants";

const prisma = new PrismaClient();

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.myscoutline.com"
  ).replace(/\/$/, "");
}

function normalizePlan(value: string): Plan {
  const v = value.trim().toUpperCase();
  if (v === "WALK_ON") return Plan.WALK_ON;
  if (v === "ALL_AMERICAN") return Plan.ALL_AMERICAN;
  throw new Error("Invalid plan");
}

function normalizePaymentMethod(
  value: unknown
): PaymentMethodKind {
  if (value === PaymentMethod.CARD) {
    return PaymentMethod.CARD;
  }

  if (value === PaymentMethod.ACH) {
    return PaymentMethod.ACH;
  }

  throw new Error("Invalid payment method");
}

function normalizeCadence(
  value: unknown
) {
  // Annual is intentionally disabled for underwriting.
  if (
    value ===
    PLAYER_BILLING_CADENCE.MONTHLY
  ) {
    return PLAYER_BILLING_CADENCE.MONTHLY;
  }

  throw new Error("Invalid cadence");
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export async function POST(req: NextRequest) {
  try {
    const {
      plan,
      cadence: rawCadence,
      discountCode,
      playerProfileId,
      paymentMethod,
    } = await req.json();

const cadence = normalizeCadence(rawCadence);
const normalizedPlan = normalizePlan(plan);
const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

    if (!playerProfileId || typeof playerProfileId !== "string") {
      return NextResponse.json(
        { error: "Missing playerProfileId." },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl();

    const profile = await prisma.playerProfile.findUnique({
      where: { id: playerProfileId },
      include: { user: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Player profile not found." },
        { status: 404 }
      );
    }

    const summaryRes = await fetch(
      `${baseUrl}/api/player/billing/activation-summary`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          cadence,
          discountCode,
          paymentMethod: normalizedPaymentMethod,
        }),
        cache: "no-store",
      }
    );

    const summary = await summaryRes.json();

    if (!summaryRes.ok || !summary?.finalPrice) {
      return NextResponse.json(
        { error: "Failed to calculate pricing." },
        { status: 400 }
      );
    }

if (summary.finalPrice <= 0) {
  return NextResponse.json(
    { error: "Free flow — skip checkout." },
    { status: 400 }
  );
}

const reference = `sc_${Date.now()}`;

const now = new Date();
const periodEnd = addMonths(now, 1);

    const successUrl =
      `${baseUrl}/api/payments/valor/return?success=1` +
      `&ref=${encodeURIComponent(reference)}` +
      `&plan=${encodeURIComponent(plan)}` +
      `&cadence=${encodeURIComponent(cadence)}`;

    const failureUrl =
      `${baseUrl}/api/payments/valor/return?failure=1` +
      `&ref=${encodeURIComponent(reference)}` +
      `&plan=${encodeURIComponent(plan)}` +
      `&cadence=${encodeURIComponent(cadence)}`;

    const redirectUrl =
      `${baseUrl}/api/payments/valor/return` +
      `?ref=${encodeURIComponent(reference)}` +
      `&plan=${encodeURIComponent(plan)}` +
      `&cadence=${encodeURIComponent(cadence)}`;

const checkoutResult = await createPaymentCheckout({
  paymentMethod: normalizedPaymentMethod,

  reference,

// Valor expects the base transaction amount and added card fee
// as separate values. Do not include the surcharge in amountCents.
amountCents: summary.discountedPrice,
surchargeCents: summary.surchargeAmount,

  description: `ScoutLine ${plan} ${cadence}`,
  customerName: profile.user?.name || "ScoutLine Player",
  customerEmail: profile.email,

  redirectUrl,
  successUrl,
  failureUrl,
});

if (!checkoutResult.ok || !checkoutResult.checkoutUrl) {
  return NextResponse.json(
    {
      error:
        checkoutResult.error ||
        "Failed to create payment checkout.",
      code:
        checkoutResult.code ||
        "CHECKOUT_CREATION_FAILED",
      provider: checkoutResult.provider,
    },
    {
      status:
        checkoutResult.code === "ACH_NOT_CONFIGURED"
          ? 503
          : 500,
    }
  );
}

const checkoutUrl = checkoutResult.checkoutUrl;

const invoice = await prisma.playerInvoice.create({
  data: {
    playerProfileId: profile.id,
    status: InvoiceStatus.OPEN,
    cadence,
    periodStart: now,
    periodEnd,
    invoiceDate: now,
    dueDate: now,
    amountCents: summary.discountedPrice,
    cardFeeCents: summary.surchargeAmount,
    amountPaidCents: 0,
    externalId: reference,
  },
});

    await prisma.playerProfile.update({
      where: { id: profile.id },
      data: {
        hasActivePlayerBilling: false,
        playerBillingStatus:
          PLAYER_BILLING_STATUS.PENDING,
        playerBillingCadence: cadence,
        playerPlanTier: normalizedPlan,
      },
    });

await prisma.playerInvoice.update({
  where: { id: invoice.id },
  data: {
    hostedUrl: checkoutUrl,
  },
});

return NextResponse.json({
  ok: true,
  checkoutUrl,
  reference,
  provider: checkoutResult.provider,
  paymentMethod: normalizedPaymentMethod,

  subtotal: centsToDecimalString(summary.discountedPrice),
  surcharge: centsToDecimalString(summary.surchargeAmount),
  amount: centsToDecimalString(summary.finalPrice),
});
  } catch (err) {
    console.error("VALOR_CHECKOUT_ERROR", err);

    return NextResponse.json(
      { error: "Failed to create checkout." },
      { status: 500 }
    );
  }
}